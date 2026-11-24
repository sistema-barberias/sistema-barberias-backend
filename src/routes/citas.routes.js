import express from 'express';
import pool from '../config/database.js';
import {
  verificarToken,
  soloCliente
} from '../middlewares/auth.middleware.js';

const router = express.Router();

// Las citas las reserva y gestiona el propio cliente (HU-11 y HU-12).
// Cada cliente solo ve y modifica sus citas: todas las consultas filtran por req.usuario.
router.use(verificarToken, soloCliente);

// Cada cuántos minutos se ofrece una hora de inicio dentro del horario del barbero
const INTERVALO_TURNOS = 30;

const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const REGEX_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

const idValido = (id) => /^\d+$/.test(String(id)) && Number(id) > 0;

// "09:30" -> 570 minutos desde la medianoche, y al revés
const aMinutos = (hora) => {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
};
const aHora = (minutos) =>
  `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;

// Comprueba que la fecha exista de verdad (por ejemplo, rechaza 2026-02-30)
const fechaValida = (fecha) => {
  if (!REGEX_FECHA.test(String(fecha))) return false;
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const d = new Date(anio, mes - 1, dia);   // Si el día no existe, JavaScript lo pasa al mes siguiente
  return d.getFullYear() === anio && d.getMonth() === mes - 1 && d.getDate() === dia;
};

// Día de la semana como lo guarda la tabla horarios: 1 = lunes ... 7 = domingo
const diaSemana = (fecha) => new Date(`${fecha}T00:00`).getDay() || 7;

// ¿Ya pasó esa fecha y hora? Se usa la hora local del servidor
const yaPaso = (fecha, hora) => new Date(`${fecha}T${hora}`) <= new Date();

// Columnas de una cita con los nombres del barbero y del servicio
const SELECT_CITA = `
  SELECT c.id_cita, c.id_barbero, b.nombre AS barbero,
         c.id_servicio, s.nombre AS servicio, s.precio, s.duracion,
         to_char(c.fecha, 'YYYY-MM-DD') AS fecha,
         to_char(c.hora_inicio, 'HH24:MI') AS hora_inicio,
         to_char(c.hora_fin, 'HH24:MI') AS hora_fin,
         c.estado
  FROM citas c
  JOIN usuarios b ON b.id_usuario = c.id_barbero
  JOIN servicios s ON s.id_servicio = c.id_servicio`;

// Agrega a la cita si el cliente todavía puede modificarla o cancelarla
const conPermisos = (cita) => ({
  ...cita,
  puede_modificar: cita.estado === 'Reservada' && !yaPaso(cita.fecha, cita.hora_inicio)
});

const buscarCita = async (idCita, idCliente) => {
  const resultado = await pool.query(
    `${SELECT_CITA} WHERE c.id_cita = $1 AND c.id_cliente = $2`,
    [Number(idCita), idCliente]
  );

  return resultado.rows[0] ? conPermisos(resultado.rows[0]) : null;
};

// Servicio activo (con su duración) o null
const buscarServicioActivo = async (idServicio) => {
  const resultado = await pool.query(
    `SELECT id_servicio, nombre, duracion FROM servicios
     WHERE id_servicio = $1 AND estado = 'Activo'`,
    [Number(idServicio)]
  );

  return resultado.rows[0] || null;
};

// Horas de inicio libres para un barbero, una fecha y una duración.
// Una hora es libre si la cita completa cabe en un horario del barbero ese día,
// no se cruza con otra cita del barbero ni del cliente, y todavía no ha pasado.
const calcularTurnos = async ({ idBarbero, fecha, duracion, idCliente, idCitaExcluida }) => {
  const horarios = await pool.query(
    `SELECT to_char(h.hora_inicio, 'HH24:MI') AS hora_inicio,
            to_char(h.hora_fin, 'HH24:MI') AS hora_fin
     FROM horarios h
     JOIN usuarios u ON u.id_usuario = h.id_barbero
     WHERE h.id_barbero = $1 AND h.dia_semana = $2
       AND u.rol = 'Barbero' AND u.estado = 'Activo'
     ORDER BY h.hora_inicio`,
    [idBarbero, diaSemana(fecha)]
  );

  // Citas que ocupan tiempo ese día: las del barbero y las del propio cliente.
  // Al modificar una cita, esa misma no cuenta como ocupada.
  const ocupadas = await pool.query(
    `SELECT to_char(hora_inicio, 'HH24:MI') AS hora_inicio,
            to_char(hora_fin, 'HH24:MI') AS hora_fin
     FROM citas
     WHERE fecha = $1::date
       AND estado = 'Reservada'
       AND (id_barbero = $2 OR id_cliente = $3)
       AND (id_cita IS DISTINCT FROM $4::int4 OR id_cliente <> $3)`,
    [fecha, idBarbero, idCliente, idCitaExcluida]
  );

  const turnos = [];

  for (const horario of horarios.rows) {
    const finHorario = aMinutos(horario.hora_fin);

    for (let inicio = aMinutos(horario.hora_inicio); inicio + duracion <= finHorario; inicio += INTERVALO_TURNOS) {
      const fin = inicio + duracion;
      const cruzada = ocupadas.rows.some(
        (cita) => inicio < aMinutos(cita.hora_fin) && aMinutos(cita.hora_inicio) < fin
      );

      if (!cruzada && !yaPaso(fecha, aHora(inicio))) {
        turnos.push(aHora(inicio));
      }
    }
  }

  return turnos;
};

// Revisa los datos de una reserva (se usa al reservar y al modificar).
// Devuelve { problema: { codigo, mensaje } } o { valores } listos para guardar.
const prepararReserva = async ({ id_barbero, id_servicio, fecha, hora_inicio }) => {
  if (!idValido(id_servicio)) {
    return { problema: { codigo: 400, mensaje: 'Debes seleccionar un servicio' } };
  }

  if (!idValido(id_barbero)) {
    return { problema: { codigo: 400, mensaje: 'Debes seleccionar un barbero' } };
  }

  if (!fechaValida(fecha)) {
    return { problema: { codigo: 400, mensaje: 'La fecha no es válida (formato AAAA-MM-DD)' } };
  }

  if (!REGEX_HORA.test(String(hora_inicio))) {
    return { problema: { codigo: 400, mensaje: 'Debes seleccionar una hora (formato HH:MM)' } };
  }

  if (yaPaso(fecha, hora_inicio)) {
    return { problema: { codigo: 400, mensaje: 'La cita debe ser en una fecha y hora futuras' } };
  }

  const servicio = await buscarServicioActivo(id_servicio);

  if (!servicio) {
    return { problema: { codigo: 400, mensaje: 'El servicio no existe o no está disponible' } };
  }

  const barbero = await pool.query(
    `SELECT 1 FROM usuarios
     WHERE id_usuario = $1 AND rol = 'Barbero' AND estado = 'Activo'`,
    [Number(id_barbero)]
  );

  if (barbero.rows.length === 0) {
    return { problema: { codigo: 400, mensaje: 'El barbero no existe o no está disponible' } };
  }

  const fin = aMinutos(hora_inicio) + servicio.duracion;

  if (fin > 24 * 60) {
    return { problema: { codigo: 400, mensaje: 'La cita debe terminar el mismo día' } };
  }

  const horaFin = aHora(fin);

  // HU-11: la cita completa debe caber dentro de un horario del barbero (HU-09)
  const dentroDeHorario = await pool.query(
    `SELECT 1 FROM horarios
     WHERE id_barbero = $1 AND dia_semana = $2
       AND hora_inicio <= $3::time AND hora_fin >= $4::time`,
    [Number(id_barbero), diaSemana(fecha), hora_inicio, horaFin]
  );

  if (dentroDeHorario.rows.length === 0) {
    return {
      problema: {
        codigo: 400,
        mensaje: 'El barbero no atiende en ese horario. Elige una de las horas disponibles'
      }
    };
  }

  return {
    valores: [Number(id_barbero), Number(id_servicio), fecha, hora_inicio, horaFin]
  };
};

// Traduce los errores de la base de datos a un mensaje claro.
// Devuelve { codigo, mensaje }, o null si el error es otro (se trata como error interno).
const errorDeBaseDeDatos = (error) => {
  // 42P01 = la tabla citas todavía no se ha creado en la base de datos
  if (error.code === '42P01') {
    return {
      codigo: 503,
      mensaje: 'Las citas aún no están habilitadas: falta crear la tabla "citas" (database/citas.sql)'
    };
  }

  // 23P01 = una restricción de no superposición rechazó la cita
  if (error.code === '23P01') {
    return error.constraint === 'cita_cliente_sin_superposicion'
      ? { codigo: 409, mensaje: 'Ya tienes otra cita que se cruza con ese horario' }
      : { codigo: 409, mensaje: 'El barbero ya tiene una cita en ese horario. Elige otra hora' };
  }

  // 23514 = no cumple una regla de la tabla
  if (error.code === '23514') {
    return { codigo: 400, mensaje: 'La cita no cumple las reglas: revisa la fecha y la hora' };
  }

  // 23503 = el barbero o el servicio no existe
  if (error.code === '23503') {
    return { codigo: 400, mensaje: 'El barbero o el servicio seleccionado no existe' };
  }

  return null;
};

// Responde un error: traducido si se conoce, o error interno
const responderError = (res, error, accion) => {
  const traducido = errorDeBaseDeDatos(error);

  if (traducido) {
    return res.status(traducido.codigo).json({
      mensaje: traducido.mensaje
    });
  }

  console.error(`Error ${accion}:`, error);

  return res.status(500).json({
    mensaje: 'Error interno del servidor'
  });
};


// =====================================================
// MIS CITAS (HU-12)
// Próximas primero (de la más cercana a la más lejana), después las pasadas y canceladas
// =====================================================

router.get('/', async (req, res) => {
  try {
    const resultado = await pool.query(
      `${SELECT_CITA}
       WHERE c.id_cliente = $1
       ORDER BY c.fecha DESC, c.hora_inicio DESC`,
      [req.usuario.id_usuario]
    );

    const citas = resultado.rows.map(conPermisos);
    const proximas = citas.filter((cita) => cita.puede_modificar).reverse();
    const anteriores = citas.filter((cita) => !cita.puede_modificar);

    return res.status(200).json({
      citas: [...proximas, ...anteriores]
    });

  } catch (error) {
    return responderError(res, error, 'consultando citas');
  }
});


// =====================================================
// SERVICIOS QUE SE PUEDEN RESERVAR
// =====================================================

router.get('/servicios', async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT id_servicio, nombre, descripcion, precio, duracion
       FROM servicios
       WHERE estado = 'Activo'
       ORDER BY nombre`
    );

    return res.status(200).json({
      servicios: resultado.rows
    });

  } catch (error) {
    return responderError(res, error, 'consultando servicios para citas');
  }
});


// =====================================================
// HORAS DISPONIBLES (HU-11)
// ?id_barbero=&id_servicio=&fecha=AAAA-MM-DD
// &excluir_cita= (opcional, al modificar: esa cita no cuenta como ocupada)
// =====================================================

router.get('/turnos', async (req, res) => {
  try {
    const {
      id_barbero,
      id_servicio,
      fecha,
      excluir_cita = null
    } = req.query;

    if (!idValido(id_barbero) || !idValido(id_servicio)) {
      return res.status(400).json({
        mensaje: 'Debes indicar el barbero y el servicio'
      });
    }

    if (!fechaValida(fecha)) {
      return res.status(400).json({
        mensaje: 'La fecha no es válida (formato AAAA-MM-DD)'
      });
    }

    if (excluir_cita !== null && !idValido(excluir_cita)) {
      return res.status(400).json({
        mensaje: 'El identificador de la cita no es válido'
      });
    }

    const servicio = await buscarServicioActivo(id_servicio);

    if (!servicio) {
      return res.status(400).json({
        mensaje: 'El servicio no existe o no está disponible'
      });
    }

    const turnos = await calcularTurnos({
      idBarbero: Number(id_barbero),
      fecha,
      duracion: servicio.duracion,
      idCliente: req.usuario.id_usuario,
      idCitaExcluida: excluir_cita === null ? null : Number(excluir_cita)
    });

    return res.status(200).json({
      turnos,
      duracion: servicio.duracion
    });

  } catch (error) {
    return responderError(res, error, 'consultando horas disponibles');
  }
});


// =====================================================
// RESERVAR CITA (HU-11)
// =====================================================

router.post('/', async (req, res) => {
  try {
    const { problema, valores } = await prepararReserva(req.body);

    if (problema) {
      return res.status(problema.codigo).json({
        mensaje: problema.mensaje
      });
    }

    const resultado = await pool.query(
      `INSERT INTO citas (id_cliente, id_barbero, id_servicio, fecha, hora_inicio, hora_fin)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id_cita`,
      [req.usuario.id_usuario, ...valores]
    );

    return res.status(201).json({
      mensaje: 'Cita reservada correctamente',
      cita: await buscarCita(resultado.rows[0].id_cita, req.usuario.id_usuario)
    });

  } catch (error) {
    return responderError(res, error, 'reservando cita');
  }
});


// =====================================================
// MODIFICAR CITA (HU-12)
// Cambia servicio, barbero, fecha u hora con las mismas reglas de la reserva
// =====================================================

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!idValido(id)) {
      return res.status(400).json({
        mensaje: 'El identificador de la cita no es válido'
      });
    }

    const cita = await buscarCita(id, req.usuario.id_usuario);

    if (!cita) {
      return res.status(404).json({
        mensaje: 'La cita no existe'
      });
    }

    if (!cita.puede_modificar) {
      return res.status(400).json({
        mensaje: cita.estado === 'Cancelada'
          ? 'La cita está cancelada: reserva una nueva'
          : 'No puedes modificar una cita que ya pasó'
      });
    }

    const { problema, valores } = await prepararReserva(req.body);

    if (problema) {
      return res.status(problema.codigo).json({
        mensaje: problema.mensaje
      });
    }

    await pool.query(
      `UPDATE citas
       SET id_barbero = $1,
           id_servicio = $2,
           fecha = $3,
           hora_inicio = $4,
           hora_fin = $5
       WHERE id_cita = $6 AND id_cliente = $7`,
      [...valores, Number(id), req.usuario.id_usuario]
    );

    return res.status(200).json({
      mensaje: 'Cita modificada correctamente',
      cita: await buscarCita(id, req.usuario.id_usuario)
    });

  } catch (error) {
    return responderError(res, error, 'modificando cita');
  }
});


// =====================================================
// CANCELAR CITA (HU-12)
// No se borra: queda como "Cancelada" y la hora vuelve a estar libre
// =====================================================

router.patch('/:id/cancelar', async (req, res) => {
  try {
    const { id } = req.params;

    if (!idValido(id)) {
      return res.status(400).json({
        mensaje: 'El identificador de la cita no es válido'
      });
    }

    const cita = await buscarCita(id, req.usuario.id_usuario);

    if (!cita) {
      return res.status(404).json({
        mensaje: 'La cita no existe'
      });
    }

    if (!cita.puede_modificar) {
      return res.status(400).json({
        mensaje: cita.estado === 'Cancelada'
          ? 'La cita ya estaba cancelada'
          : 'No puedes cancelar una cita que ya pasó'
      });
    }

    await pool.query(
      `UPDATE citas SET estado = 'Cancelada'
       WHERE id_cita = $1 AND id_cliente = $2`,
      [Number(id), req.usuario.id_usuario]
    );

    return res.status(200).json({
      mensaje: 'Cita cancelada correctamente',
      cita: await buscarCita(id, req.usuario.id_usuario)
    });

  } catch (error) {
    return responderError(res, error, 'cancelando cita');
  }
});

export default router;

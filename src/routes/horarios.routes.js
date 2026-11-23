import express from 'express';
import pool from '../config/database.js';
import {
  verificarToken,
  soloAdministrador
} from '../middlewares/auth.middleware.js';

const router = express.Router();

// Todas las rutas de horarios son solo para administradores (HU-09)
router.use(verificarToken, soloAdministrador);

// Hora en formato HH:MM (la que entrega el campo de hora del navegador); acepta también HH:MM:SS
const REGEX_HORA = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const idValido = (id) => /^\d+$/.test(String(id)) && Number(id) > 0;

// Columnas que se devuelven. to_char entrega la hora como "09:00" (sin los segundos)
const COLUMNAS = `id_horario, id_barbero, dia_semana,
  to_char(hora_inicio, 'HH24:MI') AS hora_inicio,
  to_char(hora_fin, 'HH24:MI') AS hora_fin`;

// Revisa los datos de un horario (se usa al asignar y al modificar).
// Devuelve el texto del problema, o null si todo está bien.
const validarHorario = ({ id_barbero, dia_semana, hora_inicio, hora_fin }) => {
  if (!idValido(id_barbero)) {
    return 'Debes seleccionar un barbero';
  }

  const dia = Number(dia_semana);
  if (!Number.isInteger(dia) || dia < 1 || dia > 7) {
    return 'El día debe ser un número de 1 (lunes) a 7 (domingo)';
  }

  if (!REGEX_HORA.test(String(hora_inicio)) || !REGEX_HORA.test(String(hora_fin))) {
    return 'La hora de inicio y la de fin son obligatorias (formato HH:MM)';
  }

  // Como las horas tienen el mismo formato, comparar el texto equivale a comparar la hora
  if (String(hora_fin).slice(0, 5) <= String(hora_inicio).slice(0, 5)) {
    return 'La hora de fin debe ser posterior a la hora de inicio';
  }

  return null;
};

// Comprueba que el usuario exista, sea Barbero y esté Activo.
// Devuelve { codigo, mensaje } si hay un problema, o null si todo está bien.
const problemaConBarbero = async (idBarbero) => {
  const resultado = await pool.query(
    'SELECT rol, estado FROM usuarios WHERE id_usuario = $1',
    [Number(idBarbero)]
  );

  if (resultado.rows.length === 0) {
    return { codigo: 404, mensaje: 'El barbero no existe' };
  }

  const { rol, estado } = resultado.rows[0];

  if (rol !== 'Barbero') {
    return { codigo: 400, mensaje: 'El usuario seleccionado no es un barbero' };
  }

  if (estado !== 'Activo') {
    return { codigo: 400, mensaje: 'El barbero seleccionado está Inactivo' };
  }

  return null;
};

// Traduce los errores de la base de datos a un mensaje claro.
// Devuelve { codigo, mensaje }, o null si el error es otro (se trata como error interno).
const errorDeBaseDeDatos = (error) => {
  // 23P01 = la restricción de no superposición rechazó el horario
  if (error.code === '23P01') {
    return {
      codigo: 409,
      mensaje: 'El barbero ya tiene un horario que se cruza con ese en el mismo día'
    };
  }

  // 23514 = no cumple una regla de la tabla (por ejemplo, la hora de fin)
  if (error.code === '23514') {
    return { codigo: 400, mensaje: 'El horario no cumple las reglas: revisa el día y las horas' };
  }

  // 23503 = el barbero no existe
  if (error.code === '23503') {
    return { codigo: 400, mensaje: 'El barbero seleccionado no existe' };
  }

  return null;
};

// Consultar horarios (opcional: ?id_barbero=3 para ver solo los de un barbero)
router.get('/', async (req, res) => {
  try {
    const { id_barbero = null } = req.query;

    if (id_barbero !== null && !idValido(id_barbero)) {
      return res.status(400).json({
        mensaje: 'El identificador del barbero no es válido'
      });
    }

    const resultado = await pool.query(
      `SELECT h.id_horario, h.id_barbero, u.nombre AS barbero, h.dia_semana,
              to_char(h.hora_inicio, 'HH24:MI') AS hora_inicio,
              to_char(h.hora_fin, 'HH24:MI') AS hora_fin
       FROM horarios h
       JOIN usuarios u ON u.id_usuario = h.id_barbero
       WHERE ($1::int4 IS NULL OR h.id_barbero = $1)
       ORDER BY u.nombre, h.dia_semana, h.hora_inicio`,
      [id_barbero]
    );

    return res.status(200).json({
      horarios: resultado.rows
    });

  } catch (error) {
    console.error('Error consultando horarios:', error);

    return res.status(500).json({
      mensaje: 'Error interno del servidor'
    });
  }
});

// Asignar un horario a un barbero (HU-09)
router.post('/', async (req, res) => {
  try {
    const error = validarHorario(req.body);

    if (error) {
      return res.status(400).json({
        mensaje: error
      });
    }

    const problema = await problemaConBarbero(req.body.id_barbero);

    if (problema) {
      return res.status(problema.codigo).json({
        mensaje: problema.mensaje
      });
    }

    const { id_barbero, dia_semana, hora_inicio, hora_fin } = req.body;

    const resultado = await pool.query(
      `INSERT INTO horarios (id_barbero, dia_semana, hora_inicio, hora_fin)
       VALUES ($1, $2, $3, $4)
       RETURNING ${COLUMNAS}`,
      [Number(id_barbero), Number(dia_semana), hora_inicio, hora_fin]
    );

    return res.status(201).json({
      mensaje: 'Horario asignado correctamente',
      horario: resultado.rows[0]
    });

  } catch (error) {
    const traducido = errorDeBaseDeDatos(error);

    if (traducido) {
      return res.status(traducido.codigo).json({
        mensaje: traducido.mensaje
      });
    }

    console.error('Error asignando horario:', error);

    return res.status(500).json({
      mensaje: 'Error interno del servidor'
    });
  }
});

// Modificar un horario
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!idValido(id)) {
      return res.status(400).json({
        mensaje: 'El identificador del horario no es válido'
      });
    }

    const error = validarHorario(req.body);

    if (error) {
      return res.status(400).json({
        mensaje: error
      });
    }

    const problema = await problemaConBarbero(req.body.id_barbero);

    if (problema) {
      return res.status(problema.codigo).json({
        mensaje: problema.mensaje
      });
    }

    const { id_barbero, dia_semana, hora_inicio, hora_fin } = req.body;

    const resultado = await pool.query(
      `UPDATE horarios
       SET id_barbero = $1,
           dia_semana = $2,
           hora_inicio = $3,
           hora_fin = $4
       WHERE id_horario = $5
       RETURNING ${COLUMNAS}`,
      [Number(id_barbero), Number(dia_semana), hora_inicio, hora_fin, Number(id)]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: 'El horario no existe'
      });
    }

    return res.status(200).json({
      mensaje: 'Horario actualizado correctamente',
      horario: resultado.rows[0]
    });

  } catch (error) {
    const traducido = errorDeBaseDeDatos(error);

    if (traducido) {
      return res.status(traducido.codigo).json({
        mensaje: traducido.mensaje
      });
    }

    console.error('Error actualizando horario:', error);

    return res.status(500).json({
      mensaje: 'Error interno del servidor'
    });
  }
});

// Eliminar un horario
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!idValido(id)) {
      return res.status(400).json({
        mensaje: 'El identificador del horario no es válido'
      });
    }

    const resultado = await pool.query(
      `DELETE FROM horarios
       WHERE id_horario = $1
       RETURNING id_horario`,
      [Number(id)]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: 'El horario no existe'
      });
    }

    return res.status(200).json({
      mensaje: 'Horario eliminado correctamente'
    });

  } catch (error) {
    console.error('Error eliminando horario:', error);

    return res.status(500).json({
      mensaje: 'Error interno del servidor'
    });
  }
});

export default router;
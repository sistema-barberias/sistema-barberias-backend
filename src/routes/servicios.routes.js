import express from 'express';
import pool from '../config/database.js';
import {
  verificarToken,
  soloAdministrador
} from '../middlewares/auth.middleware.js';

const router = express.Router();

// Todas las rutas de servicios son solo para administradores
router.use(verificarToken, soloAdministrador);

const idValido = (id) => /^\d+$/.test(String(id)) && Number(id) > 0;

// Number('') y Number(null) dan 0, y Number(undefined) da NaN: los tres quedan rechazados
const esNumeroPositivo = (valor) =>
  Number.isFinite(Number(valor)) && Number(valor) > 0;

// Revisa los datos de un servicio (se usa al registrar y al modificar).
// Devuelve el texto del problema, o null si todo está bien.
const validarServicio = ({ nombre, precio, duracion }) => {
  if (typeof nombre !== 'string' || !nombre.trim()) {
    return 'El nombre del servicio es obligatorio';
  }

  // HU-07: ningún servicio puede quedar sin precio
  if (!esNumeroPositivo(precio)) {
    return 'El precio es obligatorio y debe ser mayor que cero';
  }

  if (!esNumeroPositivo(duracion) || !Number.isInteger(Number(duracion))) {
    return 'La duración debe ser un número entero mayor que cero';
  }

  return null;
};

// Valores en el orden de las columnas: nombre, descripcion, precio, duracion
const valoresServicio = ({ nombre, descripcion, precio, duracion }) => [
  nombre.trim(),
  typeof descripcion === 'string' && descripcion.trim() ? descripcion.trim() : null,
  Number(precio),
  Number(duracion)
];

// Consultar todos los servicios
router.get('/', async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT id_servicio, nombre, descripcion, precio, duracion, estado
       FROM servicios
       ORDER BY id_servicio DESC`
    );

    return res.status(200).json({
      servicios: resultado.rows
    });

  } catch (error) {
    console.error('Error consultando servicios:', error);

    return res.status(500).json({
      mensaje: 'Error interno del servidor'
    });
  }
});

// Registrar un servicio (HU-05)
router.post('/', async (req, res) => {
  try {
    const error = validarServicio(req.body);

    if (error) {
      return res.status(400).json({
        mensaje: error
      });
    }

    const resultado = await pool.query(
      `INSERT INTO servicios
        (nombre, descripcion, precio, duracion)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      valoresServicio(req.body)
    );

    return res.status(201).json({
      mensaje: 'Servicio registrado correctamente',
      servicio: resultado.rows[0]
    });

  } catch (error) {
    console.error('Error registrando servicio:', error);

    return res.status(500).json({
      mensaje: 'Error interno del servidor'
    });
  }
});

// Modificar un servicio (HU-06)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!idValido(id)) {
      return res.status(400).json({
        mensaje: 'El identificador del servicio no es válido'
      });
    }

    const error = validarServicio(req.body);

    if (error) {
      return res.status(400).json({
        mensaje: error
      });
    }

    const resultado = await pool.query(
      `UPDATE servicios
       SET nombre = $1,
           descripcion = $2,
           precio = $3,
           duracion = $4
       WHERE id_servicio = $5
       RETURNING *`,
      [...valoresServicio(req.body), Number(id)]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: 'El servicio no existe'
      });
    }

    return res.status(200).json({
      mensaje: 'Servicio actualizado correctamente',
      servicio: resultado.rows[0]
    });

  } catch (error) {
    console.error('Error actualizando servicio:', error);

    return res.status(500).json({
      mensaje: 'Error interno del servidor'
    });
  }
});


// Eliminar definitivamente un servicio (HU-06)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!idValido(id)) {
      return res.status(400).json({
        mensaje: 'El identificador del servicio no es válido'
      });
    }

    const resultado = await pool.query(
      `DELETE FROM servicios
       WHERE id_servicio = $1
       RETURNING id_servicio`,
      [Number(id)]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: 'El servicio no existe'
      });
    }

    return res.status(200).json({
      mensaje: 'Servicio eliminado definitivamente'
    });

  } catch (error) {
    // 23503 = violación de llave foránea (ej. el servicio tiene citas)
    if (error.code === '23503') {
      return res.status(409).json({
        mensaje: 'No se puede eliminar este servicio porque está relacionado con otros registros.'
      });
    }

    console.error('Error eliminando servicio:', error);

    return res.status(500).json({
      mensaje: 'Error interno del servidor'
    });
  }
});

export default router;

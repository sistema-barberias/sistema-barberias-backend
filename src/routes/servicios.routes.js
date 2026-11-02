import express from 'express';
import pool from '../config/database.js';
import {
  verificarToken,
  soloAdministrador
} from '../middlewares/auth.middleware.js';

const router = express.Router();

// Consultar todos los servicios (solo administradores)
router.get('/', verificarToken, soloAdministrador, async (req, res) => {
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

// Registrar un servicio (solo administradores)
router.post('/', verificarToken, soloAdministrador, async (req, res) => {
  try {
    const { nombre, descripcion, precio, duracion } = req.body;

    // Validar nombre
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({
        mensaje: 'El nombre del servicio es obligatorio'
      });
    }

    // Validar precio
    if (
      precio === undefined ||
      precio === null ||
      precio === '' ||
      !Number.isFinite(Number(precio)) ||
      Number(precio) <= 0
    ) {
      return res.status(400).json({
        mensaje: 'El precio es obligatorio y debe ser mayor que cero'
      });
    }

    // Validar duración
    if (
      duracion === undefined ||
      duracion === null ||
      duracion === '' ||
      !Number.isInteger(Number(duracion)) ||
      Number(duracion) <= 0
    ) {
      return res.status(400).json({
        mensaje: 'La duración debe ser un número entero mayor que cero'
      });
    }

    // Guardar servicio en Supabase
    const resultado = await pool.query(
      `INSERT INTO servicios
        (nombre, descripcion, precio, duracion)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        nombre.trim(),
        descripcion?.trim() || null,
        Number(precio),
        Number(duracion)
      ]
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

// Modificar un servicio (solo administradores)
router.put('/:id', verificarToken, soloAdministrador, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { nombre, descripcion, precio, duracion } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        mensaje: 'El identificador del servicio no es válido'
      });
    }

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({
        mensaje: 'El nombre del servicio es obligatorio'
      });
    }

    if (
      precio === undefined ||
      precio === null ||
      precio === '' ||
      !Number.isFinite(Number(precio)) ||
      Number(precio) <= 0
    ) {
      return res.status(400).json({
        mensaje: 'El precio debe ser mayor que cero'
      });
    }

    if (
      duracion === undefined ||
      duracion === null ||
      duracion === '' ||
      !Number.isInteger(Number(duracion)) ||
      Number(duracion) <= 0
    ) {
      return res.status(400).json({
        mensaje: 'La duración debe ser un número entero mayor que cero'
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
      [
        nombre.trim(),
        descripcion?.trim() || null,
        Number(precio),
        Number(duracion),
        id
      ]
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


// Eliminar definitivamente un servicio (solo administradores)
router.delete('/:id', verificarToken, soloAdministrador, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        mensaje: 'El identificador del servicio no es válido'
      });
    }

    const resultado = await pool.query(
      `DELETE FROM servicios
       WHERE id_servicio = $1
       RETURNING id_servicio`,
      [id]
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
    console.error('Error eliminando servicio:', error);

    if (error.code === '23503') {
      return res.status(409).json({
        mensaje: 'No se puede eliminar este servicio porque está relacionado con otros registros.'
      });
    }

    return res.status(500).json({
      mensaje: 'Error interno del servidor'
    });
  }
});

export default router;

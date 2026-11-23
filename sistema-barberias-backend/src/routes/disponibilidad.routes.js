
import express from 'express';
import pool from '../config/database.js';
import { verificarToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Los usuarios autenticados pueden consultar la disponibilidad.
// Esta ruta no permite modificar horarios.
router.use(verificarToken);

// Consultar horarios de los barberos (HU-10)
router.get('/', async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT
         h.id_horario,
         h.id_barbero,
         u.nombre AS barbero,
         h.dia_semana,
         to_char(h.hora_inicio, 'HH24:MI') AS hora_inicio,
         to_char(h.hora_fin, 'HH24:MI') AS hora_fin
       FROM horarios h
       JOIN usuarios u ON u.id_usuario = h.id_barbero
       WHERE u.rol = 'Barbero'
         AND u.estado = 'Activo'
       ORDER BY u.nombre, h.dia_semana, h.hora_inicio`
    );

    return res.status(200).json({
      horarios: resultado.rows
    });

  } catch (error) {
    console.error('Error consultando disponibilidad:', error);

    return res.status(500).json({
      mensaje: 'Error interno del servidor'
    });
  }
});

export default router;

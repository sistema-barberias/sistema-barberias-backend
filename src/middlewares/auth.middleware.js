
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

// Verificar que el usuario tenga una sesión válida
export const verificarToken = async (req, res, next) => {
  try {
    const autorizacion = req.headers.authorization;

    // Comprobar que exista el token
    if (!autorizacion || !autorizacion.startsWith('Bearer ')) {
      return res.status(401).json({
        mensaje: 'Debes iniciar sesión para realizar esta acción'
      });
    }

    const token = autorizacion.split(' ')[1];

    // Verificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Consultar el usuario en Supabase
    const resultado = await pool.query(
      `SELECT id_usuario, nombre, correo, rol, estado
       FROM usuarios
       WHERE id_usuario = $1`,
      [decoded.id_usuario]
    );

    // Comprobar que el usuario exista
    if (resultado.rows.length === 0) {
      return res.status(401).json({
        mensaje: 'El usuario ya no existe'
      });
    }

    const usuario = resultado.rows[0];

    // Comprobar que esté activo
    if (usuario.estado !== 'Activo') {
      return res.status(403).json({
        mensaje: 'Tu usuario se encuentra Inactivo'
      });
    }

    // Guardar el usuario para las siguientes validaciones
    req.usuario = usuario;

    next();

  } catch (error) {

    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError'
    ) {
      return res.status(401).json({
        mensaje: 'La sesión no es válida o ha expirado'
      });
    }

    console.error('Error verificando autenticación:', error);

    return res.status(500).json({
      mensaje: 'Error interno del servidor'
    });
  }
};


// Permitir el acceso únicamente a administradores
export const soloAdministrador = (req, res, next) => {

  if (req.usuario?.rol !== 'Administrador') {
    return res.status(403).json({
      mensaje: 'No tienes permisos para realizar esta acción'
    });
  }

  next();
};

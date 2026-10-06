import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../config/database.js';

const router = express.Router();


// =====================================================
// REGISTRAR USUARIO
// =====================================================

router.post('/registro', async (req, res) => {
  try {
    const {
      nombre,
      correo,
      telefono,
      password
    } = req.body;


    // =====================================================
    // VALIDAR CAMPOS OBLIGATORIOS
    // =====================================================

    if (!nombre || !correo || !telefono || !password) {
      return res.status(400).json({
        mensaje: 'Nombre, correo, teléfono y contraseña son obligatorios'
      });
    }


    // =====================================================
    // VALIDAR CORREO
    // Solo permite Gmail o Hotmail
    // =====================================================

    const correoValido = /^[^\s@]+@(gmail|hotmail)\.com$/i;

    if (!correoValido.test(correo)) {
      return res.status(400).json({
        mensaje: 'El correo debe ser de Gmail o Hotmail (@gmail.com o @hotmail.com)'
      });
    }


    // =====================================================
    // VALIDAR TELÉFONO
    // Solo permite números
    // =====================================================

    const telefonoValido = /^\d+$/;

    if (!telefonoValido.test(String(telefono))) {
      return res.status(400).json({
        mensaje: 'El teléfono solo puede contener números'
      });
    }


    // =====================================================
    // VALIDAR CONTRASEÑA
    // Exactamente 6 dígitos numéricos
    // =====================================================

    const passwordValida = /^\d{6}$/;

    if (!passwordValida.test(password)) {
      return res.status(400).json({
        mensaje: 'La contraseña debe tener exactamente 6 dígitos numéricos'
      });
    }


    // =====================================================
    // COMPROBAR SI EL CORREO YA ESTÁ REGISTRADO
    // =====================================================

    const usuarioExistente = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE correo = $1',
      [correo]
    );

    if (usuarioExistente.rows.length > 0) {
      return res.status(400).json({
        mensaje: 'El correo ya está registrado'
      });
    }


    // =====================================================
    // ENCRIPTAR CONTRASEÑA
    // =====================================================

    const passwordHash = await bcrypt.hash(password, 10);


    // =====================================================
    // INSERTAR USUARIO EN LA BASE DE DATOS
    // =====================================================

    const resultado = await pool.query(
      `INSERT INTO usuarios
        (nombre, correo, telefono, password, rol, estado)
       VALUES ($1, $2, $3, $4, 'Cliente', 'Activo')
       RETURNING
        id_usuario,
        nombre,
        correo,
        telefono,
        rol,
        estado`,
      [
        nombre,
        correo,
        telefono,
        passwordHash
      ]
    );


    // =====================================================
    // RESPUESTA EXITOSA
    // =====================================================

    res.status(201).json({
      mensaje: 'Usuario registrado correctamente',
      usuario: resultado.rows[0]
    });

  } catch (error) {

    console.error('Error registrando usuario:', error);

    res.status(500).json({
      mensaje: 'Error interno del servidor'
    });
  }
});


// =====================================================
// INICIAR SESIÓN
// =====================================================

router.post('/login', async (req, res) => {
  try {
    const {
      correo,
      password
    } = req.body;


    // =====================================================
    // VALIDAR CAMPOS
    // =====================================================

    if (!correo || !password) {
      return res.status(400).json({
        mensaje: 'Correo y contraseña son obligatorios'
      });
    }


    // =====================================================
    // BUSCAR USUARIO
    // =====================================================

    const resultado = await pool.query(
      `SELECT
        id_usuario,
        nombre,
        correo,
        telefono,
        password,
        rol,
        estado
       FROM usuarios
       WHERE correo = $1`,
      [correo]
    );


    // =====================================================
    // USUARIO NO ENCONTRADO
    // =====================================================

    if (resultado.rows.length === 0) {
      return res.status(401).json({
        mensaje: 'Las credenciales ingresadas no son correctas'
      });
    }


    const usuario = resultado.rows[0];


    // =====================================================
    // COMPROBAR ESTADO DEL USUARIO
    // =====================================================

    if (usuario.estado === 'Inactivo') {
      return res.status(403).json({
        mensaje: 'Tu usuario se encuentra Inactivo'
      });
    }


    // =====================================================
    // COMPROBAR CONTRASEÑA
    // =====================================================

    const passwordCorrecta = await bcrypt.compare(
      password,
      usuario.password
    );


    if (!passwordCorrecta) {
      return res.status(401).json({
        mensaje: 'Las credenciales ingresadas no son correctas'
      });
    }


    // No enviar la contraseña al frontend
    delete usuario.password;


    // =====================================================
    // RESPUESTA LOGIN
    // =====================================================

    res.json({
      mensaje: 'Inicio de sesión exitoso',
      usuario: usuario
    });

  } catch (error) {

    console.error('Error iniciando sesión:', error);

    res.status(500).json({
      mensaje: 'Error interno del servidor'
    });
  }
});


// =====================================================
// BUSCAR USUARIOS
// =====================================================

router.get('/', async (req, res) => {
  try {
    const {
      criterio = ''
    } = req.query;


    const resultado = await pool.query(
      `SELECT
        id_usuario,
        nombre,
        correo,
        telefono,
        rol,
        estado
       FROM usuarios
       WHERE LOWER(nombre) LIKE LOWER($1)
          OR LOWER(correo) LIKE LOWER($1)
       ORDER BY id_usuario DESC`,
      [`%${criterio}%`]
    );


    res.json(resultado.rows);

  } catch (error) {

    console.error('Error buscando usuarios:', error);

    res.status(500).json({
      mensaje: 'Error interno del servidor'
    });
  }
});


// =====================================================
// ACTUALIZAR USUARIO
// =====================================================

router.put('/:id', async (req, res) => {
  try {
    const {
      id
    } = req.params;


    const {
      nombre,
      telefono
    } = req.body;


    // =====================================================
    // VALIDAR NOMBRE
    // =====================================================

    if (!nombre) {
      return res.status(400).json({
        mensaje: 'El nombre es obligatorio'
      });
    }


    // =====================================================
    // ACTUALIZAR USUARIO
    // =====================================================

    const resultado = await pool.query(
      `UPDATE usuarios
       SET nombre = $1,
           telefono = $2
       WHERE id_usuario = $3
       RETURNING
        id_usuario,
        nombre,
        correo,
        telefono,
        rol,
        estado`,
      [
        nombre,
        telefono,
        id
      ]
    );


    // =====================================================
    // USUARIO NO ENCONTRADO
    // =====================================================

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: 'Usuario no encontrado'
      });
    }


    res.json({
      mensaje: 'Usuario actualizado correctamente',
      usuario: resultado.rows[0]
    });

  } catch (error) {

    console.error('Error actualizando usuario:', error);

    res.status(500).json({
      mensaje: 'Error interno del servidor'
    });
  }
});


// =====================================================
// CAMBIAR ESTADO
// =====================================================

router.patch('/:id/estado', async (req, res) => {
  try {
    const {
      id
    } = req.params;


    const {
      estado
    } = req.body;


    // =====================================================
    // VALIDAR ESTADO
    // =====================================================

    if (!['Activo', 'Inactivo'].includes(estado)) {
      return res.status(400).json({
        mensaje: 'El estado debe ser Activo o Inactivo'
      });
    }


    // =====================================================
    // ACTUALIZAR ESTADO
    // =====================================================

    const resultado = await pool.query(
      `UPDATE usuarios
       SET estado = $1
       WHERE id_usuario = $2
       RETURNING
        id_usuario,
        nombre,
        correo,
        telefono,
        rol,
        estado`,
      [
        estado,
        id
      ]
    );


    // =====================================================
    // USUARIO NO ENCONTRADO
    // =====================================================

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: 'Usuario no encontrado'
      });
    }


    res.json({
      mensaje: 'Estado actualizado correctamente',
      usuario: resultado.rows[0]
    });

  } catch (error) {

    console.error('Error actualizando estado:', error);

    res.status(500).json({
      mensaje: 'Error interno del servidor'
    });
  }
});


export default router;


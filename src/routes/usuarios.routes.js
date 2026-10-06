import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../config/database.js';

const router = express.Router();

const ROLES = ['Cliente', 'Barbero', 'Administrador'];

const idValido = (id) => /^\d+$/.test(String(id));

// Devuelve el texto del problema si el correo o el teléfono ya los usa OTRO usuario
// (idExcluido sirve al editar, para no chocar con el propio usuario). Si están libres, devuelve null.
// Es necesario que el teléfono sea único porque también se usa para iniciar sesión.
const datoRepetido = async ({ correo, telefono }, idExcluido = null) => {
  if (correo) {
    const r = await pool.query(
      'SELECT 1 FROM usuarios WHERE correo = $1 AND id_usuario IS DISTINCT FROM $2',
      [correo, idExcluido]
    );
    if (r.rows.length > 0) return 'El correo ya está registrado';
  }

  if (telefono) {
    const r = await pool.query(
      'SELECT 1 FROM usuarios WHERE telefono::text = $1 AND id_usuario IS DISTINCT FROM $2',
      [String(telefono), idExcluido]
    );
    if (r.rows.length > 0) return 'El teléfono ya está registrado';
  }

  return null;
};


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
    // COMPROBAR SI EL CORREO O EL TELÉFONO YA ESTÁN REGISTRADOS
    // =====================================================

    const repetido = await datoRepetido({ correo, telefono });

    if (repetido) {
      return res.status(400).json({
        mensaje: repetido
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
      telefono,
      password
    } = req.body;


    // =====================================================
    // VALIDAR CAMPOS
    // Se ingresa con correo o con teléfono
    // =====================================================

    if ((!correo && !telefono) || !password) {
      return res.status(400).json({
        mensaje: 'Correo o teléfono y contraseña son obligatorios'
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
       WHERE correo = $1 OR telefono = $2`,
      [correo || null, telefono || null]
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

// Parámetros opcionales:
//   criterio  Texto a buscar en nombre, correo o teléfono
//   rol       Solo devuelve usuarios de ese rol (por ejemplo Cliente)

router.get('/', async (req, res) => {
  try {
    const {
      criterio = '',
      rol = null
    } = req.query;

    if (rol && !ROLES.includes(rol)) {
      return res.status(400).json({
        mensaje: `El rol debe ser uno de: ${ROLES.join(', ')}`
      });
    }


    const resultado = await pool.query(
      `SELECT
        id_usuario,
        nombre,
        correo,
        telefono,
        rol,
        estado
       FROM usuarios
       WHERE ($2::text IS NULL OR rol = $2)
         AND (LOWER(nombre) LIKE LOWER($1)
              OR LOWER(correo) LIKE LOWER($1)
              OR telefono::text LIKE $1)
       ORDER BY id_usuario DESC`,
      [`%${criterio}%`, rol]
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
      telefono,
      correo
    } = req.body;


    // =====================================================
    // VALIDAR DATOS
    // Nombre obligatorio; teléfono y correo son opcionales
    // (si no se envían se conservan los actuales)
    // =====================================================

    if (!idValido(id)) {
      return res.status(400).json({
        mensaje: 'El id del usuario no es válido'
      });
    }

    if (!nombre) {
      return res.status(400).json({
        mensaje: 'El nombre es obligatorio'
      });
    }

    if (telefono && !/^\d+$/.test(String(telefono))) {
      return res.status(400).json({
        mensaje: 'El teléfono solo puede contener números'
      });
    }


    if (correo && !/^[^\s@]+@(gmail|hotmail)\.com$/i.test(correo)) {
      return res.status(400).json({
        mensaje: 'El correo debe ser de Gmail o Hotmail (@gmail.com o @hotmail.com)'
      });
    }


    // =====================================================
    // EL CORREO Y EL TELÉFONO NO PUEDEN ESTAR EN OTRO USUARIO
    // =====================================================

    const repetido = await datoRepetido({ correo, telefono }, Number(id));

    if (repetido) {
      return res.status(400).json({
        mensaje: repetido
      });
    }


    // =====================================================
    // ACTUALIZAR USUARIO
    // Si no se envía teléfono o correo se conserva el actual
    // =====================================================

    const resultado = await pool.query(
      `UPDATE usuarios
       SET nombre = $1,
           telefono = COALESCE($2, telefono),
           correo = COALESCE($3, correo)
       WHERE id_usuario = $4
       RETURNING
        id_usuario,
        nombre,
        correo,
        telefono,
        rol,
        estado`,
      [
        nombre,
        telefono || null,
        correo || null,
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

    if (!idValido(id)) {
      return res.status(400).json({
        mensaje: 'El id del usuario no es válido'
      });
    }

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


// =====================================================
// OBTENER USUARIO POR ID
// =====================================================

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!idValido(id)) {
      return res.status(400).json({
        mensaje: 'El id del usuario no es válido'
      });
    }

    const resultado = await pool.query(
      `SELECT
        id_usuario,
        nombre,
        correo,
        telefono,
        rol,
        estado
       FROM usuarios
       WHERE id_usuario = $1`,
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: 'Usuario no encontrado'
      });
    }

    res.json(resultado.rows[0]);

  } catch (error) {

    console.error('Error obteniendo usuario:', error);

    res.status(500).json({
      mensaje: 'Error interno del servidor'
    });
  }
});


// =====================================================
// CREAR USUARIO (administración)
// Permite definir el rol, a diferencia del registro
// =====================================================

router.post('/', async (req, res) => {
  try {
    const {
      nombre,
      correo,
      telefono,
      password,
      rol = 'Cliente'
    } = req.body;

    if (!nombre || !correo || !telefono || !password) {
      return res.status(400).json({
        mensaje: 'Nombre, correo, teléfono y contraseña son obligatorios'
      });
    }

    if (!/^[^\s@]+@(gmail|hotmail)\.com$/i.test(correo)) {
      return res.status(400).json({
        mensaje: 'El correo debe ser de Gmail o Hotmail (@gmail.com o @hotmail.com)'
      });
    }

    if (!/^\d+$/.test(String(telefono))) {
      return res.status(400).json({
        mensaje: 'El teléfono solo puede contener números'
      });
    }

    if (!/^\d{6}$/.test(password)) {
      return res.status(400).json({
        mensaje: 'La contraseña debe tener exactamente 6 dígitos numéricos'
      });
    }

    if (!ROLES.includes(rol)) {
      return res.status(400).json({
        mensaje: `El rol debe ser uno de: ${ROLES.join(', ')}`
      });
    }

    const repetido = await datoRepetido({ correo, telefono });

    if (repetido) {
      return res.status(400).json({
        mensaje: repetido
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const resultado = await pool.query(
      `INSERT INTO usuarios
        (nombre, correo, telefono, password, rol, estado)
       VALUES ($1, $2, $3, $4, $5, 'Activo')
       RETURNING
        id_usuario,
        nombre,
        correo,
        telefono,
        rol,
        estado`,
      [nombre, correo, telefono, passwordHash, rol]
    );

    res.status(201).json({
      mensaje: 'Usuario creado correctamente',
      usuario: resultado.rows[0]
    });

  } catch (error) {

    console.error('Error creando usuario:', error);

    res.status(500).json({
      mensaje: 'Error interno del servidor'
    });
  }
});


// =====================================================
// ELIMINAR USUARIO
// =====================================================

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!idValido(id)) {
      return res.status(400).json({
        mensaje: 'El id del usuario no es válido'
      });
    }

    const resultado = await pool.query(
      `DELETE FROM usuarios
       WHERE id_usuario = $1
       RETURNING id_usuario`,
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: 'Usuario no encontrado'
      });
    }

    res.json({
      mensaje: 'Usuario eliminado correctamente'
    });

  } catch (error) {

    // 23503 = violación de llave foránea (ej. el usuario tiene citas)
    if (error.code === '23503') {
      return res.status(409).json({
        mensaje: 'No se puede eliminar: el usuario tiene registros asociados. Cámbialo a Inactivo.'
      });
    }

    console.error('Error eliminando usuario:', error);

    res.status(500).json({
      mensaje: 'Error interno del servidor'
    });
  }
});


export default router;


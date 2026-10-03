import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/database.js';
import usuariosRoutes from './routes/usuarios.routes.js';

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());

app.use(express.json());


// Rutas de usuarios
app.use('/api/usuarios', usuariosRoutes);


// Ruta principal
app.get('/', (req, res) => {
  res.json({
    mensaje: 'API del Sistema de Gestión de Barberías funcionando correctamente',
    estado: 'Activo'
  });
});


// Prueba de conexión con PostgreSQL
app.get('/api/prueba-db', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT NOW()');

    res.json({
      mensaje: 'Conexión con PostgreSQL exitosa',
      fecha: resultado.rows[0].now
    });

  } catch (error) {
    console.error(
      'Error conectando a PostgreSQL:',
      error
    );

    res.status(500).json({
      mensaje: 'Error al conectar con PostgreSQL'
    });
  }
});


app.listen(PORT, () => {
  console.log(
    `Servidor ejecutándose en http://localhost:${PORT}`
  );
});
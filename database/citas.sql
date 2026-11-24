-- =====================================================
-- Tabla de citas (HU-11 Reservar cita, HU-12 Gestionar citas)
--
-- Cómo aplicarla: Supabase -> SQL Editor -> pegar este archivo -> Run.
-- Se puede ejecutar más de una vez: si la tabla ya existe no hace nada.
-- =====================================================

-- Necesaria para combinar "=" y rangos en las restricciones EXCLUDE
-- (ya está activa porque la usa la tabla horarios)
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS citas (
  id_cita        SERIAL PRIMARY KEY,
  id_cliente     INTEGER NOT NULL REFERENCES usuarios (id_usuario),
  id_barbero     INTEGER NOT NULL REFERENCES usuarios (id_usuario),
  id_servicio    INTEGER NOT NULL REFERENCES servicios (id_servicio),
  fecha          DATE NOT NULL,
  hora_inicio    TIME NOT NULL,
  hora_fin       TIME NOT NULL,   -- hora_inicio + duración del servicio (la calcula el backend)
  estado         VARCHAR(20) NOT NULL DEFAULT 'Reservada',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT cita_fin_mayor CHECK (hora_fin > hora_inicio),
  CONSTRAINT cita_estado_check CHECK (estado IN ('Reservada', 'Cancelada')),

  -- Un barbero no puede tener dos citas reservadas que se crucen (las canceladas no cuentan)
  CONSTRAINT cita_barbero_sin_superposicion EXCLUDE USING gist (
    id_barbero WITH =,
    tsrange(fecha + hora_inicio, fecha + hora_fin) WITH &&
  ) WHERE (estado = 'Reservada'),

  -- Un cliente tampoco puede tener dos citas reservadas al mismo tiempo
  CONSTRAINT cita_cliente_sin_superposicion EXCLUDE USING gist (
    id_cliente WITH =,
    tsrange(fecha + hora_inicio, fecha + hora_fin) WITH &&
  ) WHERE (estado = 'Reservada')
);

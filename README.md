# BarberFlow — Backend

API del sistema de gestión de barberías. Construida con Node.js, Express y PostgreSQL.
El frontend está en el repositorio `sistema-barberias-frontend`.

## Cómo ejecutarlo en tu computador

Requisitos: [Node.js](https://nodejs.org/) 20 o superior.

1. **Instalar las dependencias** (obligatorio la primera vez, y cada vez que cambie `package.json`):

   ```bash
   npm install
   ```

   > Si omites este paso, el servidor falla con
   > `Cannot find package 'express'`: la carpeta `node_modules` no se sube a GitHub.

2. **Crear el archivo `.env`:** copia `.env.example` como `.env` y completa los datos de la base de datos
   (pídeselos al equipo; este archivo no se sube a GitHub).

3. **Arrancar el servidor:**

   ```bash
   npm run dev     # se reinicia solo al guardar cambios
   npm start       # arranque normal
   ```

4. **Comprobar que funciona:** abre <http://localhost:3000/api/prueba-db>.
   Debe responder `Conexión con PostgreSQL exitosa`.

El frontend busca el backend en `http://localhost:3000` por defecto, así que no necesita más configuración.

## Problemas frecuentes

| Mensaje | Causa y solución |
| --- | --- |
| `Cannot find package 'express'` | Falta ejecutar `npm install`. |
| `Conexión con PostgreSQL` falla o `ECONNREFUSED` | Revisa los datos del `.env` (host, puerto, usuario, contraseña). |
| El frontend dice "No se pudo conectar con el servidor" | El backend no está corriendo, o está en otro puerto. |
| `EADDRINUSE: address already in use :::3000` | Ya hay un servidor en el puerto 3000. Ciérralo o cambia `PORT` en el `.env`. |
| Al iniciar sesión: "Error de configuración del servidor" | Falta `JWT_SECRET` en el `.env` (ver `.env.example`). |

## Autenticación

`POST /api/usuarios/login` devuelve un `token`. Las rutas marcadas como **Admin** lo exigen en el encabezado
`Authorization: Bearer <token>` y solo las puede usar un usuario con rol `Administrador`.

## Endpoints de usuarios (`/api/usuarios`)

| Método | Ruta | Acceso | Para qué |
| --- | --- | --- | --- |
| `POST` | `/registro` | Público | Registro público (crea un Cliente). |
| `POST` | `/login` | Público | Iniciar sesión con `correo` **o** `telefono`, más `password`. |
| `GET` | `/?criterio=&rol=` | Admin | Buscar por nombre, correo o teléfono; `rol` es opcional. |
| `GET` | `/:id` | Admin | Obtener un usuario. |
| `POST` | `/` | Admin | Crear un usuario; `rol` opcional (`Cliente` por defecto, `Barbero` para HU-08). |
| `PUT` | `/:id` | Admin | Editar nombre, teléfono y correo. |
| `PATCH` | `/:id/estado` | Admin | Activar o inactivar (`Activo` / `Inactivo`). |
| `DELETE` | `/:id` | Admin | Eliminar (se rechaza si el usuario tiene registros asociados). |

Reglas: correo `@gmail.com` o `@hotmail.com`, teléfono solo números y único, contraseña de exactamente 6 dígitos.

## Endpoints de servicios (`/api/servicios`)

Todas son **Admin**.

| Método | Ruta | Para qué |
| --- | --- | --- |
| `GET` | `/` | Listar servicios (responde `{ servicios: [...] }`). |
| `POST` | `/` | Registrar un servicio (HU-05). |
| `PUT` | `/:id` | Modificar un servicio (HU-06). |
| `DELETE` | `/:id` | Eliminar un servicio (HU-06; se rechaza si tiene registros asociados). |

Reglas (HU-07): `nombre` obligatorio, `precio` obligatorio y mayor que cero, `duracion` en minutos entera y mayor que cero;
`descripcion` es opcional. `POST` y `PUT` piden los cuatro campos.

## Endpoints de horarios (`/api/horarios`)

Todas son **Admin** (HU-09). Los horarios son semanales: `dia_semana` va de `1` (lunes) a `7` (domingo).

| Método | Ruta | Para qué |
| --- | --- | --- |
| `GET` | `/?id_barbero=` | Listar horarios (responde `{ horarios: [...] }`); `id_barbero` es opcional. |
| `POST` | `/` | Asignar un horario a un barbero. |
| `PUT` | `/:id` | Modificar un horario. |
| `DELETE` | `/:id` | Eliminar un horario. |

Reglas: `id_barbero` debe ser un usuario con rol `Barbero` y estado `Activo`; `hora_inicio` y `hora_fin` en formato `HH:MM`
y la de fin posterior a la de inicio. Un barbero no puede tener dos horarios que se crucen el mismo día: la base de datos
lo impide (restricción `horario_sin_superposicion`) y la API responde `409` con un mensaje claro. Un horario que empieza
justo cuando termina otro sí se permite.

## Endpoint de disponibilidad (`/api/disponibilidad`)

| Método | Ruta | Acceso | Para qué |
| --- | --- | --- | --- |
| `GET` | `/` | Con sesión | Horarios de atención de los barberos **activos** (HU-10). Solo lectura. |

## Endpoints de citas (`/api/citas`)

> **Antes de usarlas**, crea la tabla: Supabase → SQL Editor → pega [`database/citas.sql`](database/citas.sql) → Run.
> Mientras no exista, estas rutas responden `503` con el mensaje "Las citas aún no están habilitadas".

Todas son solo para usuarios con rol **Cliente** (HU-11 y HU-12), y cada cliente solo ve y cambia **sus** citas.

| Método | Ruta | Para qué |
| --- | --- | --- |
| `GET` | `/` | Mis citas (próximas primero). Cada una trae `puede_modificar`. |
| `GET` | `/servicios` | Servicios activos que se pueden reservar. |
| `GET` | `/turnos?id_barbero=&id_servicio=&fecha=AAAA-MM-DD` | Horas libres (`["10:00", "10:30", ...]`). Con `&excluir_cita=` al modificar. |
| `POST` | `/` | Reservar: `id_barbero`, `id_servicio`, `fecha`, `hora_inicio` (HU-11). |
| `PUT` | `/:id` | Modificar servicio, barbero, fecha u hora (HU-12). |
| `PATCH` | `/:id/cancelar` | Cancelar (HU-12). No se borra: queda `Cancelada` y la hora vuelve a estar libre. |

Reglas: la cita debe ser futura y caber completa (según la duración del servicio) dentro de un horario del barbero
ese día; el barbero y el servicio deben estar activos. Ni el barbero ni el cliente pueden tener dos citas reservadas
que se crucen: la base de datos lo impide y la API responde `409`. Las horas se ofrecen cada 30 minutos.
Solo se pueden modificar o cancelar citas reservadas que aún no han pasado.

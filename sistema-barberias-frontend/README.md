# BarberFlow — Frontend

Aplicación web de gestión para barberías. Está pensada **principalmente para usarse desde el celular**, aunque también funciona en tabletas y computadores.

Construida con [Vue 3](https://vuejs.org/) (`<script setup>`) y [Vite](https://vite.dev/). El backend está en el repositorio `sistema-barberias-backend`.

## Qué puede hacer

| Función | Quién | Descripción |
| --- | --- | --- |
| Iniciar sesión | Todos | Con **correo electrónico o número de teléfono** y contraseña. |
| Crear cuenta | Visitante | Registro de un cliente nuevo. |
| Ver mi cuenta | Cliente | Nombre, estado, correo y teléfono. |
| Gestionar clientes | Administrador | Buscar, crear, editar, activar/inactivar y eliminar clientes. |
| Cambiar rol | Sesión iniciada | Alterna entre la vista de Cliente y la de Administrador (para un Cliente, el panel es solo una vista previa sin acciones). |

## Cómo ejecutarlo

Requisitos: [Node.js](https://nodejs.org/) 18 o superior.

```bash
npm install     # instala las dependencias (solo la primera vez)
npm run dev     # servidor de desarrollo, normalmente en http://localhost:5173
npm run build   # genera la versión de producción en la carpeta dist/
npm run preview # prueba localmente la versión de producción
```

### Conexión con el backend

La dirección del backend se configura con la variable `VITE_API_URL`. Crea un archivo `.env` en la raíz del proyecto:

```
VITE_API_URL=https://tu-backend.com
```

Si no existe, se usa `http://localhost:3000`. Recuerda **iniciar el backend** antes de probar el login:
sigue los pasos del README de `sistema-barberias-backend` (`npm install`, crear su `.env` y `npm run dev`).

Si no quieres levantar el backend, puedes apuntar al publicado creando un archivo `.env.local` (no se sube a GitHub; hay un ejemplo en `.env.example`).
Ojo: así trabajas con la base de datos real.

## Estructura del proyecto

```
src/
├── main.js                         Punto de entrada: monta la aplicación Vue
├── style.css                       Estilos globales mínimos (reset y base)
├── App.vue                         Pantalla única: template, lógica y estilos
├── components/
│   └── CampoForm.vue               Campo de formulario con su mensaje de error
└── controllers/
    └── ClienteController.js        Todas las llamadas al backend
```

### `App.vue`

Está dividido en tres bloques, cada uno comentado por secciones:

1. **`<template>`** — muestra una de tres vistas según la sesión:
   autenticación (login / registro), vista de Cliente o panel de Administrador.
2. **`<script setup>`** — organizado en: utilidades, estado, autenticación, creación de clientes y panel de administrador.
3. **`<style scoped>`** — estilos de la pantalla, escritos de forma *mobile first* (ver más abajo).

### `ClienteController.js`

Es la única capa que habla con el backend. Todos sus métodos devuelven:

- el dato pedido (un usuario o una lista) si todo salió bien, o
- un texto que empieza por `Error: ...` si algo falló.

Por eso la interfaz detecta los errores con `typeof respuesta === 'string'`.

## API del backend que utiliza

| Método | Ruta | Para qué |
| --- | --- | --- |
| `POST` | `/api/usuarios/login` | Iniciar sesión (`correo` **o** `telefono`, más `password`). |
| `POST` | `/api/usuarios/registro` | Crear un cliente. |
| `GET` | `/api/usuarios?rol=Cliente&criterio=` | Buscar clientes por nombre, correo o teléfono. |
| `PUT` | `/api/usuarios/:id` | Editar nombre, teléfono y correo. |
| `PATCH` | `/api/usuarios/:id/estado` | Activar o inactivar. |
| `DELETE` | `/api/usuarios/:id` | Eliminar un cliente (el backend lo rechaza si tiene registros asociados). |

## Reglas de validación

- **Correo (registro):** debe ser `@gmail.com` o `@hotmail.com`.
- **Nombre:** solo letras (con tildes) y espacios.
- **Teléfono:** solo números.
- **Contraseña (registro):** exactamente 6 dígitos numéricos.
- **Login:** acepta cualquier correo con formato válido, o un teléfono (solo números).

Las reglas viven en un solo lugar (`validarLogin` y `validarRegistro`, en `ClienteController.js`): la pantalla las usa para mostrar los errores y el controlador las vuelve a aplicar antes de enviar. El backend también las valida.

## Mensajes de error

Cada error aparece **justo debajo del campo que falló**, en rojo y con el borde del campo resaltado, para que el usuario sepa exactamente qué corregir:

| Situación | Dónde aparece |
| --- | --- |
| Campo vacío o con formato incorrecto | Debajo de ese campo. |
| El servidor menciona el correo o el teléfono (por ejemplo, ya registrado) | Debajo del campo de correo o de teléfono. |
| Otro error del servidor (credenciales incorrectas, cuenta inactiva, sin conexión) | Encima del botón de enviar. |
| Error al editar un cliente en la tabla | Debajo de los campos de esa fila. |
| Aviso de éxito | Recuadro verde en la parte superior del formulario o del panel. |

El componente `src/components/CampoForm.vue` (etiqueta + campo + error) se reutiliza en el login, el registro y el formulario de nuevo cliente.

## Diseño responsive (celular primero)

Los estilos base están pensados para pantallas pequeñas y se amplían con `@media (min-width: ...)`:

| Ancho | Qué cambia |
| --- | --- |
| **Celular** (base) | Formularios en una columna. Los clientes se muestran como **tarjetas** en lugar de tabla. Botones y campos de al menos 44 px de alto para tocar con el dedo. |
| **≥ 640 px** (tableta) | Formularios en dos columnas, se muestra el nombre del usuario en el encabezado. |
| **≥ 900 px** (computador) | Las tarjetas vuelven a ser una tabla con encabezados. |

Detalles pensados para celular:

- Los campos usan tamaño de letra de 16 px para que el iPhone no haga zoom al tocarlos.
- Teléfono con teclado numérico (`inputmode="numeric"`) y `autocomplete` en los campos para que el navegador pueda autocompletar.
- La búsqueda espera 300 ms después de dejar de escribir antes de consultar al servidor.
- Los mensajes aparecen dentro de la página (sin ventanas emergentes), junto al campo que hay que corregir.

## Paleta

Definida como variables CSS al inicio del bloque `<style>` de `App.vue`: crema de fondo, carbón en el encabezado, dorado de acento y rojo "poste de barbero" para las acciones principales.

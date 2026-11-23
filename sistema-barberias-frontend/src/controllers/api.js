/**
 * api.js — Punto único de comunicación con el backend (lo usan todos los controladores).
 *
 *  - Si hay sesión, agrega el token en el encabezado Authorization
 *    (el backend lo exige en las rutas de administrador).
 *  - Si todo sale bien, devuelve los datos de la respuesta.
 *  - Si algo falla, devuelve un texto que empieza por "Error: ...".
 *
 * La dirección del servidor se toma de la variable VITE_API_URL
 * (archivo .env); si no existe, se usa el servidor local.
 */
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Token JWT que entrega el login. Vive en memoria, igual que los datos del usuario en App.vue:
// al recargar la página hay que iniciar sesión de nuevo.
let token = null;

/** Guarda el token de la sesión (o lo borra si recibe null). */
export function guardarToken(nuevoToken) {
  token = nuevoToken || null;
}

/**
 * Hace una petición al backend y unifica el manejo de errores.
 *
 * @param {string} ruta     Ruta de la API, por ejemplo '/api/usuarios/login'
 * @param {string} metodo   'GET', 'POST', 'PUT', 'PATCH' o 'DELETE'
 * @param {object} [cuerpo] Datos a enviar en formato JSON (opcional)
 * @returns {Promise<any>}  Los datos de la respuesta, o "Error: ..." si falló
 */
export async function peticion(ruta, metodo, cuerpo) {
  try {
    const opciones = { method: metodo, headers: {} };

    if (token) {
      opciones.headers.Authorization = `Bearer ${token}`;
    }

    if (cuerpo) {
      opciones.headers['Content-Type'] = 'application/json';
      opciones.body = JSON.stringify(cuerpo);
    }

    const respuesta = await fetch(`${API_URL}${ruta}`, opciones);
    // Si el servidor no responde con JSON (por ejemplo, una página de error) se trata como respuesta vacía
    const resultado = await respuesta.json().catch(() => ({}));

    // El backend explica el problema en el campo "mensaje"
    if (!respuesta.ok) {
      return `Error: ${resultado.mensaje || 'El servidor no pudo completar la acción'}`;
    }

    return resultado;
  } catch (error) {
    console.error(`Error en ${metodo} ${ruta}:`, error);
    return 'Error: No se pudo conectar con el servidor';
  }
}

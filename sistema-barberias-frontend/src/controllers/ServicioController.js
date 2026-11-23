/**
 * ServicioController — Comunicación con el backend (API de servicios).
 *
 * Sigue las mismas reglas que ClienteController: devuelve el dato pedido,
 * o un texto que empieza por "Error: ..." si algo falló.
 * Todas las rutas de servicios exigen sesión de administrador (el token lo agrega api.js).
 */
import { peticion } from './api.js';

// El precio y la duración pueden llegar como número (inputs type="number") o como texto
const comoTexto = (valor) => String(valor ?? '').trim();

/**
 * Valida los datos de un servicio (HU-05 y HU-06), incluido el precio obligatorio (HU-07).
 * @returns {Object} Errores por campo: nombre, precio o duracion.
 *                   Si todo está bien devuelve un objeto vacío.
 */
export function validarServicio(datos) {
  const errores = {};

  if (!comoTexto(datos.nombre)) {
    errores.nombre = 'El nombre del servicio es obligatorio.';
  }

  // HU-07: ningún servicio puede quedar sin precio
  const precio = Number(comoTexto(datos.precio));
  if (!comoTexto(datos.precio) || !Number.isFinite(precio) || precio <= 0) {
    errores.precio = 'Ingresa un precio válido mayor que cero.';
  }

  const duracion = Number(comoTexto(datos.duracion));
  if (!comoTexto(datos.duracion) || !Number.isInteger(duracion) || duracion <= 0) {
    errores.duracion = 'Ingresa una duración válida en minutos.';
  }

  return errores;
}

// Devuelve el primer mensaje de un objeto de errores (para los métodos que responden con un solo texto)
const primerError = (errores) => Object.values(errores)[0];

// Datos que espera el backend al registrar o modificar un servicio
const datosServicio = (datos) => ({
  nombre: comoTexto(datos.nombre),
  descripcion: comoTexto(datos.descripcion),
  precio: Number(comoTexto(datos.precio)),
  duracion: Number(comoTexto(datos.duracion))
});

export class ServicioController {

  /**
   * Registra un nuevo servicio en la barbería (HU-05).
   * @param {{nombre: string, descripcion?: string, precio: string|number, duracion: string|number}} datos
   * @returns {Promise<object|string>} El servicio creado, o "Error: ..."
   */
  async registrarServicio(datos) {
    const errores = validarServicio(datos);
    if (primerError(errores)) {
      return `Error: ${primerError(errores)}`;
    }

    const resultado = await peticion('/api/servicios', 'POST', datosServicio(datos));

    return typeof resultado === 'string' ? resultado : resultado.servicio;
  }

  /**
   * Consulta los servicios registrados en la barbería.
   * @returns {Promise<object[]|string>} Lista de servicios, o "Error: ..."
   */
  async buscarServicios() {
    const resultado = await peticion('/api/servicios', 'GET');

    return typeof resultado === 'string' ? resultado : resultado.servicios;
  }

  /**
   * Actualiza la información de un servicio (HU-06).
   * @param {number} id
   * @param {{nombre: string, descripcion?: string, precio: string|number, duracion: string|number}} datos
   * @returns {Promise<object|string>} El servicio actualizado, o "Error: ..."
   */
  async actualizarServicio(id, datos) {
    const errores = validarServicio(datos);
    if (primerError(errores)) {
      return `Error: ${primerError(errores)}`;
    }

    const resultado = await peticion(`/api/servicios/${id}`, 'PUT', datosServicio(datos));

    return typeof resultado === 'string' ? resultado : resultado.servicio;
  }

  /**
   * Elimina definitivamente un servicio (HU-06).
   * @param {number} id
   * @returns {Promise<true|string>} true si se eliminó, o "Error: ..."
   */
  async eliminarServicio(id) {
    const resultado = await peticion(`/api/servicios/${id}`, 'DELETE');

    return typeof resultado === 'string' ? resultado : true;
  }
}

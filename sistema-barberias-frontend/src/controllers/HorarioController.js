/**
 * HorarioController — Comunicación con el backend (API de horarios de los barberos, HU-09).
 *
 * Sigue las mismas reglas que ServicioController: devuelve el dato pedido,
 * o un texto que empieza por "Error: ..." si algo falló.
 * Todas las rutas de horarios exigen sesión de administrador (el token lo agrega api.js).
 */
import { peticion } from './api.js';

// Días de la semana: el número es el que guarda la base de datos (1 = lunes ... 7 = domingo)
export const DIAS_SEMANA = [
  { numero: 1, nombre: 'Lunes' },
  { numero: 2, nombre: 'Martes' },
  { numero: 3, nombre: 'Miércoles' },
  { numero: 4, nombre: 'Jueves' },
  { numero: 5, nombre: 'Viernes' },
  { numero: 6, nombre: 'Sábado' },
  { numero: 7, nombre: 'Domingo' }
];

/** Devuelve el nombre del día a partir de su número (por ejemplo 1 -> "Lunes"). */
export const nombreDia = (numero) =>
  DIAS_SEMANA.find((dia) => dia.numero === Number(numero))?.nombre ?? '';

// El campo de hora del navegador (type="time") entrega el texto "HH:MM", por ejemplo "09:30"
const REGEX_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Valida los datos de un horario (HU-09).
 * @returns {Object} Errores por campo: id_barbero, dia_semana, hora_inicio o hora_fin.
 *                   Si todo está bien devuelve un objeto vacío.
 */
export function validarHorario(datos) {
  const errores = {};

  if (!datos.id_barbero) {
    errores.id_barbero = 'Selecciona un barbero.';
  }

  const dia = Number(datos.dia_semana);
  if (!datos.dia_semana || !Number.isInteger(dia) || dia < 1 || dia > 7) {
    errores.dia_semana = 'Selecciona el día de la semana.';
  }

  const inicio = String(datos.hora_inicio ?? '');
  const fin = String(datos.hora_fin ?? '');

  if (!inicio) {
    errores.hora_inicio = 'Ingresa la hora de inicio.';
  } else if (!REGEX_HORA.test(inicio)) {
    errores.hora_inicio = 'La hora de inicio no es válida.';
  }

  if (!fin) {
    errores.hora_fin = 'Ingresa la hora de fin.';
  } else if (!REGEX_HORA.test(fin)) {
    errores.hora_fin = 'La hora de fin no es válida.';
  } else if (!errores.hora_inicio && fin <= inicio) {
    // Con el formato "HH:MM", comparar el texto equivale a comparar la hora
    errores.hora_fin = 'La hora de fin debe ser posterior a la hora de inicio.';
  }

  return errores;
}

// Devuelve el primer mensaje de un objeto de errores (para los métodos que responden con un solo texto)
const primerError = (errores) => Object.values(errores)[0];

// Datos que espera el backend al asignar o modificar un horario
const datosHorario = (datos) => ({
  id_barbero: Number(datos.id_barbero),
  dia_semana: Number(datos.dia_semana),
  hora_inicio: datos.hora_inicio,
  hora_fin: datos.hora_fin
});

export class HorarioController {

  /**
   * Asigna un horario a un barbero (HU-09).
   * @param {{id_barbero: number, dia_semana: number, hora_inicio: string, hora_fin: string}} datos
   * @returns {Promise<object|string>} El horario creado, o "Error: ..."
   *          (por ejemplo, si se cruza con otro horario del mismo barbero)
   */
  async asignarHorario(datos) {
    const errores = validarHorario(datos);
    if (primerError(errores)) {
      return `Error: ${primerError(errores)}`;
    }

    const resultado = await peticion('/api/horarios', 'POST', datosHorario(datos));

    return typeof resultado === 'string' ? resultado : resultado.horario;
  }

  /**
   * Consulta los horarios de todos los barberos.
   * @returns {Promise<object[]|string>} Lista de horarios, o "Error: ..."
   */
  async buscarHorarios() {
    const resultado = await peticion('/api/horarios', 'GET');

    return typeof resultado === 'string' ? resultado : resultado.horarios;
  }

  /**
   * Modifica un horario.
   * @param {number} id
   * @param {{id_barbero: number, dia_semana: number, hora_inicio: string, hora_fin: string}} datos
   * @returns {Promise<object|string>} El horario actualizado, o "Error: ..."
   */
  async actualizarHorario(id, datos) {
    const errores = validarHorario(datos);
    if (primerError(errores)) {
      return `Error: ${primerError(errores)}`;
    }

    const resultado = await peticion(`/api/horarios/${id}`, 'PUT', datosHorario(datos));

    return typeof resultado === 'string' ? resultado : resultado.horario;
  }

  /**
   * Elimina un horario.
   * @param {number} id
   * @returns {Promise<true|string>} true si se eliminó, o "Error: ..."
   */
  async eliminarHorario(id) {
    const resultado = await peticion(`/api/horarios/${id}`, 'DELETE');

    return typeof resultado === 'string' ? resultado : true;
  }
}
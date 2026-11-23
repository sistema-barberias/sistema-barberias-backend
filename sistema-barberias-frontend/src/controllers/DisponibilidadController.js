
/**
 * DisponibilidadController — Comunicación con el backend (HU-10).
 *
 * Permite consultar los horarios asignados a los barberos
 * para que los clientes puedan visualizar su disponibilidad.
 *
 * Es de solo lectura: no asigna, modifica ni elimina horarios.
 */
import { peticion } from './api.js';

export class DisponibilidadController {

  /**
   * Consulta los horarios disponibles de los barberos.
   * @returns {Promise<object[]|string>} Lista de horarios o "Error: ..."
   */
  async consultarDisponibilidad() {
    const resultado = await peticion('/api/disponibilidad', 'GET');

    return typeof resultado === 'string'
      ? resultado
      : resultado.horarios;
  }
}

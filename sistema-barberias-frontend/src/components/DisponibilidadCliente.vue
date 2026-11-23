
<script setup>
import { ref, onMounted } from 'vue';
import { DisponibilidadController } from '../controllers/DisponibilidadController.js';

const disponibilidadController = new DisponibilidadController();

const horarios = ref([]);
const cargando = ref(false);
const mensajeError = ref('');

const DIAS_SEMANA = [
  { numero: 1, nombre: 'Lunes' },
  { numero: 2, nombre: 'Martes' },
  { numero: 3, nombre: 'Miércoles' },
  { numero: 4, nombre: 'Jueves' },
  { numero: 5, nombre: 'Viernes' },
  { numero: 6, nombre: 'Sábado' },
  { numero: 7, nombre: 'Domingo' }
];

const consultarDisponibilidad = async () => {
  cargando.value = true;
  mensajeError.value = '';

  const resultado = await disponibilidadController.consultarDisponibilidad();

  if (typeof resultado === 'string') {
    mensajeError.value = resultado.replace(/^Error:\s*/, '');
    horarios.value = [];
  } else {
    horarios.value = resultado || [];
  }

  cargando.value = false;
};

onMounted(consultarDisponibilidad);
</script>

<template>
  <section class="disponibilidad">
    <div class="encabezado-disponibilidad">
      <h2>Disponibilidad de los barberos</h2>
      <p>Consulta los días y horarios de atención.</p>
    </div>

    <div v-if="cargando" class="estado-disponibilidad">
      Consultando horarios...
    </div>

    <div v-else-if="mensajeError" class="mensaje-error">
      {{ mensajeError }}
      <button @click="consultarDisponibilidad">Intentar nuevamente</button>
    </div>

    <div v-else-if="horarios.length === 0" class="estado-disponibilidad">
      Actualmente no hay horarios disponibles para consultar.
    </div>

    <div v-else class="lista-barberos">
      <article
        v-for="horario in horarios"
        :key="horario.id_horario"
        class="tarjeta-horario"
      >
        <h3>{{ horario.barbero }}</h3>

        <p class="dia-horario">
          {{ DIAS_SEMANA.find(dia => dia.numero === Number(horario.dia_semana))?.nombre }}
        </p>

        <p>
          {{ horario.hora_inicio }} - {{ horario.hora_fin }}
        </p>
      </article>
    </div>

    <button
      v-if="!cargando && !mensajeError"
      class="boton-actualizar"
      @click="consultarDisponibilidad"
    >
      Actualizar horarios
    </button>
  </section>
</template>

<style scoped>
.disponibilidad {
  margin-top: 24px;
}

.encabezado-disponibilidad h2 {
  margin-bottom: 8px;
}

.encabezado-disponibilidad p {
  color: #777;
  margin-bottom: 20px;
}

.lista-barberos {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.tarjeta-horario {
  padding: 18px;
  border: 1px solid #ddd;
  border-radius: 12px;
  background: #fff;
}

.tarjeta-horario h3 {
  margin-top: 0;
}

.dia-horario {
  font-weight: bold;
}

.estado-disponibilidad,
.mensaje-error {
  padding: 16px;
  border-radius: 8px;
  background: #f5f5f5;
}

.mensaje-error {
  color: #b42318;
}

.boton-actualizar,
.mensaje-error button {
  margin-top: 16px;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
</style>

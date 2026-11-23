<!--
  CampoForm.vue — Un campo de formulario: etiqueta, input y, si hay un error,
  el mensaje justo debajo en rojo.

  Uso:
    <CampoForm id="correo" label="Correo" v-model="form.correo" :error="errores.correo" />

  Props:
    id            Identificador único (une la etiqueta con el input)
    label         Texto de la etiqueta
    v-model       Valor del campo
    error         Mensaje de error (si es vacío, no se muestra nada)
    type, placeholder, autocomplete, inputmode   Se pasan tal cual al <input>
-->
<template>
  <div class="form-group">
    <label :for="id">{{ label }}</label>
    <input
      :id="id"
      v-model="valor"
      :type="type"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :inputmode="inputmode"
      :class="{ invalid: error }"
      :aria-invalid="Boolean(error)"
      :aria-describedby="error ? `${id}-error` : undefined"
    >
    <!-- El error aparece debajo del campo y lo leen los lectores de pantalla -->
    <p v-if="error" :id="`${id}-error`" class="field-error" role="alert">{{ error }}</p>
  </div>
</template>

<script setup>
defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  error: { type: String, default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  autocomplete: { type: String, default: undefined },
  inputmode: { type: String, default: undefined }
});

// Vincula el valor del input con el v-model del componente padre.
// Acepta Number porque con type="number" Vue entrega el valor convertido a número.
const valor = defineModel({ type: [String, Number], default: '' });
</script>

<style scoped>
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: .9rem; font-weight: 600; color: var(--ink); }

/* font-size 16px evita que el iPhone haga zoom automático al tocar un campo */
.form-group input {
  width: 100%;
  min-height: var(--touch);
  padding: 10px 12px;
  border: 1px solid #d6cab6;
  border-radius: 8px;
  font-size: 16px;
  background: #fff;
  color: var(--text);
}
.form-group input:focus { outline: 2px solid var(--gold); border-color: transparent; }

/* Campo con error: borde rojo y mensaje debajo */
.form-group input.invalid { border-color: var(--red); background: #fffafa; }
.form-group input.invalid:focus { outline-color: var(--red); }
.field-error { font-size: .85rem; line-height: 1.3; color: var(--red-dark); }
</style>

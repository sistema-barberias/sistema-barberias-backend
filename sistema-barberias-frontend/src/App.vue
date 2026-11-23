import DisponibilidadCliente from './components/DisponibilidadCliente.vue'; 
<!--
  App.vue — Pantalla única de BarberFlow.

  Muestra una de tres vistas según el estado de la sesión:
    1. Autenticación (sin sesión): iniciar sesión o crear cuenta.
    2. Cliente o barbero: resumen de su cuenta.
    3. Administrador: gestión de clientes, barberos (HU-08) y servicios (HU-05 a HU-07).

  La comunicación con el backend vive en controllers/ (ClienteController.js y ServicioController.js).
-->
<template>
  <div class="app">
    <!-- ============ ENCABEZADO ============ -->
    <header class="app-header">
      <div class="header-inner">
        <h1 class="brand">BarberFlow</h1>

        <!-- Datos de sesión: solo visibles si hay un usuario logueado -->
        <div v-if="usuarioLogueado" class="session-area">
          <span class="session-text">
            <strong>{{ usuarioLogueado.nombre }}</strong>
            <small>{{ rolActivo }}</small>
          </span>

          <button type="button" class="btn btn-outline" @click="logout">Cerrar sesión</button>
        </div>
      </div>
    </header>

    <main class="main">
      <!-- ============ 1. AUTENTICACIÓN ============ -->
      <section v-if="!usuarioLogueado" class="auth-section">
        <div class="auth-wrap">
          <div class="auth-intro">
            <h2>Tu barbería, a un clic</h2>
            <p>Ingresa para gestionar tu cuenta y tus citas.</p>
          </div>

          <div class="auth-card">
            <!-- Pestañas: iniciar sesión / crear cuenta -->
            <div class="tabs" role="tablist">
              <button
                type="button"
                role="tab"
                :class="{ active: vistaAuth === 'login' }"
                @click="cambiarVista('login')"
              >Iniciar sesión</button>
              <button
                type="button"
                role="tab"
                :class="{ active: vistaAuth === 'registro' }"
                @click="cambiarVista('registro')"
              >Crear cuenta</button>
            </div>

            <!-- Formulario de inicio de sesión (correo o teléfono + contraseña) -->
            <!--
              Los formularios usan "novalidate": la validación la hace nuestro código
              y cada error aparece debajo del campo que lo causó.
            -->
            <form v-if="vistaAuth === 'login'" class="form" novalidate @submit.prevent="login">
              <h2>Bienvenido de nuevo</h2>
              <!-- Aviso de éxito (por ejemplo, después de crear la cuenta) -->
              <p v-if="mensajeExito" class="alert exito" role="status">{{ mensajeExito }}</p>

              <CampoForm
                id="login-correo"
                label="Correo electrónico o teléfono"
                v-model="formAuth.correo"
                :error="errores.correo"
                autocomplete="username"
                placeholder="ejemplo@gmail.com o 3001234567"
              />
              <CampoForm
                id="login-pass"
                label="Contraseña"
                type="password"
                v-model="formAuth.password"
                :error="errores.password"
                autocomplete="current-password"
                placeholder="Tu contraseña"
              />

              <!-- Error del servidor (credenciales incorrectas, cuenta inactiva, sin conexión...) -->
              <p v-if="errores.general" class="form-error" role="alert">{{ errores.general }}</p>
              <button type="submit" class="btn btn-primary btn-block" :disabled="enviando">
                {{ enviando ? 'Ingresando...' : 'Ingresar' }}
              </button>
            </form>

            <!-- Formulario de registro de un nuevo cliente -->
            <form v-else class="form" novalidate @submit.prevent="registrarse">
              <h2>Crea tu cuenta de cliente</h2>

              <div class="form-row">
                <CampoForm id="reg-nombre" label="Nombre completo" v-model="formRegistro.nombre" :error="errores.nombre" autocomplete="name" placeholder="Tu nombre" />
                <CampoForm id="reg-tel" label="Teléfono" type="tel" inputmode="numeric" v-model="formRegistro.telefono" :error="errores.telefono" autocomplete="tel" placeholder="Número de celular" />
              </div>
              <CampoForm id="reg-correo" label="Correo electrónico" type="email" v-model="formRegistro.correo" :error="errores.correo" autocomplete="email" placeholder="correo@gmail.com" />
              <div class="form-row">
                <CampoForm id="reg-pass" label="Contraseña" type="password" v-model="formRegistro.password" :error="errores.password" autocomplete="new-password" placeholder="6 números" />
                <CampoForm id="reg-pass2" label="Confirmar contraseña" type="password" v-model="formRegistro.confirmarPassword" :error="errores.confirmarPassword" autocomplete="new-password" placeholder="Repite la contraseña" />
              </div>

              <p v-if="errores.general" class="form-error" role="alert">{{ errores.general }}</p>
              <button type="submit" class="btn btn-primary btn-block" :disabled="enviando">
                {{ enviando ? 'Creando cuenta...' : 'Crear cuenta' }}
              </button>
            </form>
          </div>
        </div>
      </section>

      <!-- ============ CONTENIDO CON SESIÓN ============ -->
      <section v-else class="content-section">
        <!-- 2. Vista de Cliente (también la ve el Barbero: el panel es solo para el Administrador) -->
        <div v-if="rolActivo !== 'Administrador'" class="client-view">
          <div class="card welcome-card">
            <h2>¡Hola, {{ usuarioLogueado.nombre }}!</h2>
            <p class="muted">
              Estado de tu cuenta:
              <span :class="['badge', usuarioLogueado.estado]">{{ usuarioLogueado.estado }}</span>
            </p>
          </div>
          <div class="grid-2">
            <div class="card">
              <span class="label">Correo</span>
              <p class="value">{{ usuarioLogueado.correo }}</p>
            </div>
            <div class="card">
              <span class="label">Teléfono</span>
              <p class="value">{{ usuarioLogueado.telefono }}</p>
            </div>
          </div>
          <p class="hint">Pronto podrás agendar tus citas desde aquí.</p>
          <DisponibilidadCliente v-if="rolActivo === 'Cliente'" />
        </div>

        <!-- 3. Panel del Administrador: clientes, barberos (HU-08) y servicios (HU-05 a HU-07) -->
        <div v-else class="card admin-panel">
          <div class="panel-header">
            <h2>{{ VISTAS_ADMIN[vistaAdmin] }}</h2>

            <div class="panel-actions">
              <button
                v-for="(titulo, vista) in VISTAS_ADMIN"
                :key="vista"
                type="button"
                class="btn"
                :class="vistaAdmin === vista ? 'btn-primary' : 'btn-outline'"
                @click="cambiarVistaAdmin(vista)"
              >
                {{ titulo }}
              </button>

              <template v-if="esVistaUsuarios">
                <input
                  class="search-input"
                  type="search"
                  v-model="criterioBusqueda"
                  @input="buscarConRetraso"
                  placeholder="Buscar por nombre, teléfono o correo"
                >

                <button
                  type="button"
                  class="btn btn-primary"
                  @click="alternarFormNuevo"
                >
                  {{ mostrarFormNuevo ? 'Cerrar' : `+ Nuevo ${nombreRol}` }}
                </button>
              </template>
            </div>
          </div>

          <!--
            Clientes y Barberos (HU-08) comparten esta vista: los dos son usuarios,
            solo cambia el rol que se busca y se crea (rolGestionado).
          -->
          <div v-if="esVistaUsuarios">
            <!-- Mensaje general del panel (se oculta mientras el formulario nuevo muestra el suyo) -->
            <p v-if="!mostrarFormNuevo && mensajeAdmin.texto" :class="['alert', mensajeAdmin.tipo]" role="alert">{{ mensajeAdmin.texto }}</p>

            <!-- Formulario para que el administrador cree un cliente o un barbero -->
            <form v-if="mostrarFormNuevo" class="panel-form" novalidate @submit.prevent="crearUsuarioAdmin">
              <h3>Nuevo {{ nombreRol }}</h3>
              <div class="form-row">
                <CampoForm id="adm-nombre" label="Nombre completo" v-model="formNuevo.nombre" :error="erroresNuevo.nombre" :placeholder="`Nombre del ${nombreRol}`" />
                <CampoForm id="adm-tel" label="Teléfono" type="tel" inputmode="numeric" v-model="formNuevo.telefono" :error="erroresNuevo.telefono" placeholder="Número de celular" />
              </div>
              <CampoForm id="adm-correo" label="Correo electrónico" type="email" v-model="formNuevo.correo" :error="erroresNuevo.correo" placeholder="correo@gmail.com" />
              <div class="form-row">
                <CampoForm id="adm-pass" label="Contraseña" type="password" v-model="formNuevo.password" :error="erroresNuevo.password" autocomplete="new-password" placeholder="6 números" />
                <CampoForm id="adm-pass2" label="Confirmar contraseña" type="password" v-model="formNuevo.confirmarPassword" :error="erroresNuevo.confirmarPassword" autocomplete="new-password" placeholder="Repite la contraseña" />
              </div>

              <p v-if="erroresNuevo.general" class="form-error" role="alert">{{ erroresNuevo.general }}</p>
              <div class="form-actions">
                <button type="button" class="btn btn-outline" @click="alternarFormNuevo">Cancelar</button>
                <button type="submit" class="btn btn-primary" :disabled="enviandoAdmin">
                  {{ enviandoAdmin ? 'Guardando...' : `Crear ${nombreRol}` }}
                </button>
              </div>
            </form>

            <!--
              Tabla de usuarios. En pantallas grandes es una tabla normal; en celular
              cada fila se muestra como una tarjeta (el atributo data-label da el título
              de cada dato, ver los estilos "Responsive" al final).
            -->
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Teléfono</th>
                    <th>Correo</th>
                    <th>Estado</th>
                    <th class="col-actions">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="usuario in listaUsuarios" :key="usuario.id_usuario">
                    <td data-label="Nombre">
                      <input v-if="estaEditando(usuario)" type="text" v-model="usuarioEditando.nombre" class="table-input">
                      <span v-else>{{ usuario.nombre }}</span>
                    </td>
                    <td data-label="Teléfono">
                      <input v-if="estaEditando(usuario)" type="tel" inputmode="numeric" v-model="usuarioEditando.telefono" class="table-input">
                      <span v-else>{{ usuario.telefono }}</span>
                    </td>
                    <td data-label="Correo" class="cell-email">
                      <input v-if="estaEditando(usuario)" type="email" v-model="usuarioEditando.correo" class="table-input">
                      <span v-else>{{ usuario.correo }}</span>
                    </td>
                    <td data-label="Estado">
                      <span :class="['badge', usuario.estado]">{{ usuario.estado }}</span>
                    </td>
                    <td data-label="Acciones" class="col-actions">
                      <!-- Modo edición: error (si lo hay) debajo de los campos, y botones guardar / cancelar -->
                      <template v-if="estaEditando(usuario)">
                        <p v-if="errorEdicion" class="field-error" role="alert">{{ errorEdicion }}</p>
                        <div class="actions-cell">
                          <button type="button" class="btn btn-sm btn-primary" @click="guardarEdicion">Guardar</button>
                          <button type="button" class="btn btn-sm btn-outline" @click="cancelarEdicion">Cancelar</button>
                        </div>
                      </template>
                      <!-- Confirmación antes de eliminar (la acción no se puede deshacer) -->
                      <template v-else-if="idEliminando === usuario.id_usuario">
                        <p class="field-error">¿Eliminar a {{ usuario.nombre }}? No se puede deshacer.</p>
                        <div class="actions-cell">
                          <button type="button" class="btn btn-sm btn-danger" @click="eliminarUsuario(usuario)">Sí, eliminar</button>
                          <button type="button" class="btn btn-sm btn-outline" @click="idEliminando = null">Cancelar</button>
                        </div>
                      </template>
                      <!-- Modo normal: editar, activar/inactivar o eliminar -->
                      <div v-else class="actions-cell">
                        <button type="button" class="btn btn-sm btn-outline" @click="editarUsuario(usuario)">Editar</button>
                        <button
                          type="button"
                          :class="['btn', 'btn-sm', usuario.estado === 'Activo' ? 'btn-danger' : 'btn-ok']"
                          @click="cambiarEstado(usuario)"
                        >{{ usuario.estado === 'Activo' ? 'Inactivar' : 'Activar' }}</button>
                        <button type="button" class="btn btn-sm btn-danger" @click="pedirConfirmacionEliminar(usuario)">Eliminar</button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="listaUsuarios.length === 0">
                    <td colspan="5" class="no-data">No hay {{ VISTAS_ADMIN[vistaAdmin].toLowerCase() }} que coincidan con la búsqueda.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Servicios: registrar (HU-05), modificar y eliminar (HU-06), siempre con precio válido (HU-07) -->
          <div v-else-if="vistaAdmin === 'servicios'" class="services-view">
            <form
              class="panel-form"
              novalidate
              @submit.prevent="registrarServicio"
            >
              <h3>Registrar nuevo servicio</h3>

              <p class="hint">
                Completa la información del servicio que ofrece la barbería.
              </p>

              <div class="form-row">
                <CampoForm
                  id="servicio-nombre"
                  label="Nombre del servicio"
                  v-model="formServicio.nombre"
                  :error="erroresServicio.nombre"
                  placeholder="Ej. Corte clásico"
                />

                <CampoForm
                  id="servicio-precio"
                  label="Precio"
                  type="number"
                  v-model="formServicio.precio"
                  :error="erroresServicio.precio"
                  placeholder="Ej. 25000"
                />
              </div>

              <CampoForm
                id="servicio-descripcion"
                label="Descripción"
                v-model="formServicio.descripcion"
                placeholder="Describe brevemente el servicio"
              />

              <CampoForm
                id="servicio-duracion"
                label="Duración en minutos"
                type="number"
                v-model="formServicio.duracion"
                :error="erroresServicio.duracion"
                placeholder="Ej. 30"
              />

              <p
                v-if="mensajeServicio.texto"
                :class="['alert', mensajeServicio.tipo]"
                role="alert"
              >
                {{ mensajeServicio.texto }}
              </p>

              <div class="form-actions">
                <button
                  type="button"
                  class="btn btn-outline"
                  @click="cambiarVistaAdmin('clientes')"
                >
                  Volver a clientes
                </button>

                <button
                  type="submit"
                  class="btn btn-primary"
                  :disabled="enviandoServicio"
                >
                  {{ enviandoServicio ? 'Registrando...' : 'Registrar servicio' }}
                </button>
              </div>
            </form>

            <div class="services-list">
              <h3>Servicios registrados</h3>

              <p v-if="cargandoServicios" class="hint">
                Cargando servicios...
              </p>

              <div v-else class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Descripción</th>
                      <th>Precio</th>
                      <th>Duración</th>
                      <th>Estado</th>
                      <th class="col-actions">Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr
                      v-for="servicio in listaServicios"
                      :key="servicio.id_servicio"
                    >
                      <td data-label="Nombre">
                        <input
                          v-if="estaEditandoServicio(servicio)"
                          type="text"
                          v-model="servicioEditando.nombre"
                          class="table-input"
                        />
                        <span v-else>{{ servicio.nombre }}</span>
                      </td>

                      <td data-label="Descripción">
                        <input
                          v-if="estaEditandoServicio(servicio)"
                          type="text"
                          v-model="servicioEditando.descripcion"
                          class="table-input"
                        />
                        <span v-else>{{ servicio.descripcion || 'Sin descripción' }}</span>
                      </td>

                      <td data-label="Precio">
                        <input
                          v-if="estaEditandoServicio(servicio)"
                          type="number"
                          min="1"
                          v-model="servicioEditando.precio"
                          class="table-input"
                        />
                        <span v-else>
                          ${{ Number(servicio.precio).toLocaleString('es-CO') }}
                        </span>
                      </td>

                      <td data-label="Duración">
                        <input
                          v-if="estaEditandoServicio(servicio)"
                          type="number"
                          min="1"
                          step="1"
                          v-model="servicioEditando.duracion"
                          class="table-input"
                        />
                        <span v-else>{{ servicio.duracion }} minutos</span>
                      </td>

                      <td data-label="Estado">
                        <span :class="['badge', servicio.estado]">
                          {{ servicio.estado }}
                        </span>
                      </td>

                      <td data-label="Acciones" class="col-actions">

                        <!-- Modo edición -->
                        <template v-if="estaEditandoServicio(servicio)">
                          <p
                            v-if="errorEdicionServicio"
                            class="field-error"
                            role="alert"
                          >
                            {{ errorEdicionServicio }}
                          </p>

                          <div class="actions-cell">
                            <button
                              type="button"
                              class="btn btn-sm btn-primary"
                              :disabled="enviandoEdicionServicio"
                              @click="guardarEdicionServicio"
                            >
                              {{ enviandoEdicionServicio ? 'Guardando...' : 'Guardar' }}
                            </button>

                            <button
                              type="button"
                              class="btn btn-sm btn-outline"
                              :disabled="enviandoEdicionServicio"
                              @click="cancelarEdicionServicio"
                            >
                              Cancelar
                            </button>
                          </div>
                        </template>

                        <!-- Confirmación de eliminación -->
                        <template
                          v-else-if="idEliminandoServicio === servicio.id_servicio"
                        >
                          <p class="field-error">
                            ¿Eliminar "{{ servicio.nombre }}" definitivamente?
                          </p>

                          <div class="actions-cell">
                            <button
                              type="button"
                              class="btn btn-sm btn-danger"
                              @click="eliminarServicioAdmin(servicio)"
                            >
                              Sí, eliminar
                            </button>

                            <button
                              type="button"
                              class="btn btn-sm btn-outline"
                              @click="idEliminandoServicio = null"
                            >
                              Cancelar
                            </button>
                          </div>
                        </template>

                        <!-- Modo normal -->
                        <div v-else class="actions-cell">
                          <button
                            type="button"
                            class="btn btn-sm btn-outline"
                            @click="editarServicio(servicio)"
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            class="btn btn-sm btn-danger"
                            @click="pedirConfirmacionEliminarServicio(servicio)"
                          >
                            Eliminar
                          </button>
                        </div>

                      </td>
                    </tr>

                    <tr v-if="listaServicios.length === 0">
                      <td colspan="6" class="no-data">
                        No hay servicios registrados.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <!-- Horarios de los barberos (HU-09): jornadas semanales que no se pueden superponer -->
          <div v-else class="services-view">
            <form
              class="panel-form"
              novalidate
              @submit.prevent="registrarHorario"
            >
              <h3>Asignar horario a un barbero</h3>

              <p class="hint">
                Los horarios se repiten cada semana. Un barbero no puede tener dos horarios que se crucen el mismo día.
              </p>

              <p v-if="!cargandoHorarios && listaBarberos.length === 0" class="hint">
                No hay barberos activos. Crea uno primero en la pestaña Barberos.
              </p>

              <div class="form-row">
                <div class="field-select">
                  <label for="horario-barbero">Barbero</label>
                  <select
                    id="horario-barbero"
                    v-model="formHorario.id_barbero"
                    class="select-input"
                    :class="{ invalid: erroresHorario.id_barbero }"
                  >
                    <option value="">Selecciona un barbero</option>
                    <option
                      v-for="barbero in listaBarberos"
                      :key="barbero.id_usuario"
                      :value="barbero.id_usuario"
                    >
                      {{ barbero.nombre }}
                    </option>
                  </select>
                  <p v-if="erroresHorario.id_barbero" class="field-error" role="alert">{{ erroresHorario.id_barbero }}</p>
                </div>

                <div class="field-select">
                  <label for="horario-dia">Día de la semana</label>
                  <select
                    id="horario-dia"
                    v-model="formHorario.dia_semana"
                    class="select-input"
                    :class="{ invalid: erroresHorario.dia_semana }"
                  >
                    <option value="">Selecciona un día</option>
                    <option
                      v-for="dia in DIAS_SEMANA"
                      :key="dia.numero"
                      :value="dia.numero"
                    >
                      {{ dia.nombre }}
                    </option>
                  </select>
                  <p v-if="erroresHorario.dia_semana" class="field-error" role="alert">{{ erroresHorario.dia_semana }}</p>
                </div>
              </div>

              <div class="form-row">
                <CampoForm
                  id="horario-inicio"
                  label="Hora de inicio"
                  type="time"
                  v-model="formHorario.hora_inicio"
                  :error="erroresHorario.hora_inicio"
                />

                <CampoForm
                  id="horario-fin"
                  label="Hora de fin"
                  type="time"
                  v-model="formHorario.hora_fin"
                  :error="erroresHorario.hora_fin"
                />
              </div>

              <p
                v-if="mensajeHorario.texto"
                :class="['alert', mensajeHorario.tipo]"
                role="alert"
              >
                {{ mensajeHorario.texto }}
              </p>

              <div class="form-actions">
                <button
                  type="button"
                  class="btn btn-outline"
                  @click="cambiarVistaAdmin('clientes')"
                >
                  Volver a clientes
                </button>

                <button
                  type="submit"
                  class="btn btn-primary"
                  :disabled="enviandoHorario"
                >
                  {{ enviandoHorario ? 'Asignando...' : 'Asignar horario' }}
                </button>
              </div>
            </form>

            <div class="services-list">
              <h3>Horarios asignados</h3>

              <p v-if="cargandoHorarios" class="hint">
                Cargando horarios...
              </p>

              <div v-else class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Barbero</th>
                      <th>Día</th>
                      <th>Inicio</th>
                      <th>Fin</th>
                      <th class="col-actions">Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr
                      v-for="horario in listaHorarios"
                      :key="horario.id_horario"
                    >
                      <td data-label="Barbero">{{ horario.barbero }}</td>

                      <td data-label="Día">
                        <select
                          v-if="estaEditandoHorario(horario)"
                          v-model="horarioEditando.dia_semana"
                          class="table-input"
                        >
                          <option
                            v-for="dia in DIAS_SEMANA"
                            :key="dia.numero"
                            :value="dia.numero"
                          >
                            {{ dia.nombre }}
                          </option>
                        </select>
                        <span v-else>{{ nombreDia(horario.dia_semana) }}</span>
                      </td>

                      <td data-label="Inicio">
                        <input
                          v-if="estaEditandoHorario(horario)"
                          type="time"
                          v-model="horarioEditando.hora_inicio"
                          class="table-input"
                        />
                        <span v-else>{{ horario.hora_inicio }}</span>
                      </td>

                      <td data-label="Fin">
                        <input
                          v-if="estaEditandoHorario(horario)"
                          type="time"
                          v-model="horarioEditando.hora_fin"
                          class="table-input"
                        />
                        <span v-else>{{ horario.hora_fin }}</span>
                      </td>

                      <td data-label="Acciones" class="col-actions">

                        <!-- Modo edición -->
                        <template v-if="estaEditandoHorario(horario)">
                          <p
                            v-if="errorEdicionHorario"
                            class="field-error"
                            role="alert"
                          >
                            {{ errorEdicionHorario }}
                          </p>

                          <div class="actions-cell">
                            <button
                              type="button"
                              class="btn btn-sm btn-primary"
                              :disabled="enviandoEdicionHorario"
                              @click="guardarEdicionHorario"
                            >
                              {{ enviandoEdicionHorario ? 'Guardando...' : 'Guardar' }}
                            </button>

                            <button
                              type="button"
                              class="btn btn-sm btn-outline"
                              :disabled="enviandoEdicionHorario"
                              @click="cancelarEdicionHorario"
                            >
                              Cancelar
                            </button>
                          </div>
                        </template>

                        <!-- Confirmación de eliminación -->
                        <template
                          v-else-if="idEliminandoHorario === horario.id_horario"
                        >
                          <p class="field-error">
                            ¿Eliminar el horario de {{ horario.barbero }} del {{ nombreDia(horario.dia_semana).toLowerCase() }}?
                          </p>

                          <div class="actions-cell">
                            <button
                              type="button"
                              class="btn btn-sm btn-danger"
                              @click="eliminarHorarioAdmin(horario)"
                            >
                              Sí, eliminar
                            </button>

                            <button
                              type="button"
                              class="btn btn-sm btn-outline"
                              @click="idEliminandoHorario = null"
                            >
                              Cancelar
                            </button>
                          </div>
                        </template>

                        <!-- Modo normal -->
                        <div v-else class="actions-cell">
                          <button
                            type="button"
                            class="btn btn-sm btn-outline"
                            @click="editarHorario(horario)"
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            class="btn btn-sm btn-danger"
                            @click="pedirConfirmacionEliminarHorario(horario)"
                          >
                            Eliminar
                          </button>
                        </div>

                      </td>
                    </tr>

                    <tr v-if="listaHorarios.length === 0">
                      <td colspan="5" class="no-data">
                        No hay horarios asignados.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import CampoForm from './components/CampoForm.vue';
import { ClienteController, validarLogin, validarRegistro } from './controllers/ClienteController.js';
import { ServicioController, validarServicio } from './controllers/ServicioController.js';
import { HorarioController, validarHorario, DIAS_SEMANA, nombreDia } from './controllers/HorarioController.js';
import { HorarioController, validarHorario, DIAS_SEMANA, nombreDia } from './controllers/HorarioController.js';
import DisponibilidadCliente from './components/DisponibilidadCliente.vue';

// Los controladores son los únicos que hablan con el backend.
// Sus métodos devuelven el dato pedido, o un texto "Error: ..." si algo falló.
const controlador = new ClienteController();
const servicioController = new ServicioController();
const horarioController = new HorarioController();

// =====================================================
// UTILIDADES
// =====================================================

const MENSAJE_VACIO = { tipo: '', texto: '' };

// Vistas del panel de administrador: clave interna -> título visible
const VISTAS_ADMIN = { clientes: 'Clientes', barberos: 'Barberos', servicios: 'Servicios', horarios: 'Horarios' };

// Formulario de usuario en blanco (lo usan el registro y el panel de administrador)
const formVacio = () => ({ nombre: '', telefono: '', correo: '', password: '', confirmarPassword: '' });

// Formulario de servicio en blanco
const servicioVacio = () => ({ nombre: '', descripcion: '', precio: '', duracion: '' });
// Formulario de horario en blanco
const horarioVacio = () => ({ id_barbero: '', dia_semana: '', hora_inicio: '', hora_fin: '' });

// El controlador avisa los errores con un texto que empieza por "Error:".
const esError = (respuesta) => typeof respuesta === 'string';
const quitarPrefijoError = (texto) => texto.replace(/^Error:\s*/, '');

const hayErrores = (errores) => Object.keys(errores).length > 0;

// Convierte el error que devolvió el servidor en un objeto de errores por campo.
// Si el texto habla del correo o del teléfono, aparece debajo de ese campo;
// en cualquier otro caso va en "general" (se muestra encima del botón).
const errorDelServidor = (respuesta) => {
  const texto = quitarPrefijoError(respuesta);
  if (/correo/i.test(texto)) return { correo: texto };
  if (/tel[eé]fono/i.test(texto)) return { telefono: texto };
  return { general: texto };
};

// Valida el formulario de un usuario nuevo: reglas del controlador + confirmación de contraseña
const validarFormularioCliente = (f) => {
  const errores = validarRegistro(f);

  if (!f.confirmarPassword) {
    errores.confirmarPassword = 'Escribe de nuevo la contraseña para confirmarla.';
  } else if (f.password !== f.confirmarPassword) {
    errores.confirmarPassword = 'Las contraseñas no coinciden.';
  }

  return errores;
};

// =====================================================
// ESTADO
// =====================================================

// --- Sesión ---
const usuarioLogueado = ref(null);
const rolActivo = computed(() => usuarioLogueado.value?.rol);
const esAdministradorReal = computed(() => usuarioLogueado.value?.rol === 'Administrador');

// --- Autenticación (login / registro) ---
const vistaAuth = ref('login');                // 'login' | 'registro'
const formAuth = ref({ correo: '', password: '' });   // "correo" admite correo o teléfono
const formRegistro = ref(formVacio());
const errores = ref({});                       // Errores del formulario visible: { campo: 'texto' } (+ "general")
const mensajeExito = ref('');                  // Aviso de éxito mostrado en el login
const enviando = ref(false);                   // Evita envíos dobles mientras se espera al servidor

// --- Panel de administrador ---
const vistaAdmin = ref('clientes');            // 'clientes' | 'barberos' | 'servicios'

// --- Usuarios del panel (vistas Clientes y Barberos, HU-08) ---
const rolGestionado = computed(() => (vistaAdmin.value === 'barberos' ? 'Barbero' : 'Cliente'));
const nombreRol = computed(() => rolGestionado.value.toLowerCase());   // Para los textos: "cliente" o "barbero"
const listaUsuarios = ref([]);
const criterioBusqueda = ref('');
const usuarioEditando = ref(null);             // Copia del usuario que se está editando en la tabla
const errorEdicion = ref('');                  // Error mostrado bajo la fila que se está editando
const idEliminando = ref(null);                // id del usuario que espera confirmación para eliminarse
const formNuevo = ref(formVacio());
const erroresNuevo = ref({});                  // Errores del formulario "Nuevo cliente / barbero"
const mostrarFormNuevo = ref(false);
const enviandoAdmin = ref(false);
const mensajeAdmin = ref({ ...MENSAJE_VACIO });   // Avisos generales del panel (éxito, o error al buscar / cambiar estado)

// --- Servicios (HU-05, HU-06, HU-07) ---
const formServicio = ref(servicioVacio());
const listaServicios = ref([]);
const cargandoServicios = ref(false);
const servicioEditando = ref(null);            // Copia del servicio que se está editando en la tabla
const errorEdicionServicio = ref('');
const idEliminandoServicio = ref(null);
const enviandoEdicionServicio = ref(false);
const erroresServicio = ref({});
const enviandoServicio = ref(false);
const mensajeServicio = ref({ ...MENSAJE_VACIO });

// --- Horarios de los barberos (HU-09) ---
// Clientes y Barberos comparten la vista de usuarios; Servicios y Horarios tienen la suya
const esVistaUsuarios = computed(() => vistaAdmin.value === 'clientes' || vistaAdmin.value === 'barberos');
const formHorario = ref(horarioVacio());
const listaHorarios = ref([]);
const listaBarberos = ref([]);                 // Barberos activos: llenan el desplegable del formulario
const cargandoHorarios = ref(false);
const horarioEditando = ref(null);             // Copia del horario que se está editando en la tabla
const errorEdicionHorario = ref('');
const idEliminandoHorario = ref(null);
const enviandoEdicionHorario = ref(false);
const erroresHorario = ref({});
const enviandoHorario = ref(false);
const mensajeHorario = ref({ ...MENSAJE_VACIO });

// =====================================================
// AUTENTICACIÓN
// =====================================================

// Cambia entre las pestañas "Iniciar sesión" y "Crear cuenta"
const cambiarVista = (vista) => {
  vistaAuth.value = vista;
  errores.value = {};
  mensajeExito.value = '';
};

// Inicia sesión con correo o teléfono + contraseña
const login = async () => {
  mensajeExito.value = '';
  errores.value = validarLogin(formAuth.value);
  if (hayErrores(errores.value)) return;   // Los errores ya quedaron bajo cada campo

  enviando.value = true;
  const respuesta = await controlador.iniciarSesion(formAuth.value);
  enviando.value = false;

  if (esError(respuesta)) {
    // Credenciales incorrectas, cuenta inactiva, sin conexión...: se muestra encima del botón
    errores.value = { general: quitarPrefijoError(respuesta) };
    return;
  }

  usuarioLogueado.value = respuesta;
  errores.value = {};
  formAuth.value = { correo: '', password: '' };

  // Solo el administrador necesita el panel (empieza en la vista Clientes)
  if (esAdministradorReal.value) {
    await buscarUsuarios();
  }
};

// Cierra la sesión y limpia todo lo relacionado con el usuario
const logout = () => {
  controlador.cerrarSesion();

  usuarioLogueado.value = null;
  errores.value = {};
  mensajeExito.value = '';
  vistaAdmin.value = 'clientes';   // El próximo administrador empieza en Clientes
  reiniciarPanelAdmin();
};

// =====================================================
// PANEL DE ADMINISTRADOR: cambio de vista
// =====================================================

// Deja el panel limpio: sin listas, formularios, ediciones, confirmaciones ni avisos pendientes
const reiniciarPanelAdmin = () => {
  clearTimeout(temporizadorBusqueda);

  listaUsuarios.value = [];
  criterioBusqueda.value = '';
  usuarioEditando.value = null;
  errorEdicion.value = '';
  idEliminando.value = null;
  mostrarFormNuevo.value = false;
  mensajeAdmin.value = { ...MENSAJE_VACIO };

  formServicio.value = servicioVacio();
  erroresServicio.value = {};
  listaServicios.value = [];
  servicioEditando.value = null;
  errorEdicionServicio.value = '';
  idEliminandoServicio.value = null;
  mensajeServicio.value = { ...MENSAJE_VACIO };
  
  formHorario.value = horarioVacio();
  erroresHorario.value = {};
  listaHorarios.value = [];
  listaBarberos.value = [];
  horarioEditando.value = null;
  errorEdicionHorario.value = '';
  idEliminandoHorario.value = null;
  mensajeHorario.value = { ...MENSAJE_VACIO };
};

// Cambia entre Clientes, Barberos y Servicios, y carga los datos de la vista elegida
const cambiarVistaAdmin = async (vista) => {
  if (vista === vistaAdmin.value) return;

  vistaAdmin.value = vista;
  reiniciarPanelAdmin();

  if (vista === 'servicios') {
    await buscarServicios();
  } else if (vista === 'horarios') {
    await cargarVistaHorarios();
  } else {
    await buscarUsuarios();
  }
};

// =====================================================
// CREACIÓN DE USUARIOS (registro público y panel de administrador)
// =====================================================

// Valida y envía un formulario de usuario. Lo comparten el registro y el panel de administrador.
// Sin "rol" se usa el registro público (siempre crea un Cliente); el administrador sí indica el rol.
// Devuelve { usuario } si se creó, o { errores } con los mensajes por campo.
const enviarNuevoUsuario = async (f, rol) => {
  const erroresForm = validarFormularioCliente(f);
  if (hayErrores(erroresForm)) return { errores: erroresForm };

  // Solo se envían los datos personales: el estado lo asigna el backend
  const datos = {
    nombre: f.nombre.trim(),
    telefono: f.telefono.trim(),
    correo: f.correo.trim(),
    password: f.password
  };

  const respuesta = rol
    ? await controlador.crearUsuario({ ...datos, rol })
    : await controlador.crearCliente(datos);

  if (esError(respuesta)) return { errores: errorDelServidor(respuesta) };
  return { usuario: respuesta };
};

// Registro público: crea la cuenta y lleva al usuario a la pestaña de login
const registrarse = async () => {
  enviando.value = true;
  errores.value = {};

  const resultado = await enviarNuevoUsuario(formRegistro.value);
  enviando.value = false;

  if (resultado.errores) {
    errores.value = resultado.errores;
    return;
  }

  formRegistro.value = formVacio();
  vistaAuth.value = 'login';
  mensajeExito.value = 'Cuenta creada correctamente. Ya puedes iniciar sesión.';
};

// Muestra u oculta el formulario "Nuevo cliente / barbero" (siempre lo deja limpio)
const alternarFormNuevo = () => {
  mostrarFormNuevo.value = !mostrarFormNuevo.value;
  formNuevo.value = formVacio();
  erroresNuevo.value = {};
  mensajeAdmin.value = { ...MENSAJE_VACIO };
};

// El administrador crea un cliente o un barbero (según la vista) con las mismas validaciones del registro
const crearUsuarioAdmin = async () => {
  enviandoAdmin.value = true;
  erroresNuevo.value = {};
  mensajeAdmin.value = { ...MENSAJE_VACIO };

  const { usuario, errores: erroresForm } = await enviarNuevoUsuario(formNuevo.value, rolGestionado.value);
  enviandoAdmin.value = false;

  if (erroresForm) {
    erroresNuevo.value = erroresForm;
    return;
  }

  formNuevo.value = formVacio();
  mostrarFormNuevo.value = false;
  mensajeAdmin.value = { tipo: 'exito', texto: `${rolGestionado.value} "${usuario.nombre}" creado correctamente.` };
  await buscarUsuarios();
};

// =====================================================
// PANEL DE ADMINISTRADOR: SERVICIOS (HU-05, HU-06, HU-07)
// =====================================================

// HU-05: registra un servicio.
// HU-07: si falta el precio (o no es válido) no se envía y el error aparece bajo el campo.
const registrarServicio = async () => {
  mensajeServicio.value = { ...MENSAJE_VACIO };
  erroresServicio.value = validarServicio(formServicio.value);
  if (hayErrores(erroresServicio.value)) return;

  enviandoServicio.value = true;
  const resultado = await servicioController.registrarServicio(formServicio.value);
  enviandoServicio.value = false;

  if (esError(resultado)) {
    mensajeServicio.value = { tipo: 'error', texto: quitarPrefijoError(resultado) };
    return;
  }

  formServicio.value = servicioVacio();
  mensajeServicio.value = { tipo: 'exito', texto: `¡Servicio "${resultado.nombre}" registrado correctamente!` };
  await buscarServicios();
};

const buscarServicios = async () => {
  cargandoServicios.value = true;
  const resultado = await servicioController.buscarServicios();
  cargandoServicios.value = false;

  if (esError(resultado)) {
    mensajeServicio.value = { tipo: 'error', texto: quitarPrefijoError(resultado) };
    return;
  }

  listaServicios.value = resultado;
};

// ¿Es esta la fila de servicio que se está editando?
const estaEditandoServicio = (servicio) => servicioEditando.value?.id_servicio === servicio.id_servicio;

// HU-06: pone la fila en modo edición (sobre una copia, así "Cancelar" no deja cambios)
const editarServicio = (servicio) => {
  servicioEditando.value = {
    id_servicio: servicio.id_servicio,
    nombre: servicio.nombre,
    descripcion: servicio.descripcion || '',
    precio: Number(servicio.precio),   // La base de datos lo devuelve como "25000.00"
    duracion: servicio.duracion
  };

  errorEdicionServicio.value = '';
  idEliminandoServicio.value = null;
};

const cancelarEdicionServicio = () => {
  servicioEditando.value = null;
  errorEdicionServicio.value = '';
};

// HU-06 y HU-07: guarda los cambios solo si el servicio sigue teniendo un precio válido
const guardarEdicionServicio = async () => {
  if (enviandoEdicionServicio.value) return;

  const erroresFila = validarServicio(servicioEditando.value);
  if (hayErrores(erroresFila)) {
    errorEdicionServicio.value = Object.values(erroresFila)[0];
    return;
  }

  enviandoEdicionServicio.value = true;
  const resultado = await servicioController.actualizarServicio(
    servicioEditando.value.id_servicio,
    servicioEditando.value
  );
  enviandoEdicionServicio.value = false;

  if (esError(resultado)) {
    errorEdicionServicio.value = quitarPrefijoError(resultado);
    return;
  }

  cancelarEdicionServicio();
  mensajeServicio.value = { tipo: 'exito', texto: 'Servicio actualizado correctamente.' };
  await buscarServicios();
};

const pedirConfirmacionEliminarServicio = (servicio) => {
  servicioEditando.value = null;
  idEliminandoServicio.value = servicio.id_servicio;
};

// HU-06: elimina el servicio. Si ya tiene registros asociados (citas), el backend lo rechaza.
const eliminarServicioAdmin = async (servicio) => {
  const resultado = await servicioController.eliminarServicio(servicio.id_servicio);
  idEliminandoServicio.value = null;

  if (esError(resultado)) {
    mensajeServicio.value = { tipo: 'error', texto: quitarPrefijoError(resultado) };
    return;
  }

  mensajeServicio.value = { tipo: 'exito', texto: `Servicio "${servicio.nombre}" eliminado correctamente.` };
  await buscarServicios();
};

// =====================================================
// PANEL DE ADMINISTRADOR: HORARIOS DE LOS BARBEROS (HU-09)
// =====================================================

// Pide al backend los horarios de todos los barberos
const buscarHorarios = async () => {
  const resultado = await horarioController.buscarHorarios();

  if (esError(resultado)) {
    mensajeHorario.value = { tipo: 'error', texto: quitarPrefijoError(resultado) };
    return;
  }

  listaHorarios.value = resultado;
};

// Pide los barberos activos: son los que se pueden elegir en el formulario
const cargarBarberos = async () => {
  const resultado = await controlador.buscarUsuarios('', 'Barbero');

  if (esError(resultado)) {
    mensajeHorario.value = { tipo: 'error', texto: quitarPrefijoError(resultado) };
    return;
  }

  listaBarberos.value = resultado.filter((barbero) => barbero.estado === 'Activo');
};

// Carga todo lo que necesita la pestaña Horarios al abrirla
const cargarVistaHorarios = async () => {
  cargandoHorarios.value = true;
  await Promise.all([buscarHorarios(), cargarBarberos()]);
  cargandoHorarios.value = false;
};

// HU-09: asigna un horario a un barbero.
// Si se cruza con otro horario del mismo barbero el backend lo rechaza y se muestra el aviso.
const registrarHorario = async () => {
  mensajeHorario.value = { ...MENSAJE_VACIO };
  erroresHorario.value = validarHorario(formHorario.value);
  if (hayErrores(erroresHorario.value)) return;

  enviandoHorario.value = true;
  const resultado = await horarioController.asignarHorario(formHorario.value);
  enviandoHorario.value = false;

  if (esError(resultado)) {
    mensajeHorario.value = { tipo: 'error', texto: quitarPrefijoError(resultado) };
    return;
  }

  formHorario.value = horarioVacio();
  mensajeHorario.value = { tipo: 'exito', texto: `Horario del ${nombreDia(resultado.dia_semana).toLowerCase()} asignado correctamente.` };
  await buscarHorarios();
};

// ¿Es esta la fila de horario que se está editando?
const estaEditandoHorario = (horario) => horarioEditando.value?.id_horario === horario.id_horario;

// Pone la fila en modo edición (sobre una copia, así "Cancelar" no deja cambios)
const editarHorario = (horario) => {
  horarioEditando.value = { ...horario };
  errorEdicionHorario.value = '';
  idEliminandoHorario.value = null;
  mensajeHorario.value = { ...MENSAJE_VACIO };
};

const cancelarEdicionHorario = () => {
  horarioEditando.value = null;
  errorEdicionHorario.value = '';
};

// Guarda los cambios de la fila. Si algo falla (por ejemplo, se cruza con otro horario),
// el error aparece debajo de la fila que se está editando.
const guardarEdicionHorario = async () => {
  if (enviandoEdicionHorario.value) return;

  const erroresFila = validarHorario(horarioEditando.value);
  if (hayErrores(erroresFila)) {
    errorEdicionHorario.value = Object.values(erroresFila)[0];
    return;
  }

  enviandoEdicionHorario.value = true;
  const resultado = await horarioController.actualizarHorario(
    horarioEditando.value.id_horario,
    horarioEditando.value
  );
  enviandoEdicionHorario.value = false;

  if (esError(resultado)) {
    errorEdicionHorario.value = quitarPrefijoError(resultado);
    return;
  }

  cancelarEdicionHorario();
  mensajeHorario.value = { tipo: 'exito', texto: 'Horario actualizado correctamente.' };
  await buscarHorarios();
};

// Primer paso para eliminar: muestra "¿Eliminar?" en la fila del horario
const pedirConfirmacionEliminarHorario = (horario) => {
  horarioEditando.value = null;
  idEliminandoHorario.value = horario.id_horario;
  mensajeHorario.value = { ...MENSAJE_VACIO };
};

// Segundo paso: elimina el horario
const eliminarHorarioAdmin = async (horario) => {
  const resultado = await horarioController.eliminarHorario(horario.id_horario);
  idEliminandoHorario.value = null;

  if (esError(resultado)) {
    mensajeHorario.value = { tipo: 'error', texto: quitarPrefijoError(resultado) };
    return;
  }

  mensajeHorario.value = { tipo: 'exito', texto: 'Horario eliminado correctamente.' };
  await buscarHorarios();
};

// =====================================================
// PANEL DE ADMINISTRADOR: buscar, editar y cambiar estado de clientes y barberos
// =====================================================

// Pide al backend los usuarios de la vista actual que coinciden con el buscador
const buscarUsuarios = async () => {
  const vista = vistaAdmin.value;
  const respuesta = await controlador.buscarUsuarios(criterioBusqueda.value, rolGestionado.value);

  // Si el administrador cambió de vista mientras se esperaba, la respuesta ya no sirve
  if (vista !== vistaAdmin.value) return;

  if (esError(respuesta)) {
    mensajeAdmin.value = { tipo: 'error', texto: quitarPrefijoError(respuesta) };
    return;
  }

  listaUsuarios.value = respuesta;
};

// Busca mientras se escribe, pero espera 300 ms sin teclear para no saturar el servidor
let temporizadorBusqueda;
const buscarConRetraso = () => {
  clearTimeout(temporizadorBusqueda);
  temporizadorBusqueda = setTimeout(buscarUsuarios, 300);
};

// ¿Es esta la fila que se está editando?
const estaEditando = (usuario) => usuarioEditando.value?.id_usuario === usuario.id_usuario;

// Pone una fila en modo edición (trabaja sobre una copia, así "Cancelar" no deja cambios)
const editarUsuario = (usuario) => {
  usuarioEditando.value = { ...usuario };
  errorEdicion.value = '';
  idEliminando.value = null;
  mensajeAdmin.value = { ...MENSAJE_VACIO };
};

const cancelarEdicion = () => {
  usuarioEditando.value = null;
  errorEdicion.value = '';
};

// Guarda el nombre, teléfono y correo editados en la tabla.
// Si algo falla, el error aparece debajo de la fila que se está editando.
const guardarEdicion = async () => {
  // Se reutilizan las reglas del registro (la contraseña no se edita aquí, por eso se completa con una válida)
  const { nombre, telefono, correo } = usuarioEditando.value;
  const erroresFila = validarRegistro({ nombre, telefono: String(telefono ?? ''), correo, password: '123456' });

  if (hayErrores(erroresFila)) {
    errorEdicion.value = Object.values(erroresFila)[0];
    return;
  }

  const respuesta = await controlador.actualizarCliente(usuarioEditando.value);

  if (esError(respuesta)) {
    errorEdicion.value = quitarPrefijoError(respuesta);
    return;
  }

  cancelarEdicion();
  mensajeAdmin.value = { tipo: 'exito', texto: `${rolGestionado.value} actualizado correctamente.` };
  await buscarUsuarios();
};

// Primer paso para eliminar: muestra "¿Eliminar?" en la fila del usuario
const pedirConfirmacionEliminar = (usuario) => {
  idEliminando.value = usuario.id_usuario;
  mensajeAdmin.value = { ...MENSAJE_VACIO };
};

// Segundo paso: elimina al usuario de forma definitiva.
// Si ya tiene registros asociados, el backend lo rechaza y se le sugiere inactivarlo.
const eliminarUsuario = async (usuario) => {
  const respuesta = await controlador.eliminarCliente({ id_usuario: usuario.id_usuario });
  idEliminando.value = null;

  if (esError(respuesta)) {
    mensajeAdmin.value = { tipo: 'error', texto: quitarPrefijoError(respuesta) };
    return;
  }

  mensajeAdmin.value = { tipo: 'exito', texto: `${rolGestionado.value} "${usuario.nombre}" eliminado correctamente.` };
  await buscarUsuarios();
};

// Activa o inactiva un usuario (alternativa a eliminar: conserva sus datos e historial)
const cambiarEstado = async (usuario) => {
  const nuevoEstado = usuario.estado === 'Activo' ? 'Inactivo' : 'Activo';

  const respuesta = await controlador.cambiarEstadoCliente({
    id_usuario: usuario.id_usuario,
    estado: nuevoEstado
  });

  if (esError(respuesta)) {
    mensajeAdmin.value = { tipo: 'error', texto: quitarPrefijoError(respuesta) };
    return;
  }

  mensajeAdmin.value = {
    tipo: 'exito',
    texto: `${rolGestionado.value} ${nuevoEstado === 'Activo' ? 'activado' : 'inactivado'} correctamente.`
  };
  await buscarUsuarios();
};
</script>

<style scoped>
/*
  Estilos de la aplicación — enfoque "mobile first":
  las reglas base están pensadas para celular y los @media del final
  (min-width) agregan lo necesario para tabletas y computadores.
*/

/* ---------- Colores y medidas reutilizables ---------- */
.app {
  --bg: #f6f1e9;           /* crema (fondo general) */
  --surface: #fffdf9;      /* fondo de tarjetas */
  --ink: #1f1d1b;          /* carbón (encabezado y títulos) */
  --text: #2b2825;
  --muted: #7a7268;
  --line: #e6dccd;         /* bordes suaves */
  --sand: #f7f1e7;         /* fondo de pestañas, encabezado de tabla */
  --gold: #b08d57;
  --red: #a4262c;          /* rojo poste de barbero (acción principal) */
  --red-dark: #831c21;
  --green: #1f7a4d;
  --radius: 10px;
  --gap: 16px;
  --serif: Georgia, 'Times New Roman', serif;
  --touch: 44px;           /* alto mínimo cómodo para tocar con el dedo */

  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: 'Segoe UI', system-ui, -apple-system, Roboto, sans-serif;
  line-height: 1.5;
}
.app h1, .app h2, .app h3 { margin: 0; font-family: var(--serif); font-weight: 700; color: var(--ink); }
.app p { margin: 0; }

/* ---------- Encabezado (franja de poste de barbero) ---------- */
.app-header {
  background: var(--ink);
  color: #fff;
  border-top: 6px solid transparent;
  border-image: repeating-linear-gradient(
    135deg, var(--red) 0 14px, #fff 14px 28px, #2c4a8a 28px 42px
  ) 6 0 0 0;
  box-shadow: 0 2px 0 var(--gold);
}
.header-inner {
  display: flex;
  flex-wrap: wrap;               /* en celular la sesión baja a otra línea si no cabe */
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
}
/* Se escribe con .app-header para ganarle a ".app h1" (que pinta los títulos en carbón) */
.app-header .brand { font-size: 1.35rem; letter-spacing: 1px; color: #fff; }

.session-area { position: relative; display: flex; align-items: center; gap: 12px; }
.session-text { display: none; flex-direction: column; text-align: right; line-height: 1.2; }
.session-text small { color: var(--gold); }

/* Menú "Cambiar rol": se ancla al área de sesión para no salirse de la pantalla */
.role-switch summary { display: flex; align-items: center; min-height: var(--touch); cursor: pointer; font-weight: 600; }
.role-switch summary:focus-visible { outline: 2px solid var(--gold); outline-offset: 4px; }
.role-switch-menu {
  position: absolute;
  z-index: 1;
  top: calc(100% + 8px);
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: min(260px, calc(100vw - 32px));
  padding: 16px;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(31, 29, 27, .18);
}

/* ---------- Estructura general ---------- */
.main { padding: 20px 16px; }
.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: 0 2px 8px rgba(31, 29, 27, .04);
  padding: var(--gap);
}

/* ---------- Autenticación ---------- */
.auth-wrap { width: 100%; max-width: 460px; margin: 0 auto; }
.auth-intro { text-align: center; margin-bottom: 16px; }
.auth-intro h2 { margin-bottom: 4px; font-size: 1.5rem; }
.auth-intro p { color: var(--muted); }
.auth-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-top: 3px solid var(--gold);
  border-radius: var(--radius);
  box-shadow: 0 10px 30px rgba(31, 29, 27, .08);
  overflow: hidden;
}

.tabs { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid var(--line); }
.tabs button {
  min-height: var(--touch);
  padding: 12px 8px;
  background: var(--sand);
  border: 0;
  border-bottom: 3px solid transparent;
  font-size: 1rem;
  font-weight: 600;
  color: var(--muted);
  cursor: pointer;
}
.tabs button.active { background: var(--surface); color: var(--ink); border-bottom-color: var(--red); }
.tabs button:focus-visible { outline: 2px solid var(--red); outline-offset: -2px; }

/* ---------- Formularios ---------- */
.form { display: flex; flex-direction: column; gap: 16px; padding: 20px 16px; }
.form h2 { font-size: 1.25rem; }
.form-row { display: grid; grid-template-columns: 1fr; gap: 16px; }   /* 1 columna en celular */

/* Los campos de los formularios están en components/CampoForm.vue.
   Aquí solo se estilan el buscador y los campos de la tabla.
   font-size 16px evita que el iPhone haga zoom automático al tocar un campo */
.search-input,
.table-input,
.select-input {
  width: 100%;
  min-height: var(--touch);
  padding: 10px 12px;
  border: 1px solid #d6cab6;
  border-radius: 8px;
  font-size: 16px;
  background: #fff;
  color: var(--text);
}
.search-input:focus,
.table-input:focus,
.select-input:focus { outline: 2px solid var(--gold); border-color: transparent; }

/* ---------- Botones ---------- */
.btn {
  min-height: var(--touch);
  padding: 10px 16px;
  border: 1px solid transparent;
  border-radius: 8px;
  font-size: .95rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background .15s, color .15s;
}
.btn:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.btn:disabled { opacity: .6; cursor: not-allowed; }
.btn-block { width: 100%; font-size: 1rem; }
.btn-sm { padding: 8px 12px; font-size: .9rem; }

.btn-primary { background: var(--red); color: #fff; }
.btn-primary:hover:not(:disabled) { background: var(--red-dark); }
.btn-outline { background: transparent; border-color: #8f877b; color: inherit; }
.btn-outline:hover:not(:disabled) { background: rgba(176, 141, 87, .15); }
.table-wrap .btn-outline { border-color: #d6cab6; color: var(--ink); }
.btn-danger { background: #fff; border-color: var(--red); color: var(--red); }
.btn-danger:hover { background: var(--red); color: #fff; }
.btn-ok { background: #fff; border-color: var(--green); color: var(--green); }
.btn-ok:hover { background: var(--green); color: #fff; }

/* ---------- Mensajes ---------- */
/* Avisos de éxito (y errores generales del panel) */
.alert { padding: 12px 14px; border-radius: 8px; font-size: .92rem; border: 1px solid transparent; }
.alert.error { background: #f9e7e8; border-color: #e8bcbf; color: var(--red-dark); }
.alert.exito { background: #e1f3ea; border-color: #b6dcc8; color: #17623c; }

/* Errores de validación: texto rojo directamente debajo del campo o encima del botón */
.field-error { font-size: .85rem; line-height: 1.3; color: var(--red-dark); }
.form-error { padding: 10px 12px; font-size: .9rem; color: var(--red-dark); background: #f9e7e8; border-left: 3px solid var(--red); border-radius: 4px; }

/* ---------- Vista de Cliente ---------- */
.client-view { display: flex; flex-direction: column; gap: var(--gap); }
.welcome-card { border-left: 4px solid var(--gold); }
.welcome-card h2 { margin-bottom: 8px; font-size: 1.4rem; }
.grid-2 { display: grid; grid-template-columns: 1fr; gap: var(--gap); }
.muted { color: var(--muted); }
.label { font-size: .85rem; color: var(--muted); }
.value { font-size: 1.1rem; font-weight: 600; color: var(--ink); word-break: break-word; }
.hint { text-align: center; color: var(--muted); }

/* ---------- Panel de Administrador ---------- */
.panel-header { display: flex; flex-direction: column; gap: 12px; margin-bottom: var(--gap); }
.panel-header h2 { font-size: 1.3rem; }
.panel-actions { display: flex; flex-direction: column; gap: 12px; }
.admin-panel > .alert { margin-bottom: var(--gap); }

/* Formularios del panel: nuevo cliente / barbero y nuevo servicio */
.panel-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: var(--gap);
  margin-bottom: var(--gap);
  background: var(--sand);
  border: 1px solid var(--line);
  border-radius: var(--radius);
}
.panel-form h3 { font-size: 1.1rem; }
.form-actions { display: flex; flex-direction: column-reverse; gap: 12px; }

/* ---------- Servicios (HU-05, HU-06, HU-07) ---------- */
.services-list { display: flex; flex-direction: column; gap: 12px; }
.services-list h3 { font-size: 1.1rem; }

/* ---------- Horarios (HU-09) ---------- */
/* Los desplegables del formulario se ven igual que los campos de CampoForm.vue */
.field-select { display: flex; flex-direction: column; gap: 6px; }
.field-select label { font-size: .9rem; font-weight: 600; color: var(--ink); }
.select-input.invalid { border-color: var(--red); background: #fffafa; }
.select-input, select.table-input { font-family: inherit; }

/* ---------- Tablas del panel (clientes, barberos y servicios) ---------- */
/*
  En celular (base) la tabla se convierte en una lista de tarjetas:
  se oculta el encabezado y cada celda muestra su título con data-label.
*/
.data-table, .data-table tbody, .data-table tr, .data-table td { display: block; width: 100%; }
.data-table thead { display: none; }
.data-table tr { padding: 4px 14px; margin-bottom: 12px; border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface); }
.data-table td {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
  text-align: right;
  word-break: break-word;
}
.data-table td:last-child { border-bottom: 0; }
.data-table td::before {
  content: attr(data-label);
  flex-shrink: 0;
  font-size: .8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .5px;
  color: var(--muted);
  text-align: left;
}
.table-input { max-width: 60%; }
.col-actions { flex-direction: column; align-items: stretch !important; }
.col-actions::before { display: none; }
.actions-cell { display: flex; flex-wrap: wrap; gap: 8px; }
.actions-cell .btn { flex: 1; }
.data-table .no-data { display: block; text-align: center; color: var(--muted); padding: 24px 12px; }
.data-table .no-data::before { display: none; }

.badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: .8rem; font-weight: 700; }
.badge.Activo { background: #e1f3ea; color: #17623c; }
.badge.Inactivo { background: #f4e0e1; color: #831c21; }
.badge.preview { background: #efe8da; color: var(--muted); }

/* ---------- Tabletas (≥ 640px) ---------- */
@media (min-width: 640px) {
  .app { --gap: 24px; }
  .header-inner { padding: 14px 24px; }
  .session-text { display: flex; }
  .main { padding: 32px 24px; }
  .auth-intro h2 { font-size: 1.8rem; }
  .form { padding: 32px; }
  .form-row, .grid-2 { grid-template-columns: 1fr 1fr; }
  .form-actions { flex-direction: row; justify-content: flex-end; }
  .panel-header { flex-direction: row; align-items: center; justify-content: space-between; }
  /* flex-wrap: con las tres vistas, el buscador y "+ Nuevo" no caben siempre en una línea */
  .panel-actions { flex-direction: row; flex-wrap: wrap; align-items: center; flex: 1; justify-content: flex-end; }
  .search-input { max-width: 380px; }
  .panel-actions .btn { flex-shrink: 0; }
}

/* ---------- Computador (≥ 900px): la tarjeta vuelve a ser tabla ---------- */
@media (min-width: 900px) {
  .header-inner { padding: 14px 40px; }
  .main { padding: 40px; }

  .table-wrap { overflow-x: auto; }
  .data-table { display: table; table-layout: fixed; border-collapse: collapse; }
  .data-table thead { display: table-header-group; }
  .data-table tbody { display: table-row-group; }
  .data-table tr { display: table-row; padding: 0; margin: 0; border: 0; border-radius: 0; background: none; }
  .data-table th,
  .data-table td { display: table-cell; width: auto; padding: 14px 12px; text-align: left; vertical-align: middle; border-bottom: 1px solid var(--line); }
  .data-table td::before { display: none; }
  .data-table th { font-size: .8rem; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; color: var(--muted); background: var(--sand); }
  .data-table tbody tr:hover { background: #fbf7f0; }
  .data-table td:last-child { border-bottom: 1px solid var(--line); }
  .table-input { max-width: none; }
  .cell-email { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .col-actions { text-align: right !important; width: 30%; }
  .actions-cell { justify-content: flex-end; }
  .actions-cell .btn { flex: none; }
  .btn-sm { padding: 6px 12px; min-height: 0; }
}
</style>
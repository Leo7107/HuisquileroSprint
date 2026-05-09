/**
 * dashboard-paciente.js — HU11: Portal de Autogestión del Paciente
 *
 * Funcionalidades nuevas:
 *   - Ver detalle completo de una cita
 *   - Cancelar cita (PENDIENTE o CONFIRMADA)
 *   - Reprogramar cita (UPDATE fecha/hora, valida duplicado en backend)
 *   - Descargar receta individual en PDF
 *   - Descargar historial clínico completo en PDF
 *   - Descargar diagnósticos en PDF
 *   - Estadísticas dinámicas en el panel inicio
 */

// ─── Autenticación ────────────────────────────────────────────────────────────
const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
if (!usuario || usuario.rol !== 30001) {
  alert('Acceso denegado.');
  window.location.href = '/';
}

if (usuario) {
  const nombre = usuario.nombre || 'Paciente';
  document.getElementById('nombre-paciente').textContent = nombre;
  document.getElementById('usuario-nombre').textContent  = nombre;
  document.getElementById('avatar-inicial').textContent  = nombre[0].toUpperCase();
}

document.getElementById('fecha-actual').textContent =
  new Date().toLocaleDateString('es-SV', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

const token = localStorage.getItem('token');
const H = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

// ─── Estado global de paciente ────────────────────────────────────────────────
let miPaciente    = null;   // objeto paciente con idPaciente
let listaDoctores = [];

// ─── Util: Toast ──────────────────────────────────────────────────────────────
let _toastTimer = null;
function toast(msg, tipo = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = tipo;
  el.style.display = 'block';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.style.display = 'none'; }, 3500);
}

// ─── Util: abrir / cerrar modales ────────────────────────────────────────────
function cerrarModal(id) {
  document.getElementById(id).classList.remove('active');
}

// ─── Navegación SPA ──────────────────────────────────────────────────────────
function nav(seccion, linkEl) {
  document.querySelectorAll('[id^="sec-"]').forEach(s => s.style.display = 'none');
  document.getElementById('sec-' + seccion).style.display = 'block';
  document.querySelectorAll('.nav-item').forEach(a => a.classList.remove('active'));
  if (linkEl) linkEl.classList.add('active');

  if (seccion === 'citas')       cargarCitas();
  if (seccion === 'consultas')   cargarConsultas();
  if (seccion === 'recetas')     cargarRecetas();
  if (seccion === 'documentos')  cargarDocumentos();
  if (seccion === 'perfil')      cargarPerfil();
}

// ─── Obtener idPaciente del paciente logueado ─────────────────────────────────
async function obtenerMiPaciente() {
  if (miPaciente) return miPaciente;
  try {
    const res      = await fetch('/api/pacientes', { headers: H });
    const pacientes = await res.json();
    miPaciente = Array.isArray(pacientes)
      ? pacientes.find(p => p.idUsuario === usuario.id)
      : null;
    return miPaciente;
  } catch { return null; }
}

// ─── Cargar estadísticas del inicio ──────────────────────────────────────────
async function cargarEstadisticas() {
  try {
    const pac = await obtenerMiPaciente();
    if (!pac) return;

    const resCitas  = await fetch(`/api/citas/porpaciente/${pac.idPaciente}`, { headers: H });
    const citas     = await resCitas.json();

    if (Array.isArray(citas)) {
      const activas    = citas.filter(c => ['PENDIENTE','CONFIRMADA'].includes(c.estado)).length;
      const completadas = citas.filter(c => c.estado === 'COMPLETADA').length;
      document.getElementById('stat-proximas').textContent  = activas;
      document.getElementById('stat-consultas').textContent = completadas;
    }

    const resRecetas = await fetch(`/api/recetas/paciente/${pac.idPaciente}`, { headers: H });
    const recetas    = await resRecetas.json();
    if (Array.isArray(recetas))
      document.getElementById('stat-recetas').textContent = recetas.length;

    // Cargar tabla de citas del inicio (3 más próximas activas)
    cargarCitasInicio(Array.isArray(citas) ? citas : []);
  } catch { /* silencioso */ }
}

// ─── Tabla citas en panel inicio ─────────────────────────────────────────────
function cargarCitasInicio(citas) {
  const proximas = citas
    .filter(c => ['PENDIENTE','CONFIRMADA'].includes(c.estado))
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
    .slice(0, 3);

  document.getElementById('tbody-citas-inicio').innerHTML = proximas.length
    ? proximas.map(c => filaCita(c, true)).join('')
    : '<tr><td colspan="5" style="text-align:center;color:var(--text-soft);padding:20px;">No tienes citas próximas</td></tr>';
}

// ─── Badge de estado ─────────────────────────────────────────────────────────
function badgeEstado(estado) {
  const mapa = {
    'CONFIRMADA':   'confirmada',
    'PENDIENTE':    'pendiente',
    'CANCELADA':    'cancelada',
    'COMPLETADA':   'completada',
    'EN_ATENCION':  'en-atencion',
  };
  const cls = mapa[estado] || 'pendiente';
  return `<span class="badge badge--${cls}">${estado}</span>`;
}

// ─── Fila de cita reutilizable ────────────────────────────────────────────────
function filaCita(c, compact = false) {
  const esCancelable   = ['PENDIENTE','CONFIRMADA'].includes(c.estado);
  const esReprogramable = esCancelable;
  const fechaStr = c.fecha ? c.fecha.split('T')[0] : '—';
  const horaStr  = c.hora  ? c.hora.substring(0,5)  : '—';
  const doctor   = c.NombreDoctor ? `${c.NombreDoctor} ${c.ApellidosDoctor}` : `#${c.idDoctor}`;

  const acciones = `
    <div class="action-icons">
      <button class="icon-btn icon-btn--edit" title="Ver detalle"
        onclick="verDetalleCita(${c.idCita})">🔍</button>
      ${esReprogramable ? `<button class="icon-btn icon-btn--toggle" title="Reprogramar"
        onclick="abrirReprogramar(${c.idCita}, '${fechaStr}', '${horaStr}', '${doctor.replace(/'/g,"\\'")}', ${c.idDoctor})">📅</button>` : ''}
      ${esCancelable ? `<button class="icon-btn icon-btn--cancel" title="Cancelar cita"
        onclick="abrirCancelar(${c.idCita}, '${fechaStr}', '${horaStr}')">✕</button>` : ''}
    </div>`;

  if (compact) {
    return `<tr>
      <td>${fechaStr}</td>
      <td>${horaStr}</td>
      <td>${doctor}</td>
      <td>${badgeEstado(c.estado)}</td>
      <td>${acciones}</td>
    </tr>`;
  }

  return `<tr>
    <td>#${c.idCita}</td>
    <td>${fechaStr}</td>
    <td>${horaStr}</td>
    <td>${doctor}</td>
    <td>${c.motivo || '—'}</td>
    <td>${badgeEstado(c.estado)}</td>
    <td>${acciones}</td>
  </tr>`;
}

// ─── Cargar tabla Mis Citas ───────────────────────────────────────────────────
async function cargarCitas() {
  const pac = await obtenerMiPaciente();
  if (!pac) {
    document.getElementById('tbody-citas').innerHTML =
      '<tr><td colspan="7" style="text-align:center;color:#c03030;padding:20px;">No se encontró tu registro de paciente</td></tr>';
    return;
  }
  try {
    const res  = await fetch(`/api/citas/porpaciente/${pac.idPaciente}`, { headers: H });
    const data = await res.json();
    document.getElementById('tbody-citas').innerHTML = Array.isArray(data) && data.length
      ? data.map(c => filaCita(c, false)).join('')
      : '<tr><td colspan="7" style="text-align:center;color:var(--text-soft);padding:20px;">No tienes citas registradas</td></tr>';
  } catch {
    document.getElementById('tbody-citas').innerHTML =
      '<tr><td colspan="7" style="text-align:center;color:#c03030;padding:20px;">Error al cargar citas</td></tr>';
  }
}

// ─── VER DETALLE DE CITA ──────────────────────────────────────────────────────
async function verDetalleCita(idCita) {
  try {
    const res  = await fetch(`/api/citas/${idCita}`, { headers: H });
    const c    = await res.json();

    if (!c || c.error) { toast('No se pudo cargar el detalle', 'error'); return; }

    const fechaStr = c.fecha ? c.fecha.split('T')[0] : '—';
    const horaStr  = c.hora  ? c.hora.substring(0,5)  : '—';

    document.getElementById('detalle-contenido').innerHTML = `
      <div class="detalle-item">
        <div class="detalle-item__label">Número de Cita</div>
        <div class="detalle-item__value">#${c.idCita}</div>
      </div>
      <div class="detalle-item">
        <div class="detalle-item__label">Estado</div>
        <div class="detalle-item__value">${badgeEstado(c.estado)}</div>
      </div>
      <div class="detalle-item">
        <div class="detalle-item__label">Fecha</div>
        <div class="detalle-item__value">${fechaStr}</div>
      </div>
      <div class="detalle-item">
        <div class="detalle-item__label">Hora</div>
        <div class="detalle-item__value">${horaStr}</div>
      </div>
      <div class="detalle-item">
        <div class="detalle-item__label">Doctor</div>
        <div class="detalle-item__value">
          ${c.NombreDoctor ? `Dr/Dra. ${c.NombreDoctor} ${c.ApellidosDoctor}` : `#${c.idDoctor}`}
        </div>
      </div>
      <div class="detalle-item">
        <div class="detalle-item__label">Especialidad</div>
        <div class="detalle-item__value">${c.Especialidad || '—'}</div>
      </div>
      <div class="detalle-item detalle-item--full">
        <div class="detalle-item__label">Motivo de la Cita</div>
        <div class="detalle-item__value" style="font-size:13px;font-weight:400;">${c.motivo || '—'}</div>
      </div>
    `;

    document.getElementById('modal-detalle').classList.add('active');
  } catch {
    toast('Error al cargar el detalle de la cita', 'error');
  }
}

// ─── CANCELAR CITA ────────────────────────────────────────────────────────────
function abrirCancelar(idCita, fecha, hora) {
  document.getElementById('cancelar-id-cita').value = idCita;
  document.getElementById('cancelar-info').textContent = `${fecha} a las ${hora}`;
  document.getElementById('modal-cancelar').classList.add('active');
}

async function confirmarCancelacion() {
  const idCita = parseInt(document.getElementById('cancelar-id-cita').value);
  const pac    = await obtenerMiPaciente();
  if (!pac) { toast('No se encontró tu registro de paciente', 'error'); return; }

  try {
    const res  = await fetch(`/api/citas/${idCita}/cancelar`, {
      method: 'PATCH',
      headers: H,
      body: JSON.stringify({ idPaciente: pac.idPaciente })
    });
    const data = await res.json();

    if (res.status === 409 || data.error) {
      toast('⚠️ ' + data.error, 'warning');
    } else {
      cerrarModal('modal-cancelar');
      toast('✅ Cita cancelada correctamente');
      cargarCitas();
      cargarEstadisticas();
    }
  } catch {
    toast('Error de conexión', 'error');
  }
}

// ─── REPROGRAMAR CITA ─────────────────────────────────────────────────────────
let _reprogramarIdCita = null;

function abrirReprogramar(idCita, fechaActual, horaActual, doctorNombre, idDoctor) {
  _reprogramarIdCita = idCita;

  // Reutilizar el modal de cita en modo "reprogramar"
  document.getElementById('modal-cita-titulo').textContent = `Reprogramar Cita #${idCita}`;
  document.getElementById('btn-guardar-cita').textContent  = 'Reprogramar';
  document.getElementById('cita-fecha').value        = fechaActual;
  document.getElementById('cita-hora').value         = horaActual;
  document.getElementById('cita-motivo').value       = '';
  document.getElementById('cita-doctor').value       = idDoctor;
  document.getElementById('cita-doctor-nombre').value = doctorNombre;

  // En modo reprogramar: ocultar campo doctor y motivo (no cambian)
  document.getElementById('doctor-wrap').style.display = 'none';
  document.getElementById('motivo-wrap').style.display  = 'none';
  document.getElementById('horario-info').style.display = 'none';

  document.getElementById('modal-cita').classList.add('active');
}

// ─── MODAL NUEVA CITA ─────────────────────────────────────────────────────────
function abrirModalCita() {
  _reprogramarIdCita = null;

  document.getElementById('modal-cita-titulo').textContent = 'Solicitar Nueva Cita';
  document.getElementById('btn-guardar-cita').textContent  = 'Guardar';
  document.getElementById('cita-fecha').value         = '';
  document.getElementById('cita-hora').value          = '';
  document.getElementById('cita-doctor').value        = '';
  document.getElementById('cita-doctor-nombre').value = '';
  document.getElementById('cita-motivo').value        = '';

  document.getElementById('doctor-wrap').style.display = '';
  document.getElementById('motivo-wrap').style.display  = '';
  document.getElementById('horario-info').style.display = 'none';
  document.getElementById('sugerencias-doctor').style.display = 'none';

  document.getElementById('modal-cita').classList.add('active');
}

function cerrarModalCita() {
  document.getElementById('modal-cita').classList.remove('active');
  _reprogramarIdCita = null;
}

// ─── Guardar: nueva cita O reprogramar ───────────────────────────────────────
async function guardarCitaModal() {
  if (_reprogramarIdCita) {
    await reprogramarCita();
  } else {
    await solicitarCita();
  }
}

// ─── REPROGRAMAR: llamada al backend ─────────────────────────────────────────
async function reprogramarCita() {
  const fecha = document.getElementById('cita-fecha').value;
  const hora  = document.getElementById('cita-hora').value;

  if (!fecha || !hora) { toast('Selecciona fecha y hora', 'warning'); return; }

  const pac = await obtenerMiPaciente();
  if (!pac) { toast('No se encontró tu registro de paciente', 'error'); return; }

  try {
    const res  = await fetch(`/api/citas/${_reprogramarIdCita}/reprogramar`, {
      method: 'PUT',
      headers: H,
      body: JSON.stringify({ idPaciente: pac.idPaciente, fecha, hora })
    });
    const data = await res.json();

    if (res.status === 409 || data.error) {
      toast('⚠️ ' + data.error, 'warning');
    } else {
      toast('✅ Cita reprogramada correctamente. Estado: Pendiente de confirmación.');
      cerrarModalCita();
      cargarCitas();
      cargarEstadisticas();
    }
  } catch {
    toast('Error de conexión', 'error');
  }
}

// ─── NUEVA CITA: llamada al backend ──────────────────────────────────────────
async function solicitarCita() {
  const idDoctor = parseInt(document.getElementById('cita-doctor').value);
  const fecha    = document.getElementById('cita-fecha').value;
  const hora     = document.getElementById('cita-hora').value;
  const motivo   = document.getElementById('cita-motivo').value;

  if (!idDoctor) { toast('Debes seleccionar un doctor', 'warning'); return; }
  if (!fecha || !hora) { toast('Debes seleccionar fecha y hora', 'warning'); return; }
  if (!motivo.trim()) { toast('Debes escribir el motivo de la cita', 'warning'); return; }

  const pac = await obtenerMiPaciente();
  if (!pac) { toast('No se encontró tu registro de paciente. Contacta a la recepción.', 'error'); return; }

  try {
    const payload = { fecha, hora, idPaciente: pac.idPaciente, idDoctor, estado: 'PENDIENTE', motivo };
    const res  = await fetch('/api/citas', { method: 'POST', headers: H, body: JSON.stringify(payload) });
    const data = await res.json();

    if (res.status === 409) { toast('⚠️ ' + data.error, 'warning'); return; }

    if (data.id || data.message) {
      toast('✅ Cita solicitada. Estado: Pendiente de confirmación.');
      cerrarModalCita();
      cargarCitas();
      cargarEstadisticas();
    } else {
      toast('Error: ' + (data.error?.sqlMessage || data.error || 'No se pudo solicitar la cita'), 'error');
    }
  } catch {
    toast('Error de conexión. Intenta de nuevo.', 'error');
  }
}

// ─── Autocompletado doctores ─────────────────────────────────────────────────
async function cargarDoctores() {
  try {
    const res = await fetch('/api/doctores/activos', { headers: H });
    listaDoctores = await res.json();
  } catch { /* sin datos */ }
}

function buscarDoctor() {
  const input       = document.getElementById('cita-doctor-nombre');
  const sugerencias = document.getElementById('sugerencias-doctor');
  const q = input.value.toLowerCase().trim();

  document.getElementById('cita-doctor').value = '';
  document.getElementById('horario-info').style.display = 'none';

  if (!q) { sugerencias.style.display = 'none'; return; }

  const lista = Array.isArray(listaDoctores)
    ? listaDoctores.filter(d =>
        `${d.Nombres} ${d.Apellidos}`.toLowerCase().includes(q) ||
        (d.Especialidad || '').toLowerCase().includes(q))
    : [];

  sugerencias.innerHTML = lista.length
    ? lista.map(d => `
        <div class="autocomplete-item"
          onclick="seleccionarDoctor(${d.idDoctor}, '${d.Nombres} ${d.Apellidos}', '${d.hora_inicio || ''}', '${d.hora_fin || ''}')">
          <strong>${d.Nombres} ${d.Apellidos}</strong>
          <span>${d.Especialidad || 'Sin especialidad'} · ${d.hora_inicio && d.hora_fin
            ? d.hora_inicio.substring(0,5) + ' – ' + d.hora_fin.substring(0,5)
            : 'Sin horario'}</span>
        </div>`).join('')
    : '<div class="autocomplete-item">Sin resultados</div>';

  sugerencias.style.display = 'block';
}

function seleccionarDoctor(id, nombre, horaInicio, horaFin) {
  document.getElementById('cita-doctor-nombre').value = nombre;
  document.getElementById('cita-doctor').value        = id;
  document.getElementById('sugerencias-doctor').style.display = 'none';

  const horarioInfo = document.getElementById('horario-info');
  if (horaInicio && horaFin) {
    document.getElementById('horario-texto').textContent =
      `${horaInicio.substring(0,5)} – ${horaFin.substring(0,5)}`;
    horarioInfo.style.display = 'block';
  } else {
    horarioInfo.style.display = 'none';
  }
}

document.addEventListener('click', (e) => {
  const input = document.getElementById('cita-doctor-nombre');
  const sug   = document.getElementById('sugerencias-doctor');
  if (input && sug && !input.contains(e.target) && !sug.contains(e.target))
    sug.style.display = 'none';
});

// ─── CONSULTAS ───────────────────────────────────────────────────────────────
async function cargarConsultas() {
  const pac = await obtenerMiPaciente();
  if (!pac) return;
  try {
    const res   = await fetch(`/api/citas/porpaciente/${pac.idPaciente}`, { headers: H });
    const data  = await res.json();
    const comp  = Array.isArray(data) ? data.filter(c => c.estado === 'COMPLETADA') : [];
    document.getElementById('tbody-consultas').innerHTML = comp.length
      ? comp.map(c => `
          <tr>
            <td>${c.fecha ? c.fecha.split('T')[0] : '—'}</td>
            <td>${c.NombreDoctor ? `${c.NombreDoctor} ${c.ApellidosDoctor}` : `#${c.idDoctor}`}</td>
            <td>${c.motivo || '—'}</td>
            <td>${c.hora  ? c.hora.substring(0,5) : '—'}</td>
            <td><span class="badge badge--completada">Completada</span></td>
          </tr>`).join('')
      : '<tr><td colspan="5" style="text-align:center;color:var(--text-soft);padding:20px;">No tienes consultas anteriores</td></tr>';
  } catch {
    document.getElementById('tbody-consultas').innerHTML =
      '<tr><td colspan="5" style="text-align:center;color:#c03030;padding:20px;">Error al cargar consultas</td></tr>';
  }
}

// ─── RECETAS ──────────────────────────────────────────────────────────────────
async function cargarRecetas() {
  const pac = await obtenerMiPaciente();
  if (!pac) {
    document.getElementById('tbody-recetas').innerHTML =
      '<tr><td colspan="6" style="text-align:center;color:var(--text-soft);padding:20px;">No se encontró tu registro de paciente</td></tr>';
    return;
  }
  try {
    const res  = await fetch(`/api/recetas/paciente/${pac.idPaciente}`, { headers: H });
    const data = await res.json();
    document.getElementById('tbody-recetas').innerHTML = Array.isArray(data) && data.length
      ? data.map(r => `
          <tr>
            <td>${r.medicamento  || '—'}</td>
            <td>${r.dosis        || '—'}</td>
            <td>${r.frecuencia   || '—'}</td>
            <td>${r.duracion     || '—'}</td>
            <td>${r.indicaciones || '—'}</td>
            <td>
              <button class="btn-pdf" onclick="descargarReceta(${r.idReceta})">
                ⬇ PDF
              </button>
            </td>
          </tr>`).join('')
      : '<tr><td colspan="6" style="text-align:center;color:var(--text-soft);padding:20px;">No tienes recetas registradas</td></tr>';
  } catch {
    document.getElementById('tbody-recetas').innerHTML =
      '<tr><td colspan="6" style="text-align:center;color:#c03030;padding:20px;">Error al cargar recetas</td></tr>';
  }
}

// ─── DOCUMENTOS ───────────────────────────────────────────────────────────────
async function cargarDocumentos() {
  const pac = await obtenerMiPaciente();
  if (!pac) return;

  try {
    const res  = await fetch(`/api/recetas/paciente/${pac.idPaciente}`, { headers: H });
    const data = await res.json();

    document.getElementById('tbody-recetas-docs').innerHTML = Array.isArray(data) && data.length
      ? data.map(r => `
          <tr>
            <td>${r.medicamento || '—'}</td>
            <td>${r.dosis       || '—'}</td>
            <td>${r.frecuencia  || '—'}</td>
            <td>${r.duracion    || '—'}</td>
            <td>
              <button class="btn-pdf" onclick="descargarReceta(${r.idReceta})">
                ⬇ Descargar PDF
              </button>
            </td>
          </tr>`).join('')
      : '<tr><td colspan="5" style="text-align:center;color:var(--text-soft);padding:20px;">No tienes recetas registradas</td></tr>';
  } catch {
    document.getElementById('tbody-recetas-docs').innerHTML =
      '<tr><td colspan="5" style="text-align:center;color:#c03030;padding:20px;">Error al cargar recetas</td></tr>';
  }
}

// ─── DESCARGAS PDF ────────────────────────────────────────────────────────────

/**
 * Descarga un PDF autenticado abriendo una URL con token en query param.
 * El backend debe leer el token de query param cuando viene de descarga directa.
 * Alternativa: crear un blob desde fetch con header.
 */
async function descargarPDF(url, nombreArchivo) {
  try {
    toast('⏳ Generando PDF...', 'success');
    const res = await fetch(url, { headers: H });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast('Error: ' + (err.error || 'No se pudo generar el PDF'), 'error');
      return;
    }
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href     = blobUrl;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    toast('✅ PDF descargado correctamente');
  } catch {
    toast('Error de conexión al generar PDF', 'error');
  }
}

async function descargarReceta(idReceta) {
  await descargarPDF(`/api/pdf/receta/${idReceta}`, `receta-${idReceta}.pdf`);
}

async function descargarHistorial() {
  const pac = await obtenerMiPaciente();
  if (!pac) { toast('No se encontró tu registro de paciente', 'error'); return; }
  await descargarPDF(`/api/pdf/historial/${pac.idPaciente}`, `historial-clinico.pdf`);
}

async function descargarDiagnosticos() {
  const pac = await obtenerMiPaciente();
  if (!pac) { toast('No se encontró tu registro de paciente', 'error'); return; }
  await descargarPDF(`/api/pdf/diagnosticos/${pac.idPaciente}`, `diagnosticos.pdf`);
}

// ─── PERFIL ───────────────────────────────────────────────────────────────────
let miPerfilData = null;

async function cargarPerfil() {
  try {
    const res  = await fetch(`/api/perfil/${usuario.id}`, { headers: H });
    const data = await res.json();
    if (data.error) { toast('Error al cargar perfil', 'error'); return; }
    miPerfilData = data;

    document.getElementById('perf-nombres').value    = data.Nombres            || '';
    document.getElementById('perf-apellidos').value  = data.Apellidos          || '';
    document.getElementById('perf-email').value      = data.Email              || '';
    document.getElementById('perf-fecha-nac').value  = data.Fecha_nacimiento ? data.Fecha_nacimiento.split('T')[0] : '';
    document.getElementById('perf-sexo').value       = data.Sexo               || '';
    document.getElementById('perf-expediente').value = data.numero_expediente  || '';
    document.getElementById('perf-telefono').value   = data.Telefono           || '';
    document.getElementById('perf-direccion').value  = data.Direccion          || '';

    document.getElementById('perf-tipo-sangre').value  = data.tipo_sangre           || '';
    document.getElementById('perf-contacto-emg').value = data.contacto_emergencia   || '';
    document.getElementById('perf-parentesco').value   = data.parentesco_emergencia || '';
    document.getElementById('perf-tel-emg').value      = data.telefono_emergencia   || '';

    document.getElementById('perf-alergias').value      = data.alergias                || '';
    document.getElementById('perf-ant-fam').value       = data.antecedentes_familiares || '';
    document.getElementById('perf-ant-per').value       = data.antecedentes_personales || '';
    document.getElementById('perf-cronicos').value      = data.padecimientos_cronicos  || '';
    document.getElementById('perf-cirugias').value      = data.cirugias_previas        || '';
    document.getElementById('perf-observaciones').value = data.obs_historial           || '';
  } catch {
    toast('Error de conexión al cargar perfil', 'error');
  }
}

async function guardarPerfil() {
  if (!miPerfilData) { toast('Primero carga el perfil', 'warning'); return; }

  const payload = {
    Telefono:                document.getElementById('perf-telefono').value,
    Direccion:               document.getElementById('perf-direccion').value,
    idPaciente:              miPerfilData.idPaciente,
    tipo_sangre:             document.getElementById('perf-tipo-sangre').value,
    contacto_emergencia:     document.getElementById('perf-contacto-emg').value,
    parentesco_emergencia:   document.getElementById('perf-parentesco').value,
    telefono_emergencia:     document.getElementById('perf-tel-emg').value,
    antecedentes_familiares: document.getElementById('perf-ant-fam').value,
    antecedentes_personales: document.getElementById('perf-ant-per').value,
    alergias:                document.getElementById('perf-alergias').value,
    padecimientos_cronicos:  document.getElementById('perf-cronicos').value,
    cirugias_previas:        document.getElementById('perf-cirugias').value,
    observaciones_generales: document.getElementById('perf-observaciones').value
  };

  try {
    const res  = await fetch(`/api/perfil/${usuario.id}`, {
      method: 'PUT', headers: H, body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.message) {
      toast('✅ Perfil actualizado correctamente');
      cargarPerfil();
    } else {
      toast('Error: ' + (data.error?.sqlMessage || data.error || 'No se pudo actualizar'), 'error');
    }
  } catch {
    toast('Error de conexión', 'error');
  }
}

// ─── CERRAR SESIÓN ────────────────────────────────────────────────────────────
function cerrarSesion() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  window.location.href = '/';
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
(async () => {
  await cargarDoctores();
  await cargarEstadisticas();
})();
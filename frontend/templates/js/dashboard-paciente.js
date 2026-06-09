/**
 * dashboard-paciente.js — HU11: Portal de Autogestión del Paciente
 */

// ─── Autenticación ────────────────────────────────────────────────────────────
const usuario = JSON.parse(sessionStorage.getItem('usuario') || 'null');
if (!usuario || usuario.rol !== 30001) {
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

const token = sessionStorage.getItem('token');
const H = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

// ─── Util: HTML escape ────────────────────────────────────────────────────────
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ─── Util: Toast ──────────────────────────────────────────────────────────────
function toast(msg, tipo = 'success') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    Object.assign(el.style, {
      position:'fixed', bottom:'28px', right:'28px', zIndex:'9999',
      padding:'14px 22px', borderRadius:'14px', fontSize:'13.5px', fontWeight:'600',
      boxShadow:'0 8px 24px rgba(0,0,0,0.18)', display:'none', maxWidth:'340px', lineHeight:'1.4',
    });
    document.body.appendChild(el);
  }
  const paleta = { success:'#2a6b5e', error:'#c03030', warning:'#b07800' };
  el.style.background = paleta[tipo] || paleta.success;
  el.style.color = '#fff';
  el.textContent = msg;
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
  if (seccion === 'perfil')      cargarPerfil();
}

// ─── Estado global de paciente ────────────────────────────────────────────────
let miPaciente    = null;

// ─── Maps para onclick seguro ─────────────────────────────────────────────────
const _mapCitasPac = new Map();
const _mapDocSugPac = new Map();

// ─── Obtener idPaciente del paciente logueado ─────────────────────────────────
async function obtenerMiPaciente() {
  if (miPaciente) return miPaciente;
  try {
    const res  = await fetch(`/api/pacientes/by-usuario/${usuario.id}`, { headers: H });
    miPaciente = await res.json();
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
  return `<span class="badge badge--${cls}">${esc(estado)}</span>`;
}

// ── filaCita ──────────────────────────────────────────────
function filaCita(c, compact) {
  _mapCitasPac.set(c.idCita, c);
  var esCancelable    = ['PENDIENTE','CONFIRMADA'].includes(c.estado);
  var esReprogramable = esCancelable;
  var fechaStr = c.fecha ? c.fecha.split('T')[0] : '—';
  var horaStr  = c.hora  ? c.hora.substring(0,5) : '—';
  var doctor   = c.NombreDoctor
    ? esc(c.NombreDoctor) + ' ' + esc(c.ApellidosDoctor)
    : '#' + c.idDoctor;

  var acciones = '<div class="action-icons">'
    + '<button class="icon-btn icon-btn--edit" title="Ver detalle" onclick="verDetalleCita(' + c.idCita + ')"><span class="material-symbols-outlined">search</span></button>'
    + (esReprogramable ? '<button class="icon-btn icon-btn--toggle" title="Reprogramar" onclick="abrirReprogramar(' + c.idCita + ')"><span class="material-symbols-outlined">calendar_today</span></button>' : '')
    + (esCancelable    ? '<button class="icon-btn icon-btn--cancel" title="Cancelar cita" onclick="abrirCancelar(' + c.idCita + ', \'' + fechaStr + '\', \'' + horaStr + '\')"><span class="material-symbols-outlined">close</span></button>' : '')
    + '</div>';

  if (compact) {
    return '<tr>'
      + '<td data-label="Fecha">'   + fechaStr + '</td>'
      + '<td data-label="Hora">'    + horaStr  + '</td>'
      + '<td data-label="Doctor">'  + doctor   + '</td>'
      + '<td data-label="Estado">'  + badgeEstado(c.estado) + '</td>'
      + '<td data-label="Acciones">' + acciones + '</td>'
      + '</tr>';
  }

  return '<tr>'
    + '<td data-label="ID">#'       + c.idCita + '</td>'
    + '<td data-label="Fecha">'     + fechaStr + '</td>'
    + '<td data-label="Hora">'      + horaStr  + '</td>'
    + '<td data-label="Doctor">'    + doctor   + '</td>'
    + '<td data-label="Motivo">'    + esc(c.motivo || '—') + '</td>'
    + '<td data-label="Estado">'    + badgeEstado(c.estado) + '</td>'
    + '<td data-label="Acciones">'  + acciones + '</td>'
    + '</tr>';
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
          ${c.NombreDoctor ? `Dr/Dra. ${esc(c.NombreDoctor)} ${esc(c.ApellidosDoctor)}` : `#${c.idDoctor}`}
        </div>
      </div>
      <div class="detalle-item">
        <div class="detalle-item__label">Especialidad</div>
        <div class="detalle-item__value">${esc(c.Especialidad || '—')}</div>
      </div>
      <div class="detalle-item detalle-item--full">
        <div class="detalle-item__label">Motivo de la Cita</div>
        <div class="detalle-item__value" style="font-size:13px;font-weight:400;">${esc(c.motivo || '—')}</div>
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
      toast('' + data.error, 'warning');
    } else {
      cerrarModal('modal-cancelar');
      toast('Cita cancelada correctamente');
      cargarCitas();
      cargarEstadisticas();
    }
  } catch {
    toast('Error de conexión', 'error');
  }
}

// ─── MODAL NUEVA CITA ─────────────────────────────────────────────────────────
let _reprogramarIdCita = null;

function abrirModalCita() {
  _reprogramarIdCita = null;

  document.getElementById('modal-cita-titulo').textContent  = 'Solicitar Nueva Cita';
  document.getElementById('btn-guardar-cita').textContent   = 'Confirmar Cita';
  document.getElementById('cita-fecha').value               = '';
  document.getElementById('cita-hora').value                = '';
  document.getElementById('cita-doctor').value              = '';
  document.getElementById('cita-motivo').value              = '';

  // IMPORTANTE: mostrar el wrap padre pero ocultar solo el botón y la lista
  document.getElementById('buscar-medicos-wrap').style.display      = '';       // visible — contiene la lista
  document.getElementById('btn-buscar-medicos').style.display       = 'none';  // botón oculto — no se necesita
  document.getElementById('medicos-disponibles-wrap').style.display = 'none';  // lista oculta hasta buscar
  document.getElementById('medicos-lista').innerHTML                = '';
  document.getElementById('horario-info').style.display             = 'none';
  document.getElementById('motivo-wrap').style.display              = 'none';
  document.getElementById('btn-guardar-cita').style.display         = 'none';

  document.getElementById('modal-cita').classList.add('active');
}

// ─── REPROGRAMAR CITA ─────────────────────────────────────────────────────────
function abrirReprogramar(idCita) {
  const c = _mapCitasPac.get(Number(idCita));
  if (!c) return;
  _reprogramarIdCita = idCita;

  const doctorNombre = c.NombreDoctor
    ? `Dr(a). ${c.NombreDoctor} ${c.ApellidosDoctor}`
    : `Doctor #${c.idDoctor}`;

  document.getElementById('modal-cita-titulo').textContent = `Reprogramar Cita #${idCita}`;
  document.getElementById('btn-guardar-cita').textContent  = 'Reprogramar';
  document.getElementById('cita-fecha').value              = c.fecha ? c.fecha.split('T')[0] : '';
  document.getElementById('cita-hora').value               = c.hora  ? c.hora.substring(0,5)  : '';
  document.getElementById('cita-doctor').value             = c.idDoctor;
  document.getElementById('cita-motivo').value             = '';

  document.getElementById('horario-texto').textContent         = doctorNombre + ' (doctor fijo)';
  document.getElementById('horario-info').style.display        = 'block';
  document.getElementById('buscar-medicos-wrap').style.display = 'none';
  document.getElementById('motivo-wrap').style.display         = 'none';
  document.getElementById('btn-guardar-cita').style.display    = '';

  document.getElementById('modal-cita').classList.add('active');
}

function cerrarModalCita() {
  document.getElementById('modal-cita').classList.remove('active');
  _reprogramarIdCita = null;
}

// ─── LÓGICA DE DISPONIBILIDAD ─────────────────────────────────────────────────
function onFechaHoraChange() {
  if (_reprogramarIdCita) return;
  const fecha = document.getElementById('cita-fecha').value;
  const hora  = document.getElementById('cita-hora').value;

  // Limpiar selección anterior
  document.getElementById('cita-doctor').value              = '';
  document.getElementById('horario-info').style.display     = 'none';
  document.getElementById('motivo-wrap').style.display      = 'none';
  document.getElementById('btn-guardar-cita').style.display = 'none';
  document.getElementById('medicos-lista').innerHTML        = '';

  if (!fecha || !hora) {
    document.getElementById('medicos-disponibles-wrap').style.display = 'none';
    return;
  }

  // Buscar automáticamente al tener fecha Y hora
  buscarMedicosDisponibles();
}

async function buscarMedicosDisponibles() {
  const fecha = document.getElementById('cita-fecha').value;
  const hora  = document.getElementById('cita-hora').value;
  if (!fecha || !hora) return;

  const listaEl = document.getElementById('medicos-lista');
  listaEl.innerHTML = `
    <div class="medicos-sin-resultado">
      <span class="material-symbols-outlined" style="font-size:18px;vertical-align:middle;">hourglass_empty</span>
      Buscando médicos disponibles...
    </div>`;
  document.getElementById('medicos-disponibles-wrap').style.display = 'block';
  document.getElementById('cita-doctor').value              = '';
  document.getElementById('horario-info').style.display     = 'none';
  document.getElementById('motivo-wrap').style.display      = 'none';
  document.getElementById('btn-guardar-cita').style.display = 'none';

  try {
    const res  = await fetch(`/api/citas/disponibilidad?fecha=${fecha}&hora=${hora}`, { headers: H });
    const data = await res.json();
    const lista = Array.isArray(data) ? data : [];

    if (lista.length === 0) {
      listaEl.innerHTML = `
        <div class="medicos-sin-resultado">
          <span class="material-symbols-outlined" style="font-size:18px;vertical-align:middle;">info</span>
          No hay médicos disponibles el <strong>${fecha}</strong> a las <strong>${hora}</strong>.<br>
          Prueba con otra fecha u hora.
        </div>`;
    } else {
      listaEl.innerHTML = lista.map(d => {
        const nombre  = `${esc(d.Nombres)} ${esc(d.Apellidos)}`;
        const horario = (d.hora_inicio && d.hora_fin)
          ? d.hora_inicio.substring(0,5) + ' – ' + d.hora_fin.substring(0,5)
          : 'Sin horario';
        return `
          <div class="medico-card" id="medico-card-${d.idDoctor}"
            onclick="seleccionarMedicoDisponible(${d.idDoctor}, '${nombre}', '${esc(d.Especialidad||'')}', '${horario}')">
            <div class="medico-card__avatar">${esc((d.Nombres || 'D')[0])}</div>
            <div class="medico-card__info">
              <strong>Dr(a). ${nombre}</strong>
              <span>${esc(d.Especialidad || 'Medicina General')}</span>
              <span>Consultorio: ${esc(d.Consultorio || '–')} · ${horario}</span>
            </div>
            <span class="medico-card__flecha">Seleccionar →</span>
          </div>`;
      }).join('');
    }
  } catch {
    listaEl.innerHTML = `
      <div class="medicos-sin-resultado">
        <span class="material-symbols-outlined" style="font-size:18px;vertical-align:middle;">error</span>
        Error al buscar médicos. Intenta de nuevo.
      </div>`;
    toast('Error al buscar médicos disponibles. Intenta de nuevo.', 'error');
  }
}

function seleccionarMedicoDisponible(idDoctor, nombre, especialidad, horario) {
  document.getElementById('cita-doctor').value = idDoctor;

  document.querySelectorAll('.medico-card').forEach(el => el.classList.remove('selected'));
  const card = document.getElementById('medico-card-' + idDoctor);
  if (card) card.classList.add('selected');

  document.getElementById('horario-texto').textContent      = `Dr(a). ${nombre} · ${especialidad} · ${horario}`;
  document.getElementById('horario-info').style.display     = 'block';
  document.getElementById('motivo-wrap').style.display      = '';
  document.getElementById('btn-guardar-cita').style.display = '';
  document.getElementById('cita-motivo').focus();
}

function resetSeleccionMedico() {
  document.getElementById('cita-doctor').value              = '';
  document.getElementById('horario-info').style.display     = 'none';
  document.getElementById('motivo-wrap').style.display      = 'none';
  document.getElementById('btn-guardar-cita').style.display = 'none';
  document.querySelectorAll('.medico-card').forEach(el => el.classList.remove('selected'));
}

// ─── Guardar: nueva cita O reprogramar ───────────────────────────────────────
let _enviandoCita = false;
async function guardarCitaModal() {
  if (_enviandoCita) return;            // evita doble submit
  _enviandoCita = true;
  try {
    if (_reprogramarIdCita) {
      await reprogramarCita();
    } else {
      await solicitarCita();
    }
  } finally {
    _enviandoCita = false;
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
      toast('' + data.error, 'warning');
    } else {
      toast('Cita reprogramada correctamente. Estado: Pendiente de confirmación.');
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

    if (res.status === 409) { toast('' + data.error, 'warning'); return; }

    if (data.id || data.message) {
      toast('Cita solicitada. Estado: Pendiente de confirmación.');
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

// ─── CONSULTAS ───────────────────────────────────────────────────────────────
async function cargarConsultas() {
  const pac = await obtenerMiPaciente();
  if (!pac) return;
  try {
    const res  = await fetch(`/api/consultas/paciente/${pac.idPaciente}`, { headers: H });
    const data = await res.json();
    document.getElementById('tbody-consultas').innerHTML = Array.isArray(data) && data.length
      ? data.map(c => `
          <tr>
            <td>${c.fecha ? c.fecha.split('T')[0] : '—'}</td>
            <td>${c.NombreDoctor ? `${esc(c.NombreDoctor)} ${esc(c.ApellidosDoctor)}` : '—'}</td>
            <td>${esc(c.motivo || c.diagnostico || '—')}</td>
            <td>${c.hora ? c.hora.substring(0,5) : '—'}</td>
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
  const cont = document.getElementById('recetas-por-cita');
  try {
    const res  = await fetch(`/api/recetas/paciente/${pac.idPaciente}`, { headers: H });
    const data = await res.json();

    if (!Array.isArray(data) || !data.length) {
      cont.innerHTML = '<p style="text-align:center;color:var(--text-soft);padding:24px;">No tienes recetas registradas</p>';
      return;
    }

    // Agrupar por cita (los datos ya vienen ordenados por fecha DESC)
    const grupos = new Map();
    data.forEach(r => {
      const key = r.idCita ?? `sin-cita-${r.idReceta}`;
      if (!grupos.has(key)) grupos.set(key, []);
      grupos.get(key).push(r);
    });

    cont.innerHTML = [...grupos.values()].map(meds => {
      const c        = meds[0];
      const fecha    = c.FechaCita ? c.FechaCita.split('T')[0] : '—';
      const doctor   = c.NombreDoctor ? `Dr/Dra. ${esc(c.NombreDoctor)} ${esc(c.ApellidosDoctor || '')}`.trim() : 'Médico';
      const sub      = [esc(c.Especialidad || ''), `${meds.length} medicamento${meds.length !== 1 ? 's' : ''}`, c.MotivoCita ? esc(c.MotivoCita) : '']
                         .filter(Boolean).join(' · ');
      const filas    = meds.map(m => `
        <tr>
          <td><strong>${esc(m.NombreMedicamento || m.medicamento || '—')}</strong></td>
          <td>${esc(m.dosis        || '—')}</td>
          <td>${esc(m.frecuencia   || '—')}</td>
          <td>${esc(m.duracion     || '—')}</td>
          <td>${esc(m.indicaciones || '—')}</td>
        </tr>`).join('');
      return `
        <div style="border:1.5px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:12px;padding:14px 18px;background:rgba(42,107,94,0.06);border-bottom:1.5px solid var(--border);">
            <span class="material-symbols-outlined icon-inline" style="color:var(--teal);">event</span>
            <div style="flex:1;min-width:0;">
              <strong style="display:block;font-size:13.5px;color:var(--deep);">${fecha} · ${doctor}</strong>
              <span style="font-size:11.5px;color:var(--text-soft);">${sub}</span>
            </div>
            <button class="btn-pdf" onclick="descargarReceta(${c.idReceta})">
              <span class="material-symbols-outlined" style="vertical-align:middle;">download</span> Receta PDF
            </button>
          </div>
          <table class="tabla" style="margin:0;">
            <thead><tr><th>Medicamento</th><th>Dosis</th><th>Frecuencia</th><th>Duración</th><th>Indicaciones</th></tr></thead>
            <tbody>${filas}</tbody>
          </table>
        </div>`;
    }).join('');
  } catch {
    cont.innerHTML = '<p style="text-align:center;color:#c03030;padding:24px;">Error al cargar recetas</p>';
  }
}

// ─── DESCARGAS PDF ────────────────────────────────────────────────────────────
async function descargarPDF(url, nombreArchivo) {
  try {
    toast('Generando PDF...', 'success');
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
    toast('PDF descargado correctamente');
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
      toast('Perfil actualizado correctamente');
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
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('usuario');
  window.location.href = '/';
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
(async () => {
  await cargarEstadisticas();
})();

// ══════════════════════════════════════════════
//  DASHBOARD RECEPCIONISTA — dashboard-recepcionista.js
// ══════════════════════════════════════════════

// ── AUTH ──────────────────────────────────────
const usuario = JSON.parse(sessionStorage.getItem('usuario') || 'null');
if (!usuario || usuario.rol !== 30003) {
  window.location.href = '/';
}

if (usuario) {
  const nombre = usuario.nombre || 'Recepcionista';
  document.getElementById('nombre-recep').textContent  = nombre;
  document.getElementById('usuario-nombre').textContent = nombre;
  document.getElementById('avatar-inicial').textContent = nombre[0].toUpperCase();
}

document.getElementById('fecha-actual').textContent =
  new Date().toLocaleDateString('es-SV', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

// ── TOKEN ─────────────────────────────────────
const token = sessionStorage.getItem('token');
const H = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

// ── TOAST ─────────────────────────────────────
function toast(msg, tipo = 'info') {
  let el = document.getElementById('_toast_notif');
  if (!el) {
    el = document.createElement('div');
    el.id = '_toast_notif';
    Object.assign(el.style, {
      position:'fixed', bottom:'28px', right:'28px', zIndex:'9999',
      padding:'13px 22px', borderRadius:'12px', fontSize:'14px',
      fontWeight:'600', boxShadow:'0 4px 18px rgba(0,0,0,0.18)',
      transition:'opacity .3s', maxWidth:'380px', lineHeight:'1.4',
    });
    document.body.appendChild(el);
  }
  const colores = { info:'#2a6b5e', error:'#c03030', warn:'#b07800', ok:'#2a6b5e' };
  el.style.background = colores[tipo] || colores.info;
  el.style.color = '#fff';
  el.style.opacity = '1';
  el.textContent = msg;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, 3500);
}

// ── ESC ───────────────────────────────────────
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── MAPS ──────────────────────────────────────
const _mapCitasRec   = new Map();
const _mapMedicosRec = new Map();
const _mapUsuPacRec  = new Map();
const _mapPacAutoRec = new Map();
const _mapDocAutoRec = new Map();
const _mapDocUsrRec  = new Map();
const _mapPrePacRec  = new Map();
const _mapPreCitaRec = new Map();

// ── NAVEGACIÓN ────────────────────────────────
function nav(seccion, linkEl) {
  document.querySelectorAll('[id^="sec-"]').forEach(s => s.style.display = 'none');
  document.getElementById('sec-' + seccion).style.display = 'block';
  document.querySelectorAll('.nav-item').forEach(a => a.classList.remove('active'));
  if (linkEl) linkEl.classList.add('active');

  if (seccion === 'citas')        cargarCitas();
  if (seccion === 'pacientes')    cargarPacientesRecientes();
  if (seccion === 'buscar')       iniciarBuscador();
  if (seccion === 'medicos')      cargarMedicos();
  if (seccion === 'preconsulta')  preIniciarSeccion();
}

// ── STATS ─────────────────────────────────────
async function cargarStats() {
  try {
    const [cRes, pRes, conRes] = await Promise.all([
      fetch('/api/citas',     { headers: H }),
      fetch('/api/pacientes', { headers: H }),
      fetch('/api/consultas', { headers: H }),
    ]);
    const citas     = await cRes.json();
    const pacientes = await pRes.json();
    const consultas = await conRes.json();

    const hoy = new Date().toISOString().split('T')[0];
    const citasHoy = Array.isArray(citas)
      ? citas.filter(c => c.fecha && String(c.fecha).startsWith(hoy)) : [];

    const idsConPreconsulta = Array.isArray(consultas)
      ? consultas.map(c => String(c.idCita)) : [];
    _idsConPreconsulta = new Set(idsConPreconsulta);
    const sinPreconsulta = citasHoy.filter(c =>
      ['PENDIENTE','CONFIRMADA'].includes(c.estado) &&
      !_idsConPreconsulta.has(String(c.idCita))
    );
    const atendidas = citasHoy.filter(c => c.estado === 'FINALIZADA');

    document.getElementById('s-citas-hoy').textContent    = citasHoy.length;
    document.getElementById('s-preconsultas').textContent = sinPreconsulta.length;
    document.getElementById('s-atendidos').textContent    = atendidas.length;
    document.getElementById('s-pacientes').textContent    = Array.isArray(pacientes) ? pacientes.length : '—';

    document.getElementById('citas-preview').innerHTML = citasHoy.length
      ? citasHoy.slice(0,4).map(c => {
          const paciente = c.NombrePaciente
            ? `${esc(c.NombrePaciente)} ${esc(c.ApellidosPaciente || '')}`.trim()
            : `#${c.idPaciente}`;
          const doctor = c.NombreDoctor
            ? `${esc(c.NombreDoctor)} ${esc(c.ApellidosDoctor || '')}`.trim()
            : `#${c.idDoctor}`;
          const tienePre = idsConPreconsulta.includes(String(c.idCita));
          return `
            <tr>
              <td>${c.hora || '—'}</td>
              <td>${paciente}</td>
              <td>${doctor}</td>
              <td>
                <span class="badge badge--${['CONFIRMADA','FINALIZADA'].includes(c.estado) ? 'activo' : 'pendiente'}">${c.estado}</span>
                ${tienePre ? '<span class="material-symbols-outlined icon-inline" style="font-size:10px;color:var(--teal);margin-left:4px;">article</span>' : ''}
              </td>
            </tr>`;
        }).join('')
      : '<tr><td colspan="4" style="text-align:center;color:var(--text-soft);padding:16px;">Sin citas para hoy</td></tr>';
  } catch {}
}

// ── CITAS ─────────────────────────────────────
let todasCitas          = [];
let tabCitaActual       = 'todas';
let _idsConPreconsulta  = new Set();

async function cargarCitas() {
  try {
    const res  = await fetch('/api/citas', { headers: H });
    const data = await res.json();
    todasCitas = Array.isArray(data) ? data : [];
    renderCitas(todasCitas);
  } catch {
    document.getElementById('tbody-citas').innerHTML =
      '<tr><td colspan="7" style="text-align:center;color:#c03030;padding:20px;">Error al cargar citas</td></tr>';
  }
}

function renderCitas(lista) {
  if (!Array.isArray(lista) || !lista.length) {
    document.getElementById('tbody-citas').innerHTML =
      '<tr><td colspan="7" style="text-align:center;color:var(--text-soft);padding:20px;">Sin citas</td></tr>';
    return;
  }
  lista.forEach(c => _mapCitasRec.set(c.idCita, c));
  document.getElementById('tbody-citas').innerHTML = lista.map(c => {
    const paciente = c.NombrePaciente
      ? `${esc(c.NombrePaciente)} ${esc(c.ApellidosPaciente || '')}`.trim()
      : `#${c.idPaciente}`;
    const doctor = c.NombreDoctor
      ? `${esc(c.NombreDoctor)} ${esc(c.ApellidosDoctor || '')}`.trim()
      : `#${c.idDoctor}`;
    const confirmable  = c.estado === 'PENDIENTE';
    const reasignable  = c.estado === 'REQUIERE_REASIGNACION';
    const tienePre     = _idsConPreconsulta.has(String(c.idCita));
    const badge = reasignable
      ? '<span class="badge" style="background:rgba(176,120,0,0.14);color:#b07800;">Reasignación</span>'
      : `<span class="badge badge--${['CONFIRMADA','FINALIZADA','COMPLETADA'].includes(c.estado) ? 'activo' : 'pendiente'}">${c.estado}</span>`;
    return `
      <tr${reasignable ? ' style="background:rgba(176,120,0,0.05);"' : ''}>
        <td>#${c.idCita}</td>
        <td>${c.fecha ? c.fecha.split('T')[0] : '—'}</td>
        <td>${c.hora  || '—'}</td>
        <td>${paciente}</td>
        <td>${doctor}</td>
        <td>
          ${badge}
          ${tienePre ? '<span title="Preconsulta registrada" style="margin-left:5px;font-size:11px;background:rgba(42,107,94,0.12);color:var(--teal);border-radius:6px;padding:2px 6px;font-weight:700;">Pre ✓</span>' : ''}
        </td>
        <td>
          <div class="action-icons">
            ${reasignable ? `<button class="icon-btn" style="background:rgba(176,120,0,0.15);color:#b07800;" title="Reasignar doctor" onclick="abrirReasignacion(${c.idCita})"><span class="material-symbols-outlined">published_with_changes</span></button>` : ''}
            ${confirmable ? `<button class="icon-btn icon-btn--confirm" title="Confirmar cita" onclick="confirmarCita(${c.idCita})">✔</button>` : ''}
            <button class="icon-btn icon-btn--edit"   title="Editar"   onclick="abrirModalEditarCita(${c.idCita})"><span class="material-symbols-outlined">edit</span></button>
            <button class="icon-btn icon-btn--cancel" title="Cancelar" onclick="cancelarCita(${c.idCita})"><span class="material-symbols-outlined">close</span></button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function setTabCitas(estado, btn) {
  tabCitaActual = estado;
  document.querySelectorAll('#sec-citas .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const filtrado = estado === 'todas' ? todasCitas : todasCitas.filter(c => c.estado === estado);
  renderCitas(filtrado);
}

async function confirmarCita(id) {
  if (!confirm('¿Confirmar esta cita?')) return;
  const res = await fetch(`/api/citas/${id}`, { method:'PUT', headers:H, body:JSON.stringify({ estado:'CONFIRMADA' }) });
  if (res.ok) { toast('Cita confirmada'); cargarCitas(); }
  else toast('Error al confirmar la cita', 'error');
}

async function cancelarCita(id) {
  if (!confirm('¿Cancelar esta cita?')) return;
  await fetch(`/api/citas/${id}`, { method:'PUT', headers:H, body:JSON.stringify({ estado:'CANCELADA' }) });
  cargarCitas();
}

// ── FLUJO REASIGNACIÓN ────────────────────────
// Abre el panel para asignar otro doctor a una cita con inconveniente.
async function abrirReasignacion(idCita) {
  const c = _mapCitasRec.get(idCita);
  if (!c) { toast('Cita no encontrada', 'error'); return; }

  const fecha    = c.fecha ? c.fecha.split('T')[0] : '';
  const hora     = c.hora || '';
  const paciente = c.NombrePaciente ? `${c.NombrePaciente} ${c.ApellidosPaciente || ''}`.trim() : `#${c.idPaciente}`;
  const docOrig  = c.NombreDoctor   ? `${c.NombreDoctor} ${c.ApellidosDoctor || ''}`.trim()     : `#${c.idDoctor}`;

  let modal = document.getElementById('modal-reasignacion');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-reasignacion';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="modal" style="max-width:560px;">
      <h3>Reasignar cita #${idCita}</h3>
      <div style="font-size:13px;color:var(--text-soft);line-height:1.6;margin-bottom:6px;">
        <strong style="color:var(--deep);">${esc(paciente)}</strong> · ${fecha} ${hora}<br/>
        Doctor original: <strong style="color:#b07800;">${esc(docOrig)}</strong> (reportó inconveniente)
      </div>
      <div id="reasignar-lista" style="margin-top:12px;">
        <p style="text-align:center;color:var(--text-soft);padding:20px;font-size:13px;">Buscando doctores disponibles...</p>
      </div>
      <div style="margin-top:16px;border-top:1.5px solid var(--border);padding-top:14px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;">
        <span style="font-size:11.5px;color:var(--text-soft);">Si el paciente no acepta otro doctor, usa <strong>Editar</strong> para reprogramar.</span>
        <button class="icon-btn icon-btn--cancel" style="width:auto;padding:8px 14px;font-size:12.5px;font-weight:600;" onclick="cancelarSinDoctor(${idCita})">
          <span class="material-symbols-outlined icon-inline">event_busy</span> Cancelar (sin doctores)
        </button>
      </div>
      <div class="modal-actions">
        <button class="btn-cancelar" onclick="cerrarReasignacion()">Cerrar</button>
      </div>
    </div>`;
  modal.classList.add('active');

  // Validación de anticipación (≥1h) en el cliente, solo informativa
  const fechaHora = new Date(`${fecha}T${hora}`);
  const cont      = document.getElementById('reasignar-lista');
  if (!isNaN(fechaHora.getTime()) && fechaHora < new Date(Date.now() + 60 * 60 * 1000)) {
    cont.innerHTML = '<p style="text-align:center;color:#c03030;padding:18px;font-size:13px;">No se puede reasignar: la cita es en menos de 1 hora. Cancela o reprograma.</p>';
    return;
  }

  // Buscar doctores disponibles (excluyendo al original)
  try {
    const res  = await fetch(`/api/citas/disponibilidad?fecha=${fecha}&hora=${encodeURIComponent(hora)}`, { headers: H });
    let docs   = await res.json();
    docs = (Array.isArray(docs) ? docs : []).filter(d => d.idDoctor !== c.idDoctor);

    cont.innerHTML = docs.length
      ? docs.map(d => `
          <div style="display:flex;align-items:center;gap:12px;padding:11px 12px;border:1.5px solid var(--border);border-radius:11px;margin-bottom:8px;">
            <div style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,var(--teal),var(--teal-light));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">${esc((d.Nombres || 'D')[0])}</div>
            <div style="flex:1;">
              <strong style="display:block;font-size:13.5px;color:var(--deep);">${esc(d.Nombres || '')} ${esc(d.Apellidos || '')}</strong>
              <span style="font-size:11.5px;color:var(--text-soft);">${esc(d.Especialidad || '—')}${d.Consultorio ? ' · Consultorio ' + esc(d.Consultorio) : ''}</span>
            </div>
            <button class="header-btn" style="padding:7px 14px;font-size:12.5px;" onclick="reasignarCita(${idCita}, ${d.idDoctor})">Asignar</button>
          </div>`).join('')
      : '<p style="text-align:center;color:#c03030;padding:18px;font-size:13px;">No hay otros doctores disponibles en ese horario. Cancela la cita o reprográmala.</p>';
  } catch {
    cont.innerHTML = '<p style="text-align:center;color:#c03030;padding:18px;font-size:13px;">Error al cargar disponibilidad.</p>';
  }
}

function cerrarReasignacion() {
  const modal = document.getElementById('modal-reasignacion');
  if (modal) modal.classList.remove('active');
}

async function reasignarCita(idCita, idDoctor) {
  try {
    const res  = await fetch(`/api/citas/${idCita}/reasignar`, {
      method: 'PATCH', headers: H, body: JSON.stringify({ idDoctor })
    });
    const data = await res.json();
    if (res.ok) {
      toast(data.message || 'Cita reasignada y confirmada.');
      cerrarReasignacion();
      cargarCitas();
      cargarStats();
    } else {
      toast('Error: ' + (data.error || 'No se pudo reasignar'), 'warn');
    }
  } catch {
    toast('Error de conexión.', 'error');
  }
}

async function cancelarSinDoctor(idCita) {
  if (!confirm('¿Cancelar esta cita por falta de doctores disponibles?')) return;
  try {
    const res  = await fetch(`/api/citas/${idCita}/cancelar-recepcion`, {
      method: 'PATCH', headers: H, body: JSON.stringify({ motivo: 'Sin doctores disponibles' })
    });
    const data = await res.json();
    if (res.ok) {
      toast('Cita cancelada.');
      cerrarReasignacion();
      cargarCitas();
      cargarStats();
    } else {
      toast('Error: ' + (data.error || 'No se pudo cancelar'), 'warn');
    }
  } catch {
    toast('Error de conexión.', 'error');
  }
}

// ── MODAL CITA ────────────────────────────────
function abrirModalCita() {
  document.getElementById('modal-cita-titulo').textContent = 'Nueva Cita';
  document.getElementById('cita-id').value                 = '';
  ['fecha','hora','motivo'].forEach(f => document.getElementById('cita-' + f).value = '');
  document.getElementById('cita-paciente').value        = '';
  document.getElementById('cita-paciente-nombre').value = '';
  document.getElementById('cita-doctor').value          = '';
  document.getElementById('cita-doctor-nombre').value   = '';
  document.getElementById('cita-estado').value          = 'PENDIENTE';
  document.getElementById('modal-cita').classList.add('active');
}

function abrirModalEditarCita(id) {
  const c = _mapCitasRec.get(id);
  if (!c) return;
  document.getElementById('modal-cita-titulo').textContent = 'Editar Cita';
  document.getElementById('cita-id').value       = c.idCita;
  document.getElementById('cita-fecha').value    = c.fecha ? c.fecha.split('T')[0] : '';
  document.getElementById('cita-hora').value     = c.hora       || '';
  document.getElementById('cita-paciente').value = c.idPaciente || '';
  document.getElementById('cita-doctor').value   = c.idDoctor   || '';
  document.getElementById('cita-estado').value   = c.estado     || 'PENDIENTE';
  document.getElementById('cita-motivo').value   = c.motivo     || '';

  // Auto-fill campos de texto visibles
  const nombrePac = c.NombrePaciente
    ? `${c.NombrePaciente} ${c.ApellidosPaciente || ''}`.trim()
    : '';
  const nombreDoc = c.NombreDoctor
    ? `${c.NombreDoctor} ${c.ApellidosDoctor || ''}`.trim()
    : '';
  document.getElementById('cita-paciente-nombre').value = nombrePac;
  document.getElementById('cita-doctor-nombre').value   = nombreDoc;

  document.getElementById('modal-cita').classList.add('active');
}

function cerrarModalCita() {
  document.getElementById('modal-cita').classList.remove('active');
}

async function guardarCita() {
  const id = document.getElementById('cita-id').value;
  const payload = {
    fecha:      document.getElementById('cita-fecha').value,
    hora:       document.getElementById('cita-hora').value,
    idPaciente: parseInt(document.getElementById('cita-paciente').value),
    idDoctor:   parseInt(document.getElementById('cita-doctor').value),
    estado:     document.getElementById('cita-estado').value,
    motivo:     document.getElementById('cita-motivo').value,
  };
  const url    = id ? `/api/citas/${id}` : '/api/citas';
  const method = id ? 'PUT' : 'POST';
  const res    = await fetch(url, { method, headers:H, body:JSON.stringify(payload) });
  const data   = await res.json();

  if (res.status === 409) { toast('' + data.error, 'warn'); return; }
  if (data.id || data.message) { cerrarModalCita(); cargarCitas(); }
  else toast('Error al guardar cita: ' + (data.error?.sqlMessage || data.error || 'Revisa los datos'), 'error');
}

// ── PACIENTES ─────────────────────────────────
async function cargarPacientesRecientes() {
  try {
    const res   = await fetch('/api/pacientes', { headers: H });
    const lista = await res.json();
    const recientes = Array.isArray(lista) ? lista.slice(-6).reverse() : [];
    document.getElementById('lista-recientes').innerHTML = recientes.length
      ? recientes.map(p => `
          <div style="padding:10px 0;border-bottom:1px solid rgba(0,0,0,0.05);">
            <strong>${esc(p.Nombres || '')} ${esc(p.Apellidos || '')}</strong><br>
            <span style="font-size:12px;color:#666;">Expediente: ${esc(p.numero_expediente || '')} | ID: ${p.idPaciente}</span>
          </div>`).join('')
      : '<p>Sin pacientes registrados.</p>';
  } catch (e) { console.error(e); }
}

async function buscarUsuarioPaciente() {
  const input       = document.getElementById('pac-usuario-nombre');
  const sugerencias = document.getElementById('sugerencias-usuario-paciente');
  const q = input.value.toLowerCase().trim();
  document.getElementById('pac-usuario').value = '';
  if (!q) { sugerencias.style.display = 'none'; return; }
  try {
    const res             = await fetch('/api/usuarios', { headers: H });
    const usuarios        = await res.json();
    const soloPacientes   = usuarios.filter(u => u.idRol === 30001);
    const resPac          = await fetch('/api/pacientes', { headers: H });
    const pacientesConExp = await resPac.json();
    const idsConExp       = pacientesConExp.map(p => p.idUsuario);
    const disponibles     = soloPacientes.filter(u => !idsConExp.includes(u.idUsuario));
    const filtrados       = disponibles.filter(u =>
      (`${u.Nombres || ''} ${u.Apellidos || ''}`).toLowerCase().includes(q));
    filtrados.forEach(u => _mapUsuPacRec.set(u.idUsuario, u));
    sugerencias.innerHTML = filtrados.length
      ? filtrados.map(u => `
          <div class="autocomplete-item"
            onclick="seleccionarUsuarioParaPaciente(${u.idUsuario})">
            <strong>${esc(u.Nombres || '')} ${esc(u.Apellidos || '')}</strong>
            <span>Sin expediente</span>
          </div>`).join('')
      : '<div class="autocomplete-item">Sin resultados</div>';
    sugerencias.style.display = 'block';
  } catch (e) { console.error(e); }
}

function seleccionarUsuarioParaPaciente(id) {
  const u = _mapUsuPacRec.get(id);
  const nombre = u ? `${u.Nombres || ''} ${u.Apellidos || ''}`.trim() : '';
  document.getElementById('pac-usuario-nombre').value = nombre;
  document.getElementById('pac-usuario').value        = id;
  document.getElementById('sugerencias-usuario-paciente').style.display = 'none';
}

async function registrarPaciente() {
  const payload = {
    numero_expediente:       document.getElementById('pac-exp').value,
    fecha_registro:          document.getElementById('pac-fecha').value,
    tipo_sangre:             document.getElementById('pac-sangre').value || null,
    contacto_emergencia:     document.getElementById('pac-contacto').value,
    parentesco_emergencia:   document.getElementById('pac-parentesco').value,
    telefono_emergencia:     document.getElementById('pac-tel').value,
    observaciones_generales: document.getElementById('pac-obs').value,
    estado_paciente:         document.getElementById('pac-estado').value,
    idUsuario:               parseInt(document.getElementById('pac-usuario').value),
  };
  const res  = await fetch('/api/pacientes', { method:'POST', headers:H, body:JSON.stringify(payload) });
  const data = await res.json();
  if (data.id) {
    toast('Paciente registrado correctamente');
    ['exp','contacto','parentesco','obs','usuario','usuario-nombre'].forEach(f =>
      document.getElementById('pac-' + f).value = '');
    document.getElementById('pac-sangre').value = '';
    cargarPacientesRecientes();
    iniciarBuscador();
    cargarListasAutocompletado();
  } else {
    toast('Error: ' + (data.message || data.error?.sqlMessage || 'No se pudo registrar'), 'error');
  }
}

// ── BUSCADOR GLOBAL ───────────────────────────
let todosPacientes = [];

async function iniciarBuscador() {
  try {
    const res  = await fetch('/api/pacientes', { headers: H });
    todosPacientes = await res.json();
  } catch {}
}

function buscarPaciente() {
  const q    = document.getElementById('q-global').value.toLowerCase().trim();
  const cont = document.getElementById('resultados-busqueda');
  if (!q) { cont.innerHTML = '<p style="text-align:center;color:gray;">Escribe para buscar...</p>'; return; }
  const resultados = todosPacientes.filter(p =>
    (`${p.Nombres || ''} ${p.Apellidos || ''}`).toLowerCase().includes(q) ||
    (p.numero_expediente || '').toLowerCase().includes(q) ||
    String(p.idPaciente).includes(q)
  );
  cont.innerHTML = resultados.length
    ? resultados.map(p => `
        <div class="resultado-item">
          <strong>${esc(p.Nombres || '')} ${esc(p.Apellidos || '')}</strong><br>
          <span>Exp: ${esc(p.numero_expediente || '')} | ID: ${p.idPaciente}</span>
        </div>`).join('')
    : `<p style="text-align:center;color:gray;">No se encontró "${esc(q)}"</p>`;
}

// ── AUTOCOMPLETADO CITAS ──────────────────────
let listaPacientes = [];
let listaDoctores  = [];

async function cargarListasAutocompletado() {
  try {
    const [pRes, dRes] = await Promise.all([
      fetch('/api/pacientes',        { headers: H }),
      fetch('/api/doctores/activos', { headers: H }),
    ]);
    listaPacientes = await pRes.json();
    listaDoctores  = await dRes.json();
  } catch {}
}

function buscarAutocompletado(tipo) {
  const inputNombre = document.getElementById(`cita-${tipo}-nombre`);
  const sugerencias = document.getElementById(`sugerencias-${tipo}`);
  const q = inputNombre.value.toLowerCase().trim();
  if (!q) { sugerencias.style.display = 'none'; return; }

  if (tipo === 'paciente') {
    const lista = Array.isArray(listaPacientes)
      ? listaPacientes.filter(p =>
          (p.numero_expediente || '').toLowerCase().includes(q) ||
          (`${p.Nombres || ''} ${p.Apellidos || ''}`).toLowerCase().includes(q) ||
          String(p.idPaciente).includes(q))
      : [];
    lista.forEach(p => _mapPacAutoRec.set(p.idPaciente, p));
    sugerencias.innerHTML = lista.length
      ? lista.map(p => `
          <div class="autocomplete-item" onclick="seleccionar('paciente', ${p.idPaciente})">
            <strong>${esc(p.Nombres || '')} ${esc(p.Apellidos || '')}</strong>
            <span>Exp: ${esc(p.numero_expediente || '')} · ${esc(p.estado_paciente || '')}</span>
          </div>`).join('')
      : '<div class="autocomplete-item">Sin resultados</div>';
  }

  if (tipo === 'doctor') {
    const lista = Array.isArray(listaDoctores)
      ? listaDoctores.filter(d =>
          (`${d.Nombres || ''} ${d.Apellidos || ''}`).toLowerCase().includes(q) ||
          (d.Especialidad || '').toLowerCase().includes(q))
      : [];
    lista.forEach(d => _mapDocAutoRec.set(d.idDoctor, d));
    sugerencias.innerHTML = lista.length
      ? lista.map(d => `
          <div class="autocomplete-item" onclick="seleccionar('doctor', ${d.idDoctor})">
            <strong>${esc(d.Nombres || '')} ${esc(d.Apellidos || '')}</strong>
            <span>${esc(d.Especialidad || '')}</span>
          </div>`).join('')
      : '<div class="autocomplete-item">Sin resultados</div>';
  }
  sugerencias.style.display = 'block';
}

function seleccionar(tipo, id) {
  let nombre = '';
  if (tipo === 'paciente') {
    const p = _mapPacAutoRec.get(id);
    nombre = p ? `${p.Nombres || ''} ${p.Apellidos || ''}`.trim() : '';
  } else if (tipo === 'doctor') {
    const d = _mapDocAutoRec.get(id);
    nombre = d ? `${d.Nombres || ''} ${d.Apellidos || ''}`.trim() : '';
  }
  document.getElementById(`cita-${tipo}-nombre`).value = nombre;
  document.getElementById(`cita-${tipo}`).value        = id;
  document.getElementById(`sugerencias-${tipo}`).style.display = 'none';
}

// ── AUTOCOMPLETADO USUARIO DOCTOR ─────────────
let listaUsuariosDoctores = [];

async function cargarUsuariosDoctores() {
  try {
    const res   = await fetch('/api/usuarios', { headers: H });
    const todos = await res.json();
    listaUsuariosDoctores = Array.isArray(todos) ? todos.filter(u => u.idRol === 30002) : [];
  } catch {}
}

function buscarUsuarioDoctor() {
  const input       = document.getElementById('md-usuario-nombre');
  const sugerencias = document.getElementById('sugerencias-usuario-doctor');
  const q = input.value.toLowerCase().trim();
  if (!q) { sugerencias.style.display = 'none'; return; }
  const lista = listaUsuariosDoctores.filter(u =>
    (`${u.Nombres || ''} ${u.Apellidos || ''}`).toLowerCase().includes(q) ||
    (u.Email || '').toLowerCase().includes(q)
  );
  lista.forEach(u => _mapDocUsrRec.set(u.idUsuario, u));
  sugerencias.innerHTML = lista.length
    ? lista.map(u => `
        <div class="autocomplete-item" onclick="seleccionarUsuarioDoctor(${u.idUsuario})">
          <strong>${esc(u.Nombres || '')} ${esc(u.Apellidos || '')}</strong>
          <span>${esc(u.Email || '')}</span>
        </div>`).join('')
    : '<div class="autocomplete-item">Sin resultados</div>';
  sugerencias.style.display = 'block';
}

function seleccionarUsuarioDoctor(id) {
  const u = _mapDocUsrRec.get(id);
  const nombre = u ? `${u.Nombres || ''} ${u.Apellidos || ''}`.trim() : '';
  document.getElementById('md-usuario-nombre').value = nombre;
  document.getElementById('md-usuario').value        = id;
  document.getElementById('sugerencias-usuario-doctor').style.display = 'none';
}

document.addEventListener('click', (e) => {
  ['paciente','doctor'].forEach(tipo => {
    const input = document.getElementById(`cita-${tipo}-nombre`);
    const sug   = document.getElementById(`sugerencias-${tipo}`);
    if (input && sug && !input.contains(e.target) && !sug.contains(e.target))
      sug.style.display = 'none';
  });
  const inputMd = document.getElementById('md-usuario-nombre');
  const sugMd   = document.getElementById('sugerencias-usuario-doctor');
  if (inputMd && sugMd && !inputMd.contains(e.target) && !sugMd.contains(e.target))
    sugMd.style.display = 'none';
  const inputPac = document.getElementById('pac-usuario-nombre');
  const sugPac   = document.getElementById('sugerencias-usuario-paciente');
  if (inputPac && sugPac && !inputPac.contains(e.target) && !sugPac.contains(e.target))
    sugPac.style.display = 'none';
});

// ── MÉDICOS ───────────────────────────────────
let todosMedicos   = [];
let tabMedicActual = 'todos';

async function cargarMedicos() {
  try {
    const res    = await fetch('/api/doctores', { headers: H });
    todosMedicos = await res.json();
    renderMedicos(todosMedicos);
  } catch {
    document.getElementById('tbody-medicos').innerHTML =
      '<tr><td colspan="7" style="text-align:center;color:#c03030;padding:20px;">Error al cargar médicos</td></tr>';
  }
}

function renderMedicos(lista) {
  if (!Array.isArray(lista) || !lista.length) {
    document.getElementById('tbody-medicos').innerHTML =
      '<tr><td colspan="7" style="text-align:center;color:var(--text-soft);padding:20px;">Sin médicos registrados</td></tr>';
    return;
  }
  lista.forEach(d => _mapMedicosRec.set(d.idDoctor, d));
  document.getElementById('tbody-medicos').innerHTML = lista.map(d => {
    const esActivo = d.Estado === 'ACTIVO';
    const horario  = (d.hora_inicio && d.hora_fin)
      ? `<span class="horario-chip"><span class="material-symbols-outlined">schedule</span> ${d.hora_inicio.substring(0,5)} – ${d.hora_fin.substring(0,5)}</span>`
      : (d.Horario || '<span style="color:var(--text-soft);font-size:12px;">Sin horario</span>');
    return `
      <tr>
        <td>#${d.idDoctor}</td>
        <td><strong>${esc(d.Nombres || '—')} ${esc(d.Apellidos || '')}</strong></td>
        <td>${esc(d.Especialidad || '—')}</td>
        <td style="font-size:12.5px;font-family:monospace;">${esc(d.numero_junta_medica || '—')}</td>
        <td>${horario}</td>
        <td><span class="badge-estado--${esActivo ? 'activo' : 'inactivo'}">${d.Estado}</span></td>
        <td>
          <div class="action-icons">
            <button class="icon-btn icon-btn--edit" title="Editar" onclick="abrirModalEditarMedico(${d.idDoctor})"><span class="material-symbols-outlined">edit</span></button>
            <button class="icon-btn icon-btn--toggle" title="${esActivo ? 'Desactivar' : 'Activar'}" onclick="toggleMedico(${d.idDoctor}, ${esActivo})">
              ${esActivo ? iconHtml('toggle_off') : iconHtml('toggle_on')}
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function setTabMedicos(filtro, btn) {
  tabMedicActual = filtro;
  document.querySelectorAll('#sec-medicos .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const lista = filtro === 'todos' ? todosMedicos : todosMedicos.filter(d => d.Estado === filtro);
  renderMedicos(lista);
}

function filtrarMedicos() {
  const q    = document.getElementById('q-medicos').value.toLowerCase();
  const base = tabMedicActual === 'todos' ? todosMedicos : todosMedicos.filter(d => d.Estado === tabMedicActual);
  renderMedicos(base.filter(d =>
    (`${d.Nombres || ''} ${d.Apellidos || ''}`).toLowerCase().includes(q) ||
    (d.Especialidad        || '').toLowerCase().includes(q) ||
    (d.numero_junta_medica || '').toLowerCase().includes(q)
  ));
}

function abrirModalMedico() {
  document.getElementById('modal-medico-titulo').textContent = 'Nuevo Médico';
  document.getElementById('md-id').value           = '';
  document.getElementById('md-especialidad').value = '';
  document.getElementById('md-junta').value        = '';
  document.getElementById('md-consultorio').value  = '';
  document.getElementById('md-telefono').value     = '';
  document.getElementById('md-hora-inicio').value  = '';
  document.getElementById('md-hora-fin').value     = '';
  document.getElementById('md-estado').value       = 'ACTIVO';
  document.getElementById('md-usuario').value      = '';
  document.getElementById('md-usuario-nombre').value = '';
  document.getElementById('modal-medico').classList.add('active');
}

function abrirModalEditarMedico(id) {
  const d = _mapMedicosRec.get(id);
  if (!d) return;
  document.getElementById('modal-medico-titulo').textContent = 'Editar Médico';
  document.getElementById('md-id').value           = d.idDoctor;
  document.getElementById('md-especialidad').value = d.Especialidad        || '';
  document.getElementById('md-junta').value        = d.numero_junta_medica || '';
  document.getElementById('md-consultorio').value  = d.Consultorio         || '';
  document.getElementById('md-telefono').value     = d.Telefono            || '';
  document.getElementById('md-hora-inicio').value  = d.hora_inicio ? d.hora_inicio.substring(0,5) : '';
  document.getElementById('md-hora-fin').value     = d.hora_fin    ? d.hora_fin.substring(0,5)    : '';
  document.getElementById('md-estado').value       = d.Estado              || 'ACTIVO';
  document.getElementById('md-usuario').value      = d.idUsuario           || '';
  document.getElementById('md-usuario-nombre').value = d.Nombres ? `${d.Nombres} ${d.Apellidos}` : '';
  document.getElementById('modal-medico').classList.add('active');
}

function cerrarModalMedico() {
  document.getElementById('modal-medico').classList.remove('active');
}

async function guardarMedico() {
  const id         = document.getElementById('md-id').value;
  const horaInicio = document.getElementById('md-hora-inicio').value;
  const horaFin    = document.getElementById('md-hora-fin').value;
  if (!document.getElementById('md-especialidad').value) { toast('La especialidad es obligatoria.', 'warn'); return; }
  if (horaInicio && horaFin && horaInicio >= horaFin) { toast('La hora de fin debe ser posterior a la hora de inicio.', 'warn'); return; }
  const payload = {
    Especialidad:        document.getElementById('md-especialidad').value,
    numero_junta_medica: document.getElementById('md-junta').value      || null,
    Consultorio:         document.getElementById('md-consultorio').value || null,
    Telefono:            document.getElementById('md-telefono').value    || null,
    hora_inicio:         horaInicio || null,
    hora_fin:            horaFin    || null,
    Estado:              document.getElementById('md-estado').value,
    idUsuario:           parseInt(document.getElementById('md-usuario').value) || null,
  };
  const url    = id ? `/api/doctores/${id}` : '/api/doctores';
  const method = id ? 'PUT' : 'POST';
  const res    = await fetch(url, { method, headers:H, body:JSON.stringify(payload) });
  const data   = await res.json();
  if (res.status === 409) { toast('' + data.error, 'warn'); return; }
  if (data.message || data.id) { cerrarModalMedico(); cargarMedicos(); cargarListasAutocompletado(); }
  else toast('Error: ' + (data.error?.sqlMessage || data.error || 'Revisa los datos'), 'error');
}

async function toggleMedico(id, estaActivo) {
  const accion  = estaActivo ? 'desactivar' : 'activar';
  const mensaje = estaActivo
    ? '¿Desactivar este médico? No aparecerá disponible para agendar citas.'
    : '¿Activar este médico?';
  if (!confirm(mensaje)) return;
  const res  = await fetch(`/api/doctores/${id}/${accion}`, { method:'PATCH', headers:H });
  const data = await res.json();
  if (data.message) { cargarMedicos(); cargarListasAutocompletado(); }
  else toast('Error: ' + (data.error || ''), 'error');
}

// ── PRECONSULTA ───────────────────────────────────────────────────────────────

let _prePaciente = null;
let _preCita     = null;

async function preIniciarSeccion() {
  if (!listaPacientes.length) await cargarListasAutocompletado();
  preLimpiarFormulario();
  preCargarUltimas();
}

function preLimpiarFormulario() {
  _prePaciente = null;
  _preCita     = null;
  document.getElementById('pre-buscar-paciente').value         = '';
  document.getElementById('pre-sug-paciente').style.display    = 'none';
  document.getElementById('pre-bloque-citas').style.display    = 'none';
  document.getElementById('pre-cita-badge').style.display      = 'none';
  document.getElementById('pre-bloque-vitales').style.display  = 'none';
  document.getElementById('pre-panel-historial').style.display = 'none';
  document.getElementById('pre-alerta-alergias').style.display = 'none';
  document.getElementById('pre-lista-citas').innerHTML         = '';
  document.getElementById('pre-datos-paciente').innerHTML      = '';
  ['pre-peso','pre-altura','pre-presion','pre-temp',
   'pre-fc','pre-sat','pre-motivo','pre-obs',
   'pre-id-cita','pre-id-historial'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

let _preSugTimer = null;
function preBuscarPaciente() {
  clearTimeout(_preSugTimer);
  _preSugTimer = setTimeout(_preDoBuscar, 250);
}

function _preDoBuscar() {
  const input = document.getElementById('pre-buscar-paciente');
  const lista = document.getElementById('pre-sug-paciente');
  const q     = input.value.toLowerCase().trim();
  if (!q) { lista.style.display = 'none'; return; }
  const pacs = Array.isArray(listaPacientes)
    ? listaPacientes.filter(p =>
        `${p.Nombres} ${p.Apellidos}`.toLowerCase().includes(q) ||
        (p.numero_expediente || '').toLowerCase().includes(q))
    : [];
  pacs.slice(0,8).forEach(p => _mapPrePacRec.set(p.idPaciente, p));
  lista.innerHTML = pacs.length
    ? pacs.slice(0,8).map(p => `
        <div class="autocomplete-item"
          onclick="preSeleccionarPaciente(${p.idPaciente})">
          <strong>${esc(p.Nombres || '')} ${esc(p.Apellidos || '')}</strong>
          <span>Exp: ${esc(p.numero_expediente || '–')} · ${esc(p.tipo_sangre || 'N/A')}</span>
        </div>`).join('')
    : '<div class="autocomplete-item" style="color:var(--text-soft);">Sin resultados</div>';
  lista.style.display = 'block';
}

async function preSeleccionarPaciente(idPaciente) {
  const p = _mapPrePacRec.get(idPaciente);
  if (!p) return;
  const nombre = `${p.Nombres || ''} ${p.Apellidos || ''}`.trim();
  _prePaciente = { idPaciente, nombre, idUsuario: p.idUsuario };
  document.getElementById('pre-buscar-paciente').value        = nombre;
  document.getElementById('pre-sug-paciente').style.display   = 'none';
  document.getElementById('pre-bloque-citas').style.display   = 'block';
  document.getElementById('pre-lista-citas').innerHTML        =
    '<p style="font-size:12.5px;color:var(--text-soft);">Cargando citas...</p>';
  document.getElementById('pre-cita-badge').style.display     = 'none';
  document.getElementById('pre-bloque-vitales').style.display = 'none';

  preRenderDatosPaciente(p);

  const alertEl = document.getElementById('pre-alerta-alergias');
  if (p.alergias) {
    alertEl.innerHTML     = `Alergias registradas: <strong>${esc(p.alergias)}</strong>`;
    alertEl.style.display = 'block';
  } else {
    alertEl.style.display = 'none';
  }

  try {
    const res   = await fetch(`/api/citas/paciente/${p.idUsuario}`, { headers: H });
    const citas = await res.json();
    const activas = Array.isArray(citas)
      ? citas.filter(c => ['PENDIENTE','CONFIRMADA'].includes(c.estado)) : [];
    activas.forEach(c => _mapPreCitaRec.set(c.idCita, c));
    document.getElementById('pre-lista-citas').innerHTML = activas.length
      ? activas.map(c => `
          <div class="pre-cita-item"
            onclick="preElegirCita(${c.idCita})">
            <strong>${esc(c.fecha ? c.fecha.split('T')[0] : '–')} · ${esc(c.hora ? c.hora.substring(0,5) : '–')}</strong>
            <span>${esc(c.motivo || 'Sin motivo especificado')} · ${esc(c.estado || '')}</span>
          </div>`).join('')
      : '<p style="font-size:12.5px;color:var(--text-soft);">No hay citas activas (PENDIENTE/CONFIRMADA) para este paciente</p>';
  } catch {
    document.getElementById('pre-lista-citas').innerHTML =
      '<p style="font-size:12.5px;color:#c03030;">Error al cargar citas</p>';
  }
}

async function preElegirCita(idCita) {
  const c      = _mapPreCitaRec.get(idCita);
  const fecha  = c?.fecha  ? c.fecha.split('T')[0]   : '';
  const hora   = c?.hora   ? c.hora.substring(0,5)   : '';
  const motivo = c?.motivo || '';

  let idHistorial = null;
  try {
    const res  = await fetch(`/api/historial/by-paciente?idPaciente=${_prePaciente.idPaciente}`, { headers: H });
    const data = await res.json();
    const h    = Array.isArray(data) ? data[0] : data;
    idHistorial = h?.idHistorial || null;
  } catch {}

  _preCita = { idCita, fecha, hora, motivo, idHistorial };
  document.getElementById('pre-id-cita').value      = idCita;
  document.getElementById('pre-id-historial').value = idHistorial || '';
  document.getElementById('pre-bloque-citas').style.display   = 'none';
  document.getElementById('pre-bloque-vitales').style.display = 'block';
  if (motivo) document.getElementById('pre-motivo').value = motivo;

  const badge = document.getElementById('pre-cita-badge');
  badge.style.display = 'block';
  badge.innerHTML = `
    Cita seleccionada: <strong>${esc(_prePaciente.nombre)}</strong>
    · ${esc(fecha)} ${esc(hora)} · Cita #${idCita}
    <button onclick="preCambiarCita()"
      style="margin-left:10px;padding:3px 10px;border:1px solid var(--border);
        border-radius:7px;background:transparent;font-size:11px;cursor:pointer;color:var(--text-soft);">
      <span class="material-symbols-outlined">close</span> Cambiar
    </button>`;
}

function preCambiarCita() {
  _preCita = null;
  document.getElementById('pre-bloque-citas').style.display   = 'block';
  document.getElementById('pre-bloque-vitales').style.display = 'none';
  document.getElementById('pre-cita-badge').style.display     = 'none';
  document.getElementById('pre-id-cita').value                = '';
  document.getElementById('pre-id-historial').value           = '';
}

function preRenderDatosPaciente(p) {
  const panel = document.getElementById('pre-panel-historial');
  const cont  = document.getElementById('pre-datos-paciente');
  if (!p) { panel.style.display = 'none'; return; }
  panel.style.display = 'block';
  cont.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
      <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,var(--teal),var(--teal-light));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:17px;flex-shrink:0;">
        ${esc((p.Nombres || 'P')[0])}
      </div>
      <div>
        <strong style="display:block;font-size:14px;color:var(--deep);">${esc(p.Nombres || '')} ${esc(p.Apellidos || '')}</strong>
        <span style="font-size:12px;color:var(--text-soft);">Exp: ${esc(p.numero_expediente || '–')}</span>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;">
      <div style="padding:8px 10px;background:var(--cream);border-radius:10px;">
        <span style="font-size:10.5px;color:var(--text-soft);display:block;">Tipo de Sangre</span>
        <strong style="color:var(--deep);">${esc(p.tipo_sangre || 'N/A')}</strong>
      </div>
      <div style="padding:8px 10px;background:var(--cream);border-radius:10px;">
        <span style="font-size:10.5px;color:var(--text-soft);display:block;">Estado</span>
        <strong style="color:var(--deep);">${esc(p.estado_paciente || '–')}</strong>
      </div>
      <div style="padding:8px 10px;background:var(--cream);border-radius:10px;grid-column:1/-1;">
        <span style="font-size:10.5px;color:var(--text-soft);display:block;">Contacto Emergencia</span>
        <strong style="color:var(--deep);">${esc(p.contacto_emergencia || 'No registrado')}</strong>
        ${p.telefono_emergencia ? `<span style="font-size:11.5px;color:var(--text-soft);"> · ${esc(p.telefono_emergencia)}</span>` : ''}
      </div>
      ${p.alergias ? `
      <div style="padding:8px 10px;background:rgba(200,50,50,0.06);border:1.5px solid rgba(200,50,50,0.15);border-radius:10px;grid-column:1/-1;">
        <span style="font-size:10.5px;color:#c03030;display:block;font-weight:700;">Alergias</span>
        <strong style="color:#c03030;">${esc(p.alergias)}</strong>
      </div>` : ''}
      ${p.padecimientos_cronicos ? `
      <div style="padding:8px 10px;background:var(--cream);border-radius:10px;grid-column:1/-1;">
        <span style="font-size:10.5px;color:var(--text-soft);display:block;">Padecimientos Crónicos</span>
        <strong style="color:var(--deep);">${esc(p.padecimientos_cronicos)}</strong>
      </div>` : ''}
    </div>`;
}

// ── ALERTAS EN TIEMPO REAL ────────────────────
function alertarVital(campo, valor) {
  const el = document.getElementById('alerta-' + campo);
  if (!el) return;
  const v = parseFloat(valor);

  const mostrar = (msg, tipo) => {
    el.textContent  = msg;
    el.className    = 'vital-alerta vital-alerta--' + tipo;
    el.style.display = msg ? 'block' : 'none';
  };

  if (!valor || isNaN(v)) { el.style.display = 'none'; return; }

  if (campo === 'sat') {
    if      (v < 90) mostrar(`SpO₂ crítico (${v}%) — posible hipoxemia severa`, 'danger');
    else if (v < 94) mostrar(`SpO₂ bajo (${v}%) — monitorizar`, 'warn');
    else             mostrar('', '');
  } else if (campo === 'fc') {
    if      (v > 120) mostrar(`Taquicardia severa (${v} lpm)`, 'danger');
    else if (v > 100) mostrar(`Taquicardia leve (${v} lpm)`, 'warn');
    else if (v < 50)  mostrar(`Bradicardia severa (${v} lpm)`, 'danger');
    else if (v < 60)  mostrar(`Bradicardia leve (${v} lpm)`, 'warn');
    else              mostrar('', '');
  } else if (campo === 'temp') {
    if      (v < 35)   mostrar(`Hipotermia (${v}°C)`, 'danger');
    else if (v < 36)   mostrar(`Temperatura baja (${v}°C)`, 'warn');
    else if (v > 38.5) mostrar(`Fiebre alta (${v}°C)`, 'danger');
    else if (v > 37.5) mostrar(`Febrícula (${v}°C)`, 'warn');
    else               mostrar('', '');
  } else if (campo === 'presion') {
    const m = String(valor).match(/^(\d{2,3})\/(\d{2,3})$/);
    if (!m) { el.style.display = 'none'; return; }
    const sis = parseInt(m[1]), dia = parseInt(m[2]);
    if      (sis >= 180 || dia >= 110) mostrar(`Hipertensión severa (${valor}) — urgencia`, 'danger');
    else if (sis >= 140 || dia >= 90)  mostrar(`Hipertensión grado 1 (${valor})`, 'warn');
    else if (sis < 90  || dia < 60)   mostrar(`Hipotensión (${valor})`, 'danger');
    else                               mostrar('', '');
  } else if (campo === 'peso' || campo === 'altura') {
    // Calcular IMC si ambos están llenos
    const peso   = parseFloat(document.getElementById('pre-peso').value);
    const altura = parseFloat(document.getElementById('pre-altura').value);
    const elImc  = document.getElementById('alerta-imc');
    if (elImc && peso > 0 && altura > 0) {
      const imc = (peso / Math.pow(altura / 100, 2)).toFixed(1);
      let cat = '';
      if      (imc < 18.5) cat = 'Bajo peso';
      else if (imc < 25)   cat = 'Normal';
      else if (imc < 30)   cat = 'Sobrepeso';
      else                 cat = 'Obesidad';
      elImc.textContent  = `IMC: ${imc} — ${cat}`;
      elImc.className    = 'vital-alerta vital-alerta--' + (imc < 18.5 || imc >= 25 ? 'info' : 'ok');
      elImc.style.display = 'block';
    } else if (elImc) {
      elImc.style.display = 'none';
    }
    el.style.display = 'none';
  }
}

let _enviandoPreconsulta = false;
async function guardarPreconsulta() {
  if (_enviandoPreconsulta) return;     // evita doble submit
  if (!_prePaciente) { toast('Selecciona un paciente primero.', 'warn'); return; }
  if (!_preCita)     { toast('Selecciona la cita a atender.', 'warn'); return; }

  const peso    = parseFloat(document.getElementById('pre-peso').value)    || null;
  const altura  = parseFloat(document.getElementById('pre-altura').value)  || null;
  const presion = document.getElementById('pre-presion').value.trim()      || null;
  const temp    = parseFloat(document.getElementById('pre-temp').value)    || null;
  const fc      = parseInt(document.getElementById('pre-fc').value)        || null;
  const sat     = parseFloat(document.getElementById('pre-sat').value)     || null;
  const motivo  = document.getElementById('pre-motivo').value.trim();
  const obs     = document.getElementById('pre-obs').value.trim();

  if (!presion && !peso && !temp) {
    toast('Ingresa al menos un signo vital (presión, peso o temperatura).', 'warn');
    return;
  }

  // ── Validaciones de rango clínico ──────────────────────────────────────────
  const erroresClinico = [];

  if (peso !== null) {
    if (peso < 0.5 || peso > 500)
      erroresClinico.push(`Peso fuera de rango: ${peso} kg (0.5–500 kg)`);
  }
  if (altura !== null) {
    if (altura < 20 || altura > 250)
      erroresClinico.push(`Talla fuera de rango: ${altura} cm (20–250 cm)`);
  }
  if (temp !== null) {
    if (temp < 32 || temp > 43)
      erroresClinico.push(`Temperatura fuera de rango: ${temp}°C (32–43°C)`);
  }
  if (fc !== null) {
    if (fc < 30 || fc > 250)
      erroresClinico.push(`FC fuera de rango: ${fc} lpm (30–250 lpm)`);
  }
  if (sat !== null) {
    if (sat < 50 || sat > 100)
      erroresClinico.push(`SpO₂ fuera de rango: ${sat}% (50–100%)`);
  }
  if (presion) {
    const matchPres = presion.match(/^(\d{2,3})\/(\d{2,3})$/);
    if (!matchPres) {
      erroresClinico.push(`Formato de presión inválido: "${presion}". Use 120/80`);
    } else {
      const sistolica  = parseInt(matchPres[1]);
      const diastolica = parseInt(matchPres[2]);
      if (sistolica < 50 || sistolica > 300)
        erroresClinico.push(`Presión sistólica fuera de rango: ${sistolica} (50–300)`);
      if (diastolica < 30 || diastolica > 200)
        erroresClinico.push(`Presión diastólica fuera de rango: ${diastolica} (30–200)`);
      if (diastolica >= sistolica)
        erroresClinico.push(`Diastólica (${diastolica}) ≥ sistólica (${sistolica})`);
    }
  }

  if (erroresClinico.length) {
    toast('Datos fuera de rango: ' + erroresClinico.join(' | '), 'warn');
    return;
  }
  // ── Fin validaciones ───────────────────────────────────────────────────────

  _enviandoPreconsulta = true;
  try {
    // Verificar duplicado eficientemente: solo consulta esa cita
    const checkRes = await fetch(`/api/consultas/by-cita/${_preCita.idCita}`, { headers: H });
    const yaExiste = await checkRes.json();

    if (yaExiste && yaExiste.idConsulta) {
      if (!confirm('Ya existe una preconsulta para esta cita. ¿Deseas actualizarla?')) return;
      const payload = {
        peso, altura, presion_arterial: presion, temperatura: temp,
        observaciones: [motivo, obs, fc ? `FC: ${fc} lpm` : '', sat ? `SpO2: ${sat}%` : '']
          .filter(Boolean).join(' | ') || null,
      };
      const res  = await fetch(`/api/consultas/${yaExiste.idConsulta}`, { method:'PUT', headers:H, body:JSON.stringify(payload) });
      const data = await res.json();
      if (data.message) { toast('Preconsulta actualizada correctamente.'); preLimpiarFormulario(); preCargarUltimas(); cargarStats(); }
      else toast('Error: ' + (data.error?.sqlMessage || data.error || 'No se pudo actualizar'), 'error');
      return;
    }

    if (!_preCita.idHistorial) {
      toast('Este paciente no tiene historial clínico registrado. Debe registrarse antes de la preconsulta.', 'warn');
      return;
    }

    const obsCompleto = [motivo, obs, fc ? `FC: ${fc} lpm` : '', sat ? `SpO2: ${sat}%` : '']
      .filter(Boolean).join(' | ') || null;

    const payload = {
      fecha_consulta:   new Date().toISOString().slice(0,19).replace('T',' '),
      peso, altura,
      presion_arterial: presion,
      temperatura:      temp,
      observaciones:    obsCompleto,
      idHistorial:      _preCita.idHistorial,
      idCita:           _preCita.idCita,
    };

    const res  = await fetch('/api/consultas', { method:'POST', headers:H, body:JSON.stringify(payload) });
    const data = await res.json();

    if (data.id) {
      toast(`Preconsulta registrada para ${_prePaciente.nombre}.`);
      preLimpiarFormulario();
      preCargarUltimas();
      cargarStats();
    } else {
      toast('Error: ' + (data.error?.sqlMessage || data.error || 'No se pudo registrar'), 'error');
    }
  } catch (err) {
    toast('Error de conexión.', 'error');
    console.error(err);
  } finally {
    _enviandoPreconsulta = false;
  }
}

async function preCargarUltimas() {
  try {
    const res  = await fetch('/api/consultas/recientes?limit=6', { headers: H });
    const data = await res.json();
    const cont = document.getElementById('pre-ultimas');
    if (!cont) return;
    cont.innerHTML = Array.isArray(data) && data.length
      ? data.map(c => `
          <div class="pre-historial-item">
            <strong>${c.NombrePaciente ? `${esc(c.NombrePaciente)} ${esc(c.ApellidosPaciente || '')}` : `Cita #${c.idCita}`}</strong>
            <span>
              ${c.fecha_consulta ? c.fecha_consulta.split('T')[0] : '–'}
              ${c.peso ? '· ' + c.peso + ' kg' : ''}
              ${c.presion_arterial ? '· ' + esc(c.presion_arterial) : ''}
              ${c.temperatura ? '· ' + c.temperatura + '°C' : ''}
            </span>
          </div>`).join('')
      : '<p style="color:var(--text-soft);font-size:13px;">Sin preconsultas registradas</p>';
  } catch {}
}

document.addEventListener('click', (e) => {
  const inp = document.getElementById('pre-buscar-paciente');
  const sug = document.getElementById('pre-sug-paciente');
  if (inp && sug && !inp.contains(e.target) && !sug.contains(e.target))
    sug.style.display = 'none';
});

// ── CERRAR SESIÓN ─────────────────────────────
function cerrarSesion() {
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('usuario');
  window.location.href = '/';
}
// ── INIT ──────────────────────────────────────
cargarStats();
iniciarBuscador();
cargarListasAutocompletado();
cargarUsuariosDoctores();
preCargarUltimas();

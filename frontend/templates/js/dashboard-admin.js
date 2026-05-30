// ══════════════════════════════════════════════
//  DASHBOARD ADMINISTRADOR — dashboard-admin.js
// ══════════════════════════════════════════════

// ── AUTH ──────────────────────────────────────
const usuario = JSON.parse(sessionStorage.getItem('usuario') || 'null');
if (!usuario || usuario.rol !== 1) {
  window.location.href = '/';
}

if (usuario) {
  const nombre = usuario.nombre || 'Admin';
  document.getElementById('nombre-admin').textContent  = nombre;
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
const _mapUsuarios   = new Map();
const _mapMedicosAdm = new Map();
const _mapMedsAdm    = new Map();
const _mapDocUsrAdm  = new Map();

// ── NAVEGACIÓN — hook de reportes integrado ───
function nav(seccion, linkEl) {
  document.querySelectorAll('[id^="sec-"]').forEach(s => s.style.display = 'none');
  document.getElementById('sec-' + seccion).style.display = 'block';
  document.querySelectorAll('.nav-item').forEach(a => a.classList.remove('active'));
  if (linkEl) linkEl.classList.add('active');

  if (seccion === 'usuarios')   cargarUsuarios();
  if (seccion === 'medicos')    cargarMedicos();
  if (seccion === 'roles')      cargarRoles();
  if (seccion === 'logs')       { cargarLogs(); cargarInventarioCritico(); }
  if (seccion === 'inventario') cargarInventario();
  if (seccion === 'reportes')  iniciarReportes(); // ← HU12
}

// ── STATS ─────────────────────────────────────
async function cargarStats() {
  cargarResumen(); // cubre s-pacientes, citasHoy, médicos, alertas via /api/metricas/resumen
  try {
    const res     = await fetch('/api/usuarios', { headers: H });
    const usuarios = await res.json();
    const el = document.getElementById('s-usuarios');
    if (el) el.textContent = Array.isArray(usuarios) ? usuarios.length : '—';
  } catch { /* sin datos */ }
}

// ── USUARIOS ──────────────────────────────────
let todosUsuarios = [];
let tabActual     = 'todos';

async function cargarUsuarios() {
  try {
    const res     = await fetch('/api/usuarios', { headers: H });
    todosUsuarios = await res.json();
    renderUsuarios(todosUsuarios);
  } catch {
    document.getElementById('tbody-usuarios').innerHTML =
      '<tr><td colspan="6" style="text-align:center;color:#c03030;padding:20px;">Error al cargar usuarios</td></tr>';
  }
}

function rolLabel(rol) {
  const mapa = { 1:'Admin', 30002:'Doctor', 30003:'Recepcionista', 30001:'Paciente' };
  return mapa[rol] || rol;
}

function rolClass(rol) {
  const mapa = { 1:'admin', 30002:'medico', 30003:'recep', 30001:'pac' };
  return mapa[rol] || 'pac';
}

function renderUsuarios(lista) {
  if (!Array.isArray(lista) || !lista.length) {
    document.getElementById('tbody-usuarios').innerHTML =
      '<tr><td colspan="6" style="text-align:center;color:var(--text-soft);padding:20px;">Sin usuarios</td></tr>';
    return;
  }
  lista.forEach(u => _mapUsuarios.set(u.idUsuario, u));
  document.getElementById('tbody-usuarios').innerHTML = lista.map(u => `
    <tr>
      <td>#${u.idUsuario}</td>
      <td>${esc(u.Nombres || '')} ${esc(u.Apellidos || '')}</td>
      <td>${esc(u.Email || '')}</td>
      <td><span class="badge-rol badge-rol--${rolClass(u.idRol)}">${rolLabel(u.idRol)}</span></td>
      <td><span class="badge badge--${u.Estado === 'ACTIVO' ? 'activo' : 'inactivo'}">${u.Estado || '—'}</span></td>
      <td>
        <div class="action-icons">
          <button class="icon-btn icon-btn--edit" title="Editar" onclick="abrirModalEditar(${u.idUsuario})">✏️</button>
          <button class="icon-btn icon-btn--del"  title="Eliminar" onclick="eliminarUsuario(${u.idUsuario})">🗑</button>
        </div>
      </td>
    </tr>`).join('');
}

function setTab(filtro, btn) {
  tabActual = filtro;
  document.querySelectorAll('#sec-usuarios .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const lista = filtro === 'todos' ? todosUsuarios
    : todosUsuarios.filter(u => rolLabel(u.idRol) === filtro);
  renderUsuarios(lista);
}

function filtrarUsuarios() {
  const q = document.getElementById('q-usuarios').value.toLowerCase();
  const base = tabActual === 'todos' ? todosUsuarios
    : todosUsuarios.filter(u => rolLabel(u.idRol) === tabActual);
  renderUsuarios(base.filter(u =>
    `${u.Nombres || ''} ${u.Apellidos || ''}`.toLowerCase().includes(q) ||
    (u.Email || '').toLowerCase().includes(q) ||
    rolLabel(u.idRol).toLowerCase().includes(q)
  ));
}

// ── MODAL USUARIO ─────────────────────────────
function abrirModal() {
  document.getElementById('modal-titulo').textContent = 'Nuevo Usuario';
  document.getElementById('m-id').value = '';
  ['nombres','apellidos','email','telefono','direccion','pass'].forEach(f =>
    document.getElementById('m-' + f).value = '');
  document.getElementById('m-sexo').value  = 'M';
  document.getElementById('m-fecha').value = '';
  document.getElementById('m-rol').value   = '30001';
  document.getElementById('campo-pass').style.display = 'block';
  document.getElementById('modal-usuario').classList.add('active');
}

function abrirModalEditar(id) {
  const u = _mapUsuarios.get(id);
  if (!u) return;
  document.getElementById('modal-titulo').textContent = 'Editar Usuario';
  document.getElementById('m-id').value        = u.idUsuario;
  document.getElementById('m-nombres').value   = u.Nombres   || '';
  document.getElementById('m-apellidos').value = u.Apellidos || '';
  document.getElementById('m-email').value     = u.Email     || '';
  document.getElementById('m-telefono').value  = u.Telefono  || '';
  document.getElementById('m-direccion').value = u.Direccion || '';
  document.getElementById('m-sexo').value      = u.Sexo      || 'M';
  document.getElementById('m-fecha').value     = u.Fecha_nacimiento ? u.Fecha_nacimiento.split('T')[0] : '';
  document.getElementById('m-rol').value       = u.idRol     || '30001';
  document.getElementById('m-pass').value      = '';
  document.getElementById('campo-pass').style.display = 'none';
  document.getElementById('modal-usuario').classList.add('active');
}

function cerrarModal() {
  document.getElementById('modal-usuario').classList.remove('active');
}

async function guardarUsuario() {
  const id = document.getElementById('m-id').value;
  const payload = {
    Nombres:          document.getElementById('m-nombres').value,
    Apellidos:        document.getElementById('m-apellidos').value,
    Email:            document.getElementById('m-email').value,
    Telefono:         document.getElementById('m-telefono').value,
    Direccion:        document.getElementById('m-direccion').value,
    Sexo:             document.getElementById('m-sexo').value,
    Fecha_nacimiento: document.getElementById('m-fecha').value,
    idRol:            parseInt(document.getElementById('m-rol').value),
    Estado:           'ACTIVO',
  };
  if (!id) payload.Password_hash = document.getElementById('m-pass').value;

  const url    = id ? `/api/usuarios/${id}` : '/api/usuarios';
  const method = id ? 'PUT' : 'POST';
  const res    = await fetch(url, { method, headers: H, body: JSON.stringify(payload) });
  const data   = await res.json();

  if (data.id || data.message) {
    cerrarModal();
    cargarUsuarios();
    cargarStats();
    cargarUsuariosDoctores();
  } else {
    toast('Error: ' + (data.error?.sqlMessage || data.error || 'Revisa los datos'), 'error');
  }
}

async function eliminarUsuario(id) {
  if (!confirm('¿Eliminar este usuario?')) return;
  await fetch(`/api/usuarios/${id}`, { method: 'DELETE', headers: H });
  cargarUsuarios();
  cargarStats();
}

// ── ROLES ─────────────────────────────────────
async function cargarRoles() {
  try {
    const res   = await fetch('/api/usuarios', { headers: H });
    const lista = await res.json();
    if (!Array.isArray(lista)) return;
    document.getElementById('tbody-roles').innerHTML = lista.map(u => `
      <tr>
        <td><strong>${esc(u.Nombres || '')} ${esc(u.Apellidos || '')}</strong></td>
        <td style="font-size:12.5px;color:var(--text-soft);">${esc(u.Email || '')}</td>
        <td><span class="badge-rol badge-rol--${rolClass(u.idRol)}">${rolLabel(u.idRol)}</span></td>
        <td>
          <select class="rol-select" onchange="cambiarRol(${u.idUsuario}, this.value)">
            <option value="1"     ${u.idRol===1     ?'selected':''}>Administrador</option>
            <option value="30002" ${u.idRol===30002 ?'selected':''}>Doctor</option>
            <option value="30003" ${u.idRol===30003 ?'selected':''}>Recepcionista</option>
            <option value="30001" ${u.idRol===30001 ?'selected':''}>Paciente</option>
          </select>
        </td>
        <td>
          <label class="toggle">
            <input type="checkbox" ${u.Estado==='ACTIVO'?'checked':''} onchange="toggleEstado(${u.idUsuario}, this.checked)"/>
            <span class="toggle-slider"></span>
          </label>
        </td>
      </tr>`).join('');
  } catch { /* sin datos */ }
}

async function cambiarRol(id, nuevoRol) {
  await fetch(`/api/usuarios/${id}`, {
    method: 'PUT', headers: H, body: JSON.stringify({ idRol: parseInt(nuevoRol) })
  });
}

async function toggleEstado(id, activo) {
  await fetch(`/api/usuarios/${id}`, {
    method: 'PUT', headers: H,
    body: JSON.stringify({ Estado: activo ? 'ACTIVO' : 'INACTIVO' })
  });
}

// ── LOGS ──────────────────────────────────────
const logsEjemplo = [
  { tipo:'crear',    texto:'Nuevo usuario registrado', sub:'Ana García · Paciente',         tiempo:'Hace 5 min'  },
  { tipo:'editar',   texto:'Rol actualizado',           sub:'Carlos López → Doctor',         tiempo:'Hace 22 min' },
  { tipo:'eliminar', texto:'Usuario desactivado',       sub:'Pedro Martínez',                tiempo:'Hace 1 h'    },
  { tipo:'acceso',   texto:'Inicio de sesión',          sub:'admin@medisync.sv',             tiempo:'Hace 2 h'    },
  { tipo:'crear',    texto:'Médico registrado',         sub:'Dra. Sofía Ramos · Pediatría',  tiempo:'Hace 3 h'    },
];
const iconoLog = { crear:'➕', editar:'✏️', eliminar:'🗑', acceso:'🔑' };

function renderLogs(contenedor, lista) {
  if (!contenedor) return;
  contenedor.innerHTML = lista.map(l => `
    <div class="log-item">
      <div class="log-icon log-icon--${l.tipo}">${iconoLog[l.tipo] || '📋'}</div>
      <div class="log-body">
        <strong>${l.texto}</strong>
        <span>${l.sub}</span>
      </div>
      <span class="log-time">${l.tiempo}</span>
    </div>`).join('');
}

function cargarLogs() {
  renderLogs(document.getElementById('logs-full'), logsEjemplo);
}

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
  lista.forEach(d => _mapMedicosAdm.set(d.idDoctor, d));
  document.getElementById('tbody-medicos').innerHTML = lista.map(d => {
    const esActivo = d.Estado === 'ACTIVO';
    const horario = (d.hora_inicio && d.hora_fin)
      ? `<span class="horario-chip">🕐 ${d.hora_inicio.substring(0,5)} – ${d.hora_fin.substring(0,5)}</span>`
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
            <button class="icon-btn icon-btn--edit" title="Editar"
              onclick="abrirModalEditarMedico(${d.idDoctor})">✏️</button>
            <button class="icon-btn icon-btn--toggle"
              title="${esActivo ? 'Desactivar' : 'Activar'}"
              onclick="toggleMedico(${d.idDoctor}, ${esActivo})">
              ${esActivo ? '🔴' : '🟢'}
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
  const lista = filtro === 'todos' ? todosMedicos
    : todosMedicos.filter(d => d.Estado === filtro);
  renderMedicos(lista);
}

function filtrarMedicos() {
  const q = document.getElementById('q-medicos').value.toLowerCase();
  const base = tabMedicActual === 'todos' ? todosMedicos
    : todosMedicos.filter(d => d.Estado === tabMedicActual);
  renderMedicos(base.filter(d =>
    `${d.Nombres || ''} ${d.Apellidos || ''}`.toLowerCase().includes(q) ||
    (d.Especialidad        || '').toLowerCase().includes(q) ||
    (d.numero_junta_medica || '').toLowerCase().includes(q)
  ));
}

function abrirModalMedico() {
  document.getElementById('modal-medico-titulo').textContent  = 'Nuevo Médico';
  document.getElementById('md-id').value                      = '';
  document.getElementById('md-especialidad').value            = '';
  document.getElementById('md-junta').value                   = '';
  document.getElementById('md-consultorio').value             = '';
  document.getElementById('md-telefono').value                = '';
  document.getElementById('md-hora-inicio').value             = '';
  document.getElementById('md-hora-fin').value                = '';
  document.getElementById('md-estado').value                  = 'ACTIVO';
  document.getElementById('md-usuario').value                 = '';
  document.getElementById('md-usuario-nombre').value          = '';
  document.getElementById('modal-medico').classList.add('active');
}

function abrirModalEditarMedico(id) {
  const d = _mapMedicosAdm.get(id);
  if (!d) return;
  document.getElementById('modal-medico-titulo').textContent  = 'Editar Médico';
  document.getElementById('md-id').value                      = d.idDoctor;
  document.getElementById('md-especialidad').value            = d.Especialidad        || '';
  document.getElementById('md-junta').value                   = d.numero_junta_medica || '';
  document.getElementById('md-consultorio').value             = d.Consultorio         || '';
  document.getElementById('md-telefono').value                = d.Telefono            || '';
  document.getElementById('md-hora-inicio').value             = d.hora_inicio ? d.hora_inicio.substring(0,5) : '';
  document.getElementById('md-hora-fin').value                = d.hora_fin    ? d.hora_fin.substring(0,5)    : '';
  document.getElementById('md-estado').value                  = d.Estado              || 'ACTIVO';
  document.getElementById('md-usuario').value                 = d.idUsuario           || '';
  document.getElementById('md-usuario-nombre').value          = d.Nombres ? `${d.Nombres} ${d.Apellidos}` : '';
  document.getElementById('modal-medico').classList.add('active');
}

function cerrarModalMedico() {
  document.getElementById('modal-medico').classList.remove('active');
}

async function guardarMedico() {
  const id         = document.getElementById('md-id').value;
  const horaInicio = document.getElementById('md-hora-inicio').value;
  const horaFin    = document.getElementById('md-hora-fin').value;

  if (!document.getElementById('md-especialidad').value) {
    toast('La especialidad es obligatoria.', 'warn');
    return;
  }
  if (horaInicio && horaFin && horaInicio >= horaFin) {
    toast('La hora de fin debe ser posterior a la hora de inicio.', 'warn');
    return;
  }

  const payload = {
    Especialidad:        document.getElementById('md-especialidad').value,
    numero_junta_medica: document.getElementById('md-junta').value       || null,
    Consultorio:         document.getElementById('md-consultorio').value  || null,
    Telefono:            document.getElementById('md-telefono').value     || null,
    hora_inicio:         horaInicio || null,
    hora_fin:            horaFin    || null,
    Horario:             (horaInicio && horaFin) ? `${horaInicio} - ${horaFin}` : null,
    Estado:              document.getElementById('md-estado').value,
    idUsuario:           parseInt(document.getElementById('md-usuario').value) || null,
  };

  const url    = id ? `/api/doctores/${id}` : '/api/doctores';
  const method = id ? 'PUT' : 'POST';
  const res    = await fetch(url, { method, headers: H, body: JSON.stringify(payload) });
  const data   = await res.json();

  if (res.status === 409) { toast('⚠️ ' + data.error, 'warn'); return; }
  if (data.message || data.id) {
    cerrarModalMedico();
    cargarMedicos();
    cargarStats();
  } else {
    toast('Error: ' + (data.error?.sqlMessage || data.error || 'Revisa los datos'), 'error');
  }
}

async function toggleMedico(id, estaActivo) {
  const accion  = estaActivo ? 'desactivar' : 'activar';
  const mensaje = estaActivo
    ? '¿Desactivar este médico? No aparecerá disponible para nuevas citas.'
    : '¿Activar este médico?';
  if (!confirm(mensaje)) return;
  const res  = await fetch(`/api/doctores/${id}/${accion}`, { method: 'PATCH', headers: H });
  const data = await res.json();
  if (data.message) { cargarMedicos(); cargarStats(); }
  else toast('Error: ' + (data.error || ''), 'error');
}

// ── AUTOCOMPLETADO USUARIO DOCTOR ─────────────
let listaUsuariosDoctores = [];

async function cargarUsuariosDoctores() {
  try {
    const res   = await fetch('/api/usuarios', { headers: H });
    const todos = await res.json();
    listaUsuariosDoctores = Array.isArray(todos)
      ? todos.filter(u => u.idRol === 30002) : [];
  } catch { /* sin datos */ }
}

function buscarUsuarioDoctor() {
  const input       = document.getElementById('md-usuario-nombre');
  const sugerencias = document.getElementById('sugerencias-usuario-doctor');
  const q = input.value.toLowerCase().trim();
  if (!q) { sugerencias.style.display = 'none'; return; }
  const lista = listaUsuariosDoctores.filter(u =>
    `${u.Nombres} ${u.Apellidos}`.toLowerCase().includes(q) ||
    (u.Email || '').toLowerCase().includes(q)
  );
  lista.forEach(u => _mapDocUsrAdm.set(u.idUsuario, u));
  sugerencias.innerHTML = lista.length
    ? lista.map(u => `
        <div class="autocomplete-item"
          onclick="seleccionarUsuarioDoctor(${u.idUsuario})">
          <strong>${esc(u.Nombres || '')} ${esc(u.Apellidos || '')}</strong>
          <span>${esc(u.Email || '')}</span>
        </div>`).join('')
    : '<div class="autocomplete-item">Sin resultados</div>';
  sugerencias.style.display = 'block';
}

function seleccionarUsuarioDoctor(id) {
  const u = _mapDocUsrAdm.get(id);
  const nombre = u ? `${u.Nombres || ''} ${u.Apellidos || ''}`.trim() : '';
  document.getElementById('md-usuario-nombre').value = nombre;
  document.getElementById('md-usuario').value        = id;
  document.getElementById('sugerencias-usuario-doctor').style.display = 'none';
}

document.addEventListener('click', (e) => {
  const input = document.getElementById('md-usuario-nombre');
  const sug   = document.getElementById('sugerencias-usuario-doctor');
  if (input && sug && !input.contains(e.target) && !sug.contains(e.target))
    sug.style.display = 'none';
});

// ── CERRAR SESIÓN ─────────────────────────────
function cerrarSesion() {
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('usuario');
  window.location.href = '/';
}

// ── INVENTARIO ────────────────────────────────
let listaMedicamentos = [];

async function cargarInventario() {
  await cargarAlertasStock();
  await cargarTablaInventario();
  await cargarMovimientos();
}

async function cargarTablaInventario() {
  try {
    const res  = await fetch('/api/medicamentos', { headers: H });
    listaMedicamentos = await res.json();
    renderTablaInventario(listaMedicamentos);
  } catch {
    document.getElementById('tbody-inventario').innerHTML =
      '<tr><td colspan="8" style="text-align:center;color:#c03030;padding:20px;">Error al cargar</td></tr>';
  }
}

function renderTablaInventario(lista) {
  lista.forEach(m => _mapMedsAdm.set(m.idMedicamento, m));
  document.getElementById('tbody-inventario').innerHTML = Array.isArray(lista) && lista.length
    ? lista.map(m => {
        const bajo = m.stock_actual === 0;
        const estadoBadge = m.estado === 'ACTIVO'
          ? '<span class="badge badge--activo">ACTIVO</span>'
          : '<span class="badge badge--inactivo">INACTIVO</span>';
        const stockColor = bajo ? 'color:#c03030;font-weight:700;' : 'color:var(--teal);font-weight:700;';
        const stockTexto = `<span style="${stockColor}">${m.stock_actual} ${esc(m.unidad_medida || '')}</span>`;
        const esActivo = m.estado === 'ACTIVO';
        return `
          <tr>
            <td>#${m.idMedicamento}</td>
            <td><strong>${esc(m.nombre || '')}</strong><br/><span style="font-size:11px;color:var(--text-soft);">${esc(m.descripcion || '')}</span></td>
            <td>${stockTexto}</td>
            <td>${m.stock_minimo}</td>
            <td>${esc(m.unidad_medida || '')}</td>
            <td>$${parseFloat(m.precio_unitario || 0).toFixed(2)}</td>
            <td>${estadoBadge}</td>
            <td>
              <div class="action-icons">
                <button class="icon-btn icon-btn--edit" title="Editar"
                  onclick="abrirModalEditarMed(${m.idMedicamento})">✏️</button>
                <button class="icon-btn"
                  style="background:${esActivo ? 'rgba(200,50,50,0.15)' : 'rgba(42,107,94,0.15)'};"
                  title="${esActivo ? 'Desactivar' : 'Activar'}"
                  onclick="toggleMedicamento(${m.idMedicamento}, '${esActivo ? 'INACTIVO' : 'ACTIVO'}')">
                  ${esActivo ? '🟢' : '🔴'}
                </button>
              </div>
            </td>
          </tr>`;
      }).join('')
    : '<tr><td colspan="8" style="text-align:center;color:var(--text-soft);padding:20px;">Sin medicamentos registrados</td></tr>';
}

async function cargarAlertasStock() {
  try {
    const res  = await fetch('/api/medicamentos/bajo-stock', { headers: H });
    const data = await res.json();
    const cont = document.getElementById('alertas-stock');
    if (!cont) return;
    if (Array.isArray(data) && data.length) {
      cont.style.display = 'block';
      cont.innerHTML = `
        <div style="background:rgba(200,50,50,0.07);border:1.5px solid rgba(200,50,50,0.2);border-radius:14px;padding:16px 20px;margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
            <span style="font-size:18px;">⚠️</span>
            <strong style="color:#c03030;font-size:13.5px;">Stock bajo en ${data.length} medicamento(s)</strong>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            ${data.map(m => `
              <div style="background:white;border:1px solid rgba(200,50,50,0.2);border-radius:10px;padding:8px 14px;font-size:12.5px;">
                <strong style="color:var(--deep);">${esc(m.nombre || '')}</strong>
                <span style="color:#c03030;margin-left:6px;">Stock: ${m.stock_actual} / Mín: ${m.stock_minimo}</span>
              </div>`).join('')}
          </div>
        </div>`;
    } else {
      cont.style.display = 'none';
    }
  } catch { /* sin datos */ }
}

async function cargarMovimientos() {
  try {
    const res  = await fetch('/api/medicamentos/movimientos', { headers: H });
    const data = await res.json();
    document.getElementById('tbody-movimientos').innerHTML = Array.isArray(data) && data.length
      ? data.map(m => {
          const colorTipo = m.tipo_movimiento === 'ENTRADA' ? 'color:var(--teal);'
            : m.tipo_movimiento === 'SALIDA' ? 'color:#c03030;' : 'color:var(--gold);';
          const simbolo = m.tipo_movimiento === 'ENTRADA' ? '+' : m.tipo_movimiento === 'SALIDA' ? '-' : '±';
          return `
            <tr>
              <td>${m.fecha_movimiento ? m.fecha_movimiento.split('T')[0] : '–'}</td>
              <td><strong>${esc(m.nombreMedicamento || '–')}</strong></td>
              <td style="${colorTipo}font-weight:700;">${m.tipo_movimiento}</td>
              <td>${simbolo}${m.cantidad}</td>
              <td>${m.stock_anterior} → ${m.stock_nuevo}</td>
              <td>${esc(m.motivo || '–')}</td>
              <td>${esc(m.proveedor || '–')}</td>
            </tr>`;
        }).join('')
      : '<tr><td colspan="7" style="text-align:center;color:var(--text-soft);padding:20px;">Sin movimientos registrados</td></tr>';
  } catch { /* sin datos */ }
}

function buscarInventario() {
  const q = document.getElementById('q-inventario').value.toLowerCase().trim();
  if (!q) return renderTablaInventario(listaMedicamentos);
  renderTablaInventario(listaMedicamentos.filter(m =>
    (m.nombre || '').toLowerCase().includes(q) ||
    (m.descripcion || '').toLowerCase().includes(q)
  ));
}

function abrirModalNuevoMed() {
  document.getElementById('med-id').value          = '';
  document.getElementById('med-nombre').value      = '';
  document.getElementById('med-descripcion').value = '';
  document.getElementById('med-stock').value       = '';
  document.getElementById('med-stock-min').value   = '5';
  document.getElementById('med-unidad').value      = 'tableta';
  document.getElementById('med-precio').value      = '';
  document.getElementById('modal-med-titulo').textContent = 'Nuevo Medicamento';
  document.getElementById('med-stock').removeAttribute('readonly');
  document.getElementById('med-stock').style.opacity = '1';
  document.getElementById('med-stock').style.cursor  = 'auto';
  document.getElementById('med-stock-min').removeAttribute('readonly');
  document.getElementById('med-stock-min').style.opacity = '1';
  document.getElementById('med-stock-min').style.cursor  = 'auto';
  document.getElementById('acciones-stock-modal').style.display = 'none';
  document.getElementById('modal-medicamento').classList.add('active');
}

function abrirModalEditarMed(id) {
  const m = _mapMedsAdm.get(id);
  if (!m) return;
  document.getElementById('med-id').value          = m.idMedicamento;
  document.getElementById('med-nombre').value      = m.nombre        || '';
  document.getElementById('med-descripcion').value = m.descripcion   || '';
  document.getElementById('med-stock').value       = m.stock_actual;
  document.getElementById('med-stock-min').value   = m.stock_minimo;
  document.getElementById('med-unidad').value      = m.unidad_medida || 'tableta';
  document.getElementById('med-precio').value      = m.precio_unitario || '';
  document.getElementById('modal-med-titulo').textContent = 'Editar Medicamento';
  document.getElementById('med-stock').setAttribute('readonly', true);
  document.getElementById('med-stock').style.opacity = '0.6';
  document.getElementById('med-stock').style.cursor  = 'not-allowed';
  document.getElementById('med-stock-min').setAttribute('readonly', true);
  document.getElementById('med-stock-min').style.opacity = '0.6';
  document.getElementById('med-stock-min').style.cursor  = 'not-allowed';
  document.getElementById('acciones-stock-modal').style.display = 'block';
  document.getElementById('modal-medicamento').classList.add('active');
}

function cerrarModalMed() {
  document.getElementById('modal-medicamento').classList.remove('active');
}

async function guardarMedicamento() {
  const id = document.getElementById('med-id').value;
  const payload = {
    nombre:          document.getElementById('med-nombre').value.trim(),
    descripcion:     document.getElementById('med-descripcion').value.trim(),
    stock_actual:    parseInt(document.getElementById('med-stock').value) || 0,
    stock_minimo:    parseInt(document.getElementById('med-stock-min').value) || 5,
    unidad_medida:   document.getElementById('med-unidad').value,
    precio_unitario: parseFloat(document.getElementById('med-precio').value) || 0,
  };
  if (!payload.nombre) { toast('El nombre es requerido', 'warn'); return; }
  const url    = id ? `/api/medicamentos/${id}` : '/api/medicamentos';
  const method = id ? 'PUT' : 'POST';
  const res    = await fetch(url, { method, headers: H, body: JSON.stringify(payload) });
  const data   = await res.json();
  if (data.message || data.id) { cerrarModalMed(); cargarInventario(); }
  else toast('Error: ' + (data.error?.sqlMessage || JSON.stringify(data.error)), 'error');
}

function abrirModalEntrada(idMedicamento, nombre) {
  document.getElementById('entrada-id-med').value       = idMedicamento;
  document.getElementById('entrada-nombre').textContent = nombre;
  document.getElementById('entrada-cantidad').value     = '';
  document.getElementById('entrada-proveedor').value    = '';
  document.getElementById('modal-entrada').classList.add('active');
}

function cerrarModalEntrada() {
  document.getElementById('modal-entrada').classList.remove('active');
}

async function guardarEntrada() {
  const id        = document.getElementById('entrada-id-med').value;
  const cantidad  = parseInt(document.getElementById('entrada-cantidad').value);
  const proveedor = document.getElementById('entrada-proveedor').value.trim();

  if (!cantidad || cantidad <= 0) { toast('Ingresa una cantidad válida', 'warn'); return; }
  const res  = await fetch(`/api/medicamentos/${id}/entrada`, {
    method: 'POST', headers: H, body: JSON.stringify({ cantidad, proveedor })
  });
  const data = await res.json();
  if (data.message) { cerrarModalEntrada(); cargarInventario(); }
  else toast('Error: ' + (data.error?.sqlMessage || JSON.stringify(data.error)), 'error');
}

function abrirModalAjuste(idMedicamento, nombre, stockActual) {
  document.getElementById('ajuste-id-med').value            = idMedicamento;
  document.getElementById('ajuste-nombre').textContent      = nombre;
  document.getElementById('ajuste-stock-actual').textContent = stockActual;
  document.getElementById('ajuste-cantidad').value          = stockActual;
  document.getElementById('ajuste-motivo').value            = '';
  document.getElementById('modal-ajuste').classList.add('active');
}

function cerrarModalAjuste() {
  document.getElementById('modal-ajuste').classList.remove('active');
}

async function guardarAjuste() {
  const id             = document.getElementById('ajuste-id-med').value;
  const cantidad_nueva = parseInt(document.getElementById('ajuste-cantidad').value);
  const motivo         = document.getElementById('ajuste-motivo').value.trim();

  if (isNaN(cantidad_nueva)) { toast('Ingresa una cantidad válida', 'warn'); return; }

  const res  = await fetch(`/api/medicamentos/${id}/ajuste`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ cantidad_nueva, motivo: motivo || 'Ajuste manual' })
  });
  const data = await res.json();
  if (data.message) { cerrarModalAjuste(); cargarInventario(); }
  else toast('Error: ' + (data.error?.sqlMessage || JSON.stringify(data.error)), 'error');
}

async function toggleMedicamento(id, nuevoEstado) {
  const accion = nuevoEstado === 'ACTIVO' ? 'activar' : 'desactivar';
  if (!confirm(`¿Deseas ${accion} este medicamento?`)) return;
  const res  = await fetch(`/api/medicamentos/${id}/toggle`, {
    method: 'PATCH', headers: H, body: JSON.stringify({ estado: nuevoEstado })
  });
  const data = await res.json();
  if (data.message) cargarInventario();
  else toast('Error: ' + (data.error?.sqlMessage || JSON.stringify(data.error)), 'error');
}

function switchTabInv(tab) {
  document.getElementById('tab-inv-medicamentos').style.display = tab === 'medicamentos' ? 'block' : 'none';
  document.getElementById('tab-inv-movimientos').style.display  = tab === 'movimientos'  ? 'block' : 'none';
  document.getElementById('tab-medicamentos').classList.toggle('active', tab === 'medicamentos');
  document.getElementById('tab-movimientos').classList.toggle('active',  tab === 'movimientos');
}

function abrirDesdeEditar(tipo) {
  const id    = document.getElementById('med-id').value;
  const nombre = document.getElementById('med-nombre').value;
  const stock  = parseInt(document.getElementById('med-stock').value) || 0;
  cerrarModalMed();
  if (tipo === 'entrada') abrirModalEntrada(id, nombre);
  else abrirModalAjuste(id, nombre, stock);
}

// ══════════════════════════════════════════════
//  HU12 — REPORTES CONSOLIDADOS
// ══════════════════════════════════════════════
let _repInvData = [];

function repSwitchTab(tab, btn) {
  document.querySelectorAll('.rep-tab').forEach(b => b.classList.remove('rep-tab--active'));
  btn.classList.add('rep-tab--active');
  document.getElementById('rep-panel-citas').style.display      = tab === 'citas'      ? '' : 'none';
  document.getElementById('rep-panel-inventario').style.display = tab === 'inventario' ? '' : 'none';
}

async function iniciarReportes() {
  _repSetDefaultDates();
  await _repCargarFiltros();
  await repCargarInventario();
}

function _repSetDefaultDates() {
  const hoy    = new Date();
  const hace30 = new Date(hoy - 30 * 24 * 60 * 60 * 1000);
  document.getElementById('rep-fecha-inicio').value = hace30.toISOString().split('T')[0];
  document.getElementById('rep-fecha-fin').value    = hoy.toISOString().split('T')[0];
}

async function _repCargarFiltros() {
  try {
    const res = await fetch('/api/reportes/filtros', { headers: H });
    if (!res.ok) return;
    const { doctores, especialidades } = await res.json();
    const selDoc = document.getElementById('rep-doctor');
    const selEsp = document.getElementById('rep-especialidad');
    selDoc.innerHTML = '<option value="">Todos</option>';
    selEsp.innerHTML = '<option value="">Todas</option>';
    doctores.forEach(d => {
      selDoc.innerHTML += `<option value="${d.idDoctor}">${esc(d.nombre)} — ${esc(d.Especialidad)}</option>`;
    });
    especialidades.forEach(e => {
      selEsp.innerHTML += `<option value="${esc(e)}">${esc(e)}</option>`;
    });
  } catch (err) {
    console.error('_repCargarFiltros:', err);
  }
}

async function repGenerarCitas() {
  const inicio = document.getElementById('rep-fecha-inicio').value;
  const fin    = document.getElementById('rep-fecha-fin').value;
  const doctor = document.getElementById('rep-doctor').value;
  const esp    = document.getElementById('rep-especialidad').value;

  let url = `/api/reportes/citas?fechaInicio=${inicio}&fechaFin=${fin}`;
  if (doctor) url += `&idDoctor=${doctor}`;
  if (esp)    url += `&especialidad=${encodeURIComponent(esp)}`;

  try {
    const res  = await fetch(url, { headers: H });
    const data = await res.json();
    const { kpis, detalle } = data;

    document.getElementById('rep-kpi-total').textContent     = kpis?.total      ?? '—';
    document.getElementById('rep-kpi-atendidas').textContent = kpis?.atendidas  ?? '—';
    document.getElementById('rep-kpi-pendientes').textContent= kpis?.pendientes ?? '—';
    document.getElementById('rep-kpi-canceladas').textContent= kpis?.canceladas ?? '—';
    document.getElementById('rep-kpis-citas').style.display  = '';

    document.getElementById('rep-periodo-label').textContent =
      `${inicio} → ${fin}`;

    const vacio = !Array.isArray(detalle) || !detalle.length;
    document.getElementById('rep-citas-vacio').style.display      = vacio ? '' : 'none';
    document.getElementById('rep-tabla-citas-wrap').style.display = '';

    document.getElementById('rep-tbody-citas').innerHTML = vacio ? '' : detalle.map(d => `
      <tr>
        <td>${esc(d.nombreDoctor || '')}</td>
        <td>${esc(d.Especialidad || '—')}</td>
        <td>${d.total      ?? 0}</td>
        <td>${d.atendidas  ?? 0}</td>
        <td>${d.canceladas ?? 0}</td>
        <td>${d.pendientes ?? 0}</td>
        <td>${d.pctAtendidas != null ? d.pctAtendidas + '%' : '—'}</td>
      </tr>`).join('');
  } catch (err) {
    console.error('repGenerarCitas:', err);
    toast('Error al generar el reporte de citas.', 'error');
  }
}

async function repCargarInventario() {
  try {
    const res  = await fetch('/api/reportes/inventario', { headers: H });
    const data = await res.json();
    const { kpis, medicamentos } = data;

    document.getElementById('inv-kpi-total').textContent   = kpis?.totalMedicamentos ?? '—';
    document.getElementById('inv-kpi-stock').textContent   = kpis?.enStock           ?? '—';
    document.getElementById('inv-kpi-alerta').textContent  = kpis?.enAlerta          ?? '—';
    document.getElementById('inv-kpi-agotados').textContent= kpis?.agotados          ?? '—';

    _repInvData = Array.isArray(medicamentos) ? medicamentos : [];
    _repRenderInv(_repInvData);
  } catch (err) {
    console.error('repCargarInventario:', err);
  }
}

function _repRenderInv(lista) {
  const cuerpo = document.getElementById('rep-tbody-inv');
  if (!lista.length) {
    cuerpo.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-soft);padding:20px;">Sin datos</td></tr>';
    return;
  }
  const estadoChip = { agotado: '🔴 Agotado', alerta: '🟡 Alerta', normal: '✅ OK' };
  const estadoClass= { agotado: 'stock-agotado', alerta: 'stock-critico', normal: '' };
  cuerpo.innerHTML = lista.map(m => `
    <tr>
      <td>${esc(m.nombre || '')}</td>
      <td class="${estadoClass[m.nivelStock] || ''}">${m.stock_actual ?? '—'}</td>
      <td>${m.stock_minimo ?? '—'}</td>
      <td>${esc(m.unidad_medida || '—')}</td>
      <td>${m.precio_unitario != null ? '$' + Number(m.precio_unitario).toFixed(2) : '—'}</td>
      <td>${estadoChip[m.nivelStock] || esc(m.estado || '—')}</td>
    </tr>`).join('');
}

function repFiltrarInv(filtro, btn) {
  document.querySelectorAll('#rep-panel-inventario .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const lista = filtro === 'todos' ? _repInvData : _repInvData.filter(m => m.nivelStock === filtro);
  _repRenderInv(lista);
}

// ══════════════════════════════════════════
//  HU14 — Panel de Métricas Administrativas
// ══════════════════════════════════════════

function _formatearFecha(fechaStr) {
  if (!fechaStr) return '—';
  const d = new Date(fechaStr);
  return d.toLocaleDateString('es-SV', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' });
}

async function cargarResumen() {
  try {
    const res  = await fetch('/api/metricas/resumen', { headers: H });
    const data = await res.json();
    const el   = (id) => document.getElementById(id);

    if (el('s-pacientes'))     el('s-pacientes').textContent     = data.totalPacientes    ?? '—';
    if (el('metCitasHoy'))     el('metCitasHoy').textContent     = data.citasHoy          ?? '0';
    if (el('metMedicos'))      el('metMedicos').textContent      = data.medicosActivos    ?? '—';
    if (el('metAlertas'))      el('metAlertas').textContent      = data.alertasInventario ?? '0';
    if (el('badgeInventario')) el('badgeInventario').textContent = data.alertasInventario ?? '0';

    if (el('metCitasSub')) {
      el('metCitasSub').innerHTML =
        `✅ ${data.citasCompletadas ?? 0} completadas &nbsp;❌ ${data.citasCanceladas ?? 0} canceladas`;
    }

    if ((data.alertasInventario ?? 0) > 0) {
      const card = document.getElementById('cardAlertas');
      if (card) card.style.borderColor = '#e74c3c';
    }
  } catch (e) {
    console.error('HU14 cargarResumen:', e);
  }
}

async function cargarInventarioCritico() {
  try {
    const res   = await fetch('/api/metricas/alertas-inventario', { headers: H });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data  = await res.json();
    const lista = Array.isArray(data) ? data : [];

    const badge = document.getElementById('badgeInventario');
    if (badge) {
      badge.textContent      = lista.length;
      badge.style.background = lista.length > 0 ? '#c0392b' : '#27ae60';
    }

    const html = lista.length === 0
      ? `<tr><td colspan="5" style="text-align:center;color:var(--text-soft);padding:20px;">✅ Sin alertas de inventario</td></tr>`
      : lista.map(m => {
          const agotado = m.stock_actual === 0;
          const clase   = agotado ? 'stock-agotado' : 'stock-critico';
          const estado  = agotado ? '🔴 Agotado' : '🟡 Crítico';
          return `<tr>
            <td>${esc(m.nombre || '')}</td>
            <td class="${clase}">${m.stock_actual}</td>
            <td>${m.stock_minimo}</td>
            <td>${esc(m.unidad_medida || '')}</td>
            <td class="${clase}">${estado}</td>
          </tr>`;
        }).join('');

    // Actualiza el panel de inicio Y el panel de logs con un solo fetch
    ['bodyInventarioCritico', 'bodyInventarioCriticoLogs'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = html;
    });
  } catch (e) {
    console.error('cargarInventarioCritico:', e);
  }
}

async function cargarActividad() {
  const ids = ['logs-preview', 'logs-full'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<li class="sin-datos">Cargando...</li>';
  });
  try {
    const res   = await fetch('/api/metricas/actividad-reciente', { headers: H });
    const lista = await res.json();

    const html = lista.length === 0
      ? '<li class="sin-datos">Sin actividad registrada aún.</li>'
      : lista.map(a => `
          <li>
            <span class="feed-dot"></span>
            <div>
              <strong>${esc(a.accion || '')}</strong>${a.descripcion ? ' — ' + esc(a.descripcion) : ''}
              <br><small style="color:#aaa">${esc(a.nombreUsuario ?? 'Sistema')} · ${esc(a.modulo ?? '')}</small>
            </div>
            <span class="feed-fecha">${_formatearFecha(a.fecha)}</span>
          </li>`).join('');

    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = html;
    });
  } catch (e) {
    console.error('HU14 cargarActividad:', e);
  }
}

async function iniciarPanelMetricas() {
  await Promise.all([
    cargarResumen(),
    cargarInventarioCritico(),
    cargarActividad(),
  ]);
}

// ── INIT ──────────────────────────────────────
cargarStats();
cargarUsuariosDoctores();
iniciarPanelMetricas();
setInterval(iniciarPanelMetricas, 60000);

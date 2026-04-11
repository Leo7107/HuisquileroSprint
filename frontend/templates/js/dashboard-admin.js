// ══════════════════════════════════════════════
//  DASHBOARD ADMINISTRADOR — dashboard-admin.js
// ══════════════════════════════════════════════

// ── AUTH ──────────────────────────────────────
const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
if (!usuario || usuario.rol !== 1) {
  alert('Acceso denegado.');
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
const token = localStorage.getItem('token');
const H = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

// ── NAVEGACIÓN ────────────────────────────────
function nav(seccion, linkEl) {
  document.querySelectorAll('[id^="sec-"]').forEach(s => s.style.display = 'none');
  document.getElementById('sec-' + seccion).style.display = 'block';
  document.querySelectorAll('.nav-item').forEach(a => a.classList.remove('active'));
  if (linkEl) linkEl.classList.add('active');

  if (seccion === 'usuarios') cargarUsuarios();
  if (seccion === 'medicos')  cargarMedicos();
  if (seccion === 'roles')    cargarRoles();
  if (seccion === 'logs')     cargarLogs();
}

// ── STATS ─────────────────────────────────────
async function cargarStats() {
  try {
    const [pRes, cRes, dRes, uRes] = await Promise.all([
      fetch('/api/pacientes', { headers: H }),
      fetch('/api/citas',     { headers: H }),
      fetch('/api/doctores',  { headers: H }),
      fetch('/api/usuarios',  { headers: H }),
    ]);
    const pacientes = await pRes.json();
    const citas     = await cRes.json();
    const doctores  = await dRes.json();
    const usuarios  = await uRes.json();

    const mes = new Date().getMonth();
    const citasMes = Array.isArray(citas)
      ? citas.filter(c => c.fecha && new Date(c.fecha).getMonth() === mes) : [];
    const doctoresActivos = Array.isArray(doctores)
      ? doctores.filter(d => d.Estado === 'ACTIVO') : [];

    document.getElementById('s-pacientes').textContent = Array.isArray(pacientes) ? pacientes.length : '—';
    document.getElementById('s-citas').textContent     = citasMes.length;
    document.getElementById('s-doctores').textContent  = doctoresActivos.length;
    document.getElementById('s-usuarios').textContent  = Array.isArray(usuarios) ? usuarios.length : '—';
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
  document.getElementById('tbody-usuarios').innerHTML = lista.map(u => `
    <tr>
      <td>#${u.idUsuario}</td>
      <td>${u.Nombres || ''} ${u.Apellidos || ''}</td>
      <td>${u.Email || ''}</td>
      <td><span class="badge-rol badge-rol--${rolClass(u.idRol)}">${rolLabel(u.idRol)}</span></td>
      <td><span class="badge badge--${u.Estado === 'ACTIVO' ? 'activo' : 'inactivo'}">${u.Estado || '—'}</span></td>
      <td>
        <div class="action-icons">
          <button class="icon-btn icon-btn--edit" title="Editar" onclick='abrirModalEditar(${JSON.stringify(u)})'>✏️</button>
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

function abrirModalEditar(u) {
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
  } else {
    alert('Error: ' + (data.error?.sqlMessage || data.error || 'Revisa los datos'));
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
        <td><strong>${u.Nombres || ''} ${u.Apellidos || ''}</strong></td>
        <td style="font-size:12.5px;color:var(--text-soft);">${u.Email || ''}</td>
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

renderLogs(document.getElementById('logs-preview'), logsEjemplo.slice(0, 3));

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
  document.getElementById('tbody-medicos').innerHTML = lista.map(d => {
    const esActivo = d.Estado === 'ACTIVO';
    return `
      <tr>
        <td>#${d.idDoctor}</td>
        <td><strong>${d.Nombres || '—'} ${d.Apellidos || ''}</strong></td>
        <td>${d.Especialidad || '—'}</td>
        <td>${d.Consultorio  || '—'}</td>
        <td>${d.Horario      || '—'}</td>
        <td><span class="badge-estado--${esActivo ? 'activo' : 'inactivo'}">${d.Estado || '—'}</span></td>
        <td>
          <div class="action-icons">
            <button class="icon-btn icon-btn--edit" title="Editar"
              onclick='abrirModalEditarMedico(${JSON.stringify(d)})'>✏️</button>
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
    (d.Especialidad || '').toLowerCase().includes(q) ||
    (d.Consultorio  || '').toLowerCase().includes(q)
  ));
}

function abrirModalMedico() {
  document.getElementById('modal-medico-titulo').textContent = 'Nuevo Médico';
  document.getElementById('md-id').value           = '';
  document.getElementById('md-especialidad').value = '';
  document.getElementById('md-consultorio').value  = '';
  document.getElementById('md-horario').value      = '';
  document.getElementById('md-telefono').value     = '';
  document.getElementById('md-estado').value       = 'ACTIVO';
  document.getElementById('md-usuario').value      = '';
  document.getElementById('modal-medico').classList.add('active');
}

function abrirModalEditarMedico(d) {
  document.getElementById('modal-medico-titulo').textContent = 'Editar Médico';
  document.getElementById('md-id').value           = d.idDoctor;
  document.getElementById('md-especialidad').value = d.Especialidad || '';
  document.getElementById('md-consultorio').value  = d.Consultorio  || '';
  document.getElementById('md-horario').value      = d.Horario      || '';
  document.getElementById('md-telefono').value     = d.Telefono     || '';
  document.getElementById('md-estado').value       = d.Estado       || 'ACTIVO';
  document.getElementById('md-usuario').value      = d.idUsuario    || '';
  document.getElementById('modal-medico').classList.add('active');
}

function cerrarModalMedico() {
  document.getElementById('modal-medico').classList.remove('active');
}

async function guardarMedico() {
  const id = document.getElementById('md-id').value;

  const payload = {
    Especialidad: document.getElementById('md-especialidad').value,
    Consultorio:  document.getElementById('md-consultorio').value,
    Horario:      document.getElementById('md-horario').value,
    Telefono:     document.getElementById('md-telefono').value,
    Estado:       document.getElementById('md-estado').value,
    idUsuario:    parseInt(document.getElementById('md-usuario').value) || null,
  };

  if (!payload.Especialidad) {
    alert('La especialidad es obligatoria.');
    return;
  }

  const url    = id ? `/api/doctores/${id}` : '/api/doctores';
  const method = id ? 'PUT' : 'POST';
  const res    = await fetch(url, { method, headers: H, body: JSON.stringify(payload) });
  const data   = await res.json();

  if (data.message || data.id) {
    cerrarModalMedico();
    cargarMedicos();
    cargarStats();
  } else {
    alert('Error: ' + (data.error?.sqlMessage || data.error || 'Revisa los datos'));
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
  if (data.message) {
    cargarMedicos();
    cargarStats();
  } else {
    alert('Error: ' + (data.error || ''));
  }
}

// ── CERRAR SESIÓN ─────────────────────────────
function cerrarSesion() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  window.location.href = '/';
}

// ── INIT ──────────────────────────────────────
cargarStats();
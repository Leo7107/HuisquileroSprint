// ══════════════════════════════════════════════
//  DASHBOARD ADMIN — dashboard-admin.js
// ══════════════════════════════════════════════

// ── AUTH ──────────────────────────────────────
const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
if (!usuario || usuario.rol !== 1) {
  alert('Acceso denegado.');
  window.location.href = '/';
}

if (usuario) {
  const nombre = usuario.nombre || 'Administrador';
  document.getElementById('nombre-admin').textContent  = nombre;
  document.getElementById('usuario-nombre').textContent = nombre;
  document.getElementById('avatar-inicial').textContent = nombre[0].toUpperCase();
}

document.getElementById('fecha-actual').textContent =
  new Date().toLocaleDateString('es-SV', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

// ── TOKEN ─────────────────────────────────────
const token = localStorage.getItem('token');
const H = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

// ── LOGS (simulados — reemplazar con endpoint real si existe) ──
const LOGS = [
  { tipo:'crear',    icon:'➕', texto:'Usuario creado: Dr. Carlos Hernández',          hora:'Hace 5 min'   },
  { tipo:'editar',   icon:'✏️', texto:'Rol actualizado: María López → Recepcionista',  hora:'Hace 18 min'  },
  { tipo:'acceso',   icon:'🔐', texto:'Inicio de sesión: admin@clinica.com',            hora:'Hace 32 min'  },
  { tipo:'eliminar', icon:'🗑️', texto:'Usuario desactivado: Pedro Ramírez',             hora:'Hace 1 hora'  },
  { tipo:'crear',    icon:'➕', texto:'Nuevo paciente registrado: Ana Torres',          hora:'Hace 2 horas' },
  { tipo:'editar',   icon:'✏️', texto:'Cita reprogramada: #1042 → 15/03/2026',         hora:'Hace 3 horas' },
];

function logHTML(l) {
  return `<div class="log-item">
    <div class="log-icon log-icon--${l.tipo}">${l.icon}</div>
    <div class="log-body"><strong>${l.texto}</strong><span>Sistema</span></div>
    <span class="log-time">${l.hora}</span>
  </div>`;
}

// ── MAPAS ─────────────────────────────────────
const ROLES_MAP  = { 1:'Admin', 30001:'Paciente', 30002:'Doctor', 30003:'Recepcionista' };
const BADGE_MAP  = { 1:'badge-rol--admin', 30001:'badge-rol--pac', 30002:'badge-rol--medico', 30003:'badge-rol--recep' };

// ── NAVEGACIÓN ────────────────────────────────
function nav(seccion, linkEl) {
  document.querySelectorAll('[id^="sec-"]').forEach(s => s.style.display = 'none');
  document.getElementById('sec-' + seccion).style.display = 'block';
  document.querySelectorAll('.nav-item').forEach(a => a.classList.remove('active'));
  if (linkEl) linkEl.classList.add('active');

  if (seccion === 'usuarios') cargarUsuarios();
  if (seccion === 'roles')    cargarRoles();
  if (seccion === 'logs') {
    document.getElementById('logs-full').innerHTML = LOGS.map(logHTML).join('');
  }
}

// ── STATS ─────────────────────────────────────
async function cargarStats() {
  try {
    const [uRes, cRes, pRes] = await Promise.all([
      fetch('/api/usuarios',  { headers: H }),
      fetch('/api/citas',     { headers: H }),
      fetch('/api/pacientes', { headers: H }),
    ]);
    const usuarios  = await uRes.json();
    const citas     = await cRes.json();
    const pacientes = await pRes.json();

    document.getElementById('s-usuarios').textContent  = Array.isArray(usuarios)  ? usuarios.length  : '—';
    document.getElementById('s-citas').textContent     = Array.isArray(citas)     ? citas.length     : '—';
    document.getElementById('s-pacientes').textContent = Array.isArray(pacientes) ? pacientes.length : '—';

    const doctores = Array.isArray(usuarios)
      ? usuarios.filter(u => u.idRol === 30002 && u.Estado === 'ACTIVO').length : '—';
    document.getElementById('s-doctores').textContent = doctores;
  } catch { /* sin conexión todavía */ }

  // logs preview
  document.getElementById('logs-preview').innerHTML = LOGS.slice(0,3).map(logHTML).join('');
}

// ── USUARIOS ──────────────────────────────────
let todosUsuarios  = [];
let tabActual      = 'todos';

async function cargarUsuarios() {
  try {
    const res = await fetch('/api/usuarios', { headers: H });
    todosUsuarios = await res.json();
    renderUsuarios(todosUsuarios);
  } catch {
    document.getElementById('tbody-usuarios').innerHTML =
      '<tr><td colspan="6" style="text-align:center;color:#c03030;padding:20px;">Error al cargar usuarios</td></tr>';
  }
}

function renderUsuarios(lista) {
  if (!Array.isArray(lista) || !lista.length) {
    document.getElementById('tbody-usuarios').innerHTML =
      '<tr><td colspan="6" style="text-align:center;color:var(--text-soft);padding:20px;">Sin resultados</td></tr>';
    return;
  }
  document.getElementById('tbody-usuarios').innerHTML = lista.map(u => `
    <tr>
      <td>#${u.idUsuario}</td>
      <td><strong>${u.Nombres} ${u.Apellidos}</strong></td>
      <td>${u.Email}</td>
      <td><span class="badge-rol ${BADGE_MAP[u.idRol] || ''}">${ROLES_MAP[u.idRol] || u.idRol}</span></td>
      <td>
        <label class="toggle">
          <input type="checkbox" ${u.Estado === 'ACTIVO' ? 'checked' : ''}
            onchange="toggleEstado(${u.idUsuario}, this.checked)"/>
          <span class="toggle-slider"></span>
        </label>
      </td>
      <td>
        <div class="action-icons">
          <button class="icon-btn icon-btn--edit" title="Editar" onclick='abrirModalEditar(${JSON.stringify(u)})'>✏️</button>
          <button class="icon-btn icon-btn--del"  title="Eliminar" onclick="eliminarUsuario(${u.idUsuario})">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filtrarUsuarios() {
  const q = document.getElementById('q-usuarios').value.toLowerCase();
  let lista = todosUsuarios.filter(u =>
    (u.Nombres + ' ' + u.Apellidos).toLowerCase().includes(q) ||
    u.Email.toLowerCase().includes(q) ||
    (ROLES_MAP[u.idRol] || '').toLowerCase().includes(q)
  );
  if (tabActual !== 'todos') lista = lista.filter(u => ROLES_MAP[u.idRol] === tabActual);
  renderUsuarios(lista);
}

function setTab(rol, btn) {
  tabActual = rol;
  document.querySelectorAll('#sec-usuarios .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  filtrarUsuarios();
}

async function toggleEstado(id, activo) {
  await fetch(`/api/usuarios/${id}`, {
    method: 'PUT', headers: H,
    body: JSON.stringify({ Estado: activo ? 'ACTIVO' : 'INACTIVO' })
  });
}

async function eliminarUsuario(id) {
  if (!confirm('¿Eliminar este usuario? Esta acción no se puede deshacer.')) return;
  const res = await fetch(`/api/usuarios/${id}`, { method: 'DELETE', headers: H });
  if (res.ok) cargarUsuarios();
  else alert('Error al eliminar usuario.');
}

// ── ROLES ─────────────────────────────────────
async function cargarRoles() {
  try {
    const res  = await fetch('/api/usuarios', { headers: H });
    const lista = await res.json();
    document.getElementById('tbody-roles').innerHTML = lista.map(u => `
      <tr>
        <td><strong>${u.Nombres} ${u.Apellidos}</strong></td>
        <td>${u.Email}</td>
        <td><span class="badge-rol ${BADGE_MAP[u.idRol] || ''}">${ROLES_MAP[u.idRol] || u.idRol}</span></td>
        <td>
          <select class="rol-select" onchange="cambiarRol(${u.idUsuario}, this.value)">
            <option value="1"     ${u.idRol===1     ?'selected':''}>Admin</option>
            <option value="30002" ${u.idRol===30002 ?'selected':''}>Doctor</option>
            <option value="30003" ${u.idRol===30003 ?'selected':''}>Recepcionista</option>
            <option value="30001" ${u.idRol===30001 ?'selected':''}>Paciente</option>
          </select>
        </td>
        <td>
          <label class="toggle">
            <input type="checkbox" ${u.Estado==='ACTIVO'?'checked':''}
              onchange="toggleEstado(${u.idUsuario}, this.checked)"/>
            <span class="toggle-slider"></span>
          </label>
        </td>
      </tr>
    `).join('');
  } catch {
    document.getElementById('tbody-roles').innerHTML =
      '<tr><td colspan="5" style="text-align:center;color:#c03030;padding:20px;">Error al cargar</td></tr>';
  }
}

async function cambiarRol(id, nuevoRol) {
  await fetch(`/api/usuarios/${id}`, {
    method: 'PUT', headers: H,
    body: JSON.stringify({ idRol: parseInt(nuevoRol) })
  });
}

// ── MODAL ─────────────────────────────────────
function abrirModal() {
  document.getElementById('modal-titulo').textContent = 'Nuevo Usuario';
  document.getElementById('m-id').value = '';
  ['nombres','apellidos','email','telefono','direccion'].forEach(f =>
    document.getElementById('m-' + f).value = '');
  document.getElementById('m-pass').value = '';
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
  document.getElementById('m-rol').value       = u.idRol;
  document.getElementById('campo-pass').style.display = 'none';
  document.getElementById('modal-usuario').classList.add('active');
}

function cerrarModal() {
  document.getElementById('modal-usuario').classList.remove('active');
}

async function guardarUsuario() {
  const id = document.getElementById('m-id').value;
  const payload = {
    Nombres:   document.getElementById('m-nombres').value,
    Apellidos: document.getElementById('m-apellidos').value,
    Email:     document.getElementById('m-email').value,
    Telefono:  document.getElementById('m-telefono').value,
    Direccion: document.getElementById('m-direccion').value,
    Sexo:      document.getElementById('m-sexo').value,
    idRol:     parseInt(document.getElementById('m-rol').value),
    Estado:    'ACTIVO',
  };
  if (!id) {
    payload.Password_hash   = document.getElementById('m-pass').value;
    payload.Fecha_nacimiento = '2000-01-01';
  }
  const url    = id ? `/api/usuarios/${id}` : '/api/usuarios';
  const method = id ? 'PUT' : 'POST';
  const res    = await fetch(url, { method, headers: H, body: JSON.stringify(payload) });
  const data   = await res.json();
  if (data.id || data.message === 'Usuario actualizado') {
    cerrarModal();
    cargarUsuarios();
  } else {
    alert('Error: ' + (data.message || data.error?.sqlMessage || 'No se pudo guardar'));
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
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
  if (seccion === 'inventario') cargarInventario();
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
    cargarUsuariosDoctores(); // refresca el autocompletado de usuario doctor
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
    const horario = (d.hora_inicio && d.hora_fin)
      ? `<span class="horario-chip">🕐 ${d.hora_inicio.substring(0,5)} – ${d.hora_fin.substring(0,5)}</span>`
      : (d.Horario || '<span style="color:var(--text-soft);font-size:12px;">Sin horario</span>');
    return `
      <tr>
        <td>#${d.idDoctor}</td>
        <td><strong>${d.Nombres || '—'} ${d.Apellidos || ''}</strong></td>
        <td>${d.Especialidad || '—'}</td>
        <td style="font-size:12.5px;font-family:monospace;">${d.numero_junta_medica || '—'}</td>
        <td>${horario}</td>
        <td><span class="badge-estado--${esActivo ? 'activo' : 'inactivo'}">${d.Estado}</span></td>
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

function abrirModalEditarMedico(d) {
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
    alert('La especialidad es obligatoria.');
    return;
  }

  if (horaInicio && horaFin && horaInicio >= horaFin) {
    alert('La hora de fin debe ser posterior a la hora de inicio.');
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

  if (res.status === 409) {
    alert('⚠️ ' + data.error);
    return;
  }

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

// ── AUTOCOMPLETADO USUARIO DOCTOR ─────────────
let listaUsuariosDoctores = [];

async function cargarUsuariosDoctores() {
  try {
    const res   = await fetch('/api/usuarios', { headers: H });
    const todos = await res.json();
    listaUsuariosDoctores = Array.isArray(todos)
      ? todos.filter(u => u.idRol === 30002)
      : [];
  } catch { /* sin datos */ }
}

function buscarUsuarioDoctor() {
  const input     = document.getElementById('md-usuario-nombre');
  const sugerencias = document.getElementById('sugerencias-usuario-doctor');
  const q = input.value.toLowerCase().trim();

  if (!q) { sugerencias.style.display = 'none'; return; }

  const lista = listaUsuariosDoctores.filter(u =>
    `${u.Nombres} ${u.Apellidos}`.toLowerCase().includes(q) ||
    (u.Email || '').toLowerCase().includes(q)
  );

  sugerencias.innerHTML = lista.length
    ? lista.map(u => `
        <div class="autocomplete-item"
          onclick="seleccionarUsuarioDoctor(${u.idUsuario}, '${u.Nombres} ${u.Apellidos}')">
          <strong>${u.Nombres} ${u.Apellidos}</strong>
          <span>${u.Email}</span>
        </div>`).join('')
    : '<div class="autocomplete-item">Sin resultados</div>';

  sugerencias.style.display = 'block';
}

function seleccionarUsuarioDoctor(id, nombre) {
  document.getElementById('md-usuario-nombre').value = nombre;
  document.getElementById('md-usuario').value        = id;
  document.getElementById('sugerencias-usuario-doctor').style.display = 'none';
}

document.addEventListener('click', (e) => {
  const input = document.getElementById('md-usuario-nombre');
  const sug   = document.getElementById('sugerencias-usuario-doctor');
  if (input && sug && !input.contains(e.target) && !sug.contains(e.target)) {
    sug.style.display = 'none';
  }
});

// ── CERRAR SESIÓN ─────────────────────────────
function cerrarSesion() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  window.location.href = '/';
}

// ── INIT ──────────────────────────────────────
cargarStats();
cargarUsuariosDoctores();

// ── ESTADO ────────────────────────────────────
let listaMedicamentos = [];

// ── CARGAR INVENTARIO ─────────────────────────
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
  document.getElementById('tbody-inventario').innerHTML = Array.isArray(lista) && lista.length
    ? lista.map(m => {
        const bajo = m.stock_actual === 0;
        const estadoBadge = m.estado === 'ACTIVO'
          ? '<span class="badge badge--activo">ACTIVO</span>'
          : '<span class="badge badge--inactivo">INACTIVO</span>';
        const stockColor = bajo
          ? 'color:#c03030;font-weight:700;'
          : 'color:var(--teal);font-weight:700;';
        const stockTexto = bajo
          ? `<span style="${stockColor}" title="Sin stock disponible">${m.stock_actual} ${m.unidad_medida}</span>`
          : `<span style="${stockColor}">${m.stock_actual} ${m.unidad_medida}</span>`;
        const esActivo = m.estado === 'ACTIVO';
        return `
          <tr>
            <td>#${m.idMedicamento}</td>
            <td><strong>${m.nombre}</strong><br/><span style="font-size:11px;color:var(--text-soft);">${m.descripcion || ''}</span></td>
            <td>${stockTexto}</td>
            <td>${m.stock_minimo}</td>
            <td>${m.unidad_medida}</td>
            <td>$${parseFloat(m.precio_unitario || 0).toFixed(2)}</td>
            <td>${estadoBadge}</td>
            <td>
              <div class="action-icons">
                <button class="icon-btn icon-btn--edit" title="Editar medicamento"
                  onclick='abrirModalEditarMed(${JSON.stringify(m)})'>✏️</button>
                <button
                  class="icon-btn"
                  style="background:${esActivo ? 'rgba(200,50,50,0.15)' : 'rgba(42,107,94,0.15)'};"
                  title="${esActivo ? 'Desactivar medicamento' : 'Activar medicamento'}"
                  onclick="toggleMedicamento(${m.idMedicamento}, '${esActivo ? 'INACTIVO' : 'ACTIVO'}')">
                  ${esActivo ? '🟢' : '🔴'}
                </button>
              </div>
            </td>
          </tr>`;
      }).join('')
    : '<tr><td colspan="8" style="text-align:center;color:var(--text-soft);padding:20px;">Sin medicamentos registrados</td></tr>';
}

// ── ALERTAS STOCK MÍNIMO — criterio 3 ─────────
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
                <strong style="color:var(--deep);">${m.nombre}</strong>
                <span style="color:#c03030;margin-left:6px;">Stock: ${m.stock_actual} / Mín: ${m.stock_minimo}</span>
              </div>`).join('')}
          </div>
        </div>`;
    } else {
      cont.style.display = 'none';
    }
  } catch { /* sin datos */ }
}

// ── HISTORIAL MOVIMIENTOS — criterio 5 ────────
async function cargarMovimientos() {
  try {
    const res  = await fetch('/api/medicamentos/movimientos', { headers: H });
    const data = await res.json();
    document.getElementById('tbody-movimientos').innerHTML = Array.isArray(data) && data.length
      ? data.map(m => {
          const colorTipo = m.tipo_movimiento === 'ENTRADA'
            ? 'color:var(--teal);'
            : m.tipo_movimiento === 'SALIDA'
              ? 'color:#c03030;'
              : 'color:var(--gold);';
          const simbolo = m.tipo_movimiento === 'ENTRADA' ? '+' : m.tipo_movimiento === 'SALIDA' ? '-' : '±';
          return `
            <tr>
              <td>${m.fecha_movimiento ? m.fecha_movimiento.split('T')[0] : '–'}</td>
              <td><strong>${m.nombreMedicamento || '–'}</strong></td>
              <td style="${colorTipo}font-weight:700;">${m.tipo_movimiento}</td>
              <td>${simbolo}${m.cantidad}</td>
              <td>${m.stock_anterior} → ${m.stock_nuevo}</td>
              <td>${m.motivo || '–'}</td>
              <td>${m.proveedor || '–'}</td>
            </tr>`;
        }).join('')
      : '<tr><td colspan="7" style="text-align:center;color:var(--text-soft);padding:20px;">Sin movimientos registrados</td></tr>';
  } catch { /* sin datos */ }
}

// ── BUSCAR EN INVENTARIO ──────────────────────
function buscarInventario() {
  const q = document.getElementById('q-inventario').value.toLowerCase().trim();
  if (!q) return renderTablaInventario(listaMedicamentos);
  const filtro = listaMedicamentos.filter(m =>
    m.nombre.toLowerCase().includes(q) ||
    (m.descripcion || '').toLowerCase().includes(q)
  );
  renderTablaInventario(filtro);
}

// ── MODAL NUEVO MEDICAMENTO ───────────────────
function abrirModalNuevoMed() {
  document.getElementById('med-id').value          = '';
  document.getElementById('med-nombre').value      = '';
  document.getElementById('med-descripcion').value = '';
  document.getElementById('med-stock').value       = '';
  document.getElementById('med-stock-min').value   = '5';
  document.getElementById('med-unidad').value      = 'tableta';
  document.getElementById('med-precio').value      = '';
  document.getElementById('modal-med-titulo').textContent = 'Nuevo Medicamento';

  // Desbloquear stock al crear
  document.getElementById('med-stock').removeAttribute('readonly');
  document.getElementById('med-stock').style.opacity = '1';
  document.getElementById('med-stock').style.cursor  = 'auto';
  document.getElementById('med-stock-min').removeAttribute('readonly');
  document.getElementById('med-stock-min').style.opacity = '1';
  document.getElementById('med-stock-min').style.cursor  = 'auto';

  document.getElementById('acciones-stock-modal').style.display = 'none';
  document.getElementById('modal-medicamento').classList.add('active');
}

function abrirModalEditarMed(m) {
  document.getElementById('med-id').value          = m.idMedicamento;
  document.getElementById('med-nombre').value      = m.nombre;
  document.getElementById('med-descripcion').value = m.descripcion || '';
  document.getElementById('med-stock').value       = m.stock_actual;
  document.getElementById('med-stock-min').value   = m.stock_minimo;
  document.getElementById('med-unidad').value      = m.unidad_medida;
  document.getElementById('med-precio').value      = m.precio_unitario || '';
  document.getElementById('modal-med-titulo').textContent = 'Editar Medicamento';

  // Bloquear stock al editar
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
  if (!payload.nombre) return alert('El nombre es requerido');

  const url    = id ? `/api/medicamentos/${id}` : '/api/medicamentos';
  const method = id ? 'PUT' : 'POST';
  const res    = await fetch(url, { method, headers: H, body: JSON.stringify(payload) });
  const data   = await res.json();

  if (data.message || data.id) {
    cerrarModalMed();
    cargarInventario();
  } else {
    alert('Error: ' + (data.error?.sqlMessage || JSON.stringify(data.error)));
  }
}

// ── MODAL ENTRADA DE STOCK — criterio 6 ───────
function abrirModalEntrada(idMedicamento, nombre) {
  document.getElementById('entrada-id-med').value  = idMedicamento;
  document.getElementById('entrada-nombre').textContent = nombre;
  document.getElementById('entrada-cantidad').value = '';
  document.getElementById('entrada-proveedor').value = '';
  document.getElementById('modal-entrada').classList.add('active');
}

function cerrarModalEntrada() {
  document.getElementById('modal-entrada').classList.remove('active');
}

async function guardarEntrada() {
  const id       = document.getElementById('entrada-id-med').value;
  const cantidad = parseInt(document.getElementById('entrada-cantidad').value);
  const proveedor= document.getElementById('entrada-proveedor').value.trim();

  if (!cantidad || cantidad <= 0) return alert('Ingresa una cantidad válida');

  const res  = await fetch(`/api/medicamentos/${id}/entrada`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ cantidad, proveedor })
  });
  const data = await res.json();
  if (data.message) {
    cerrarModalEntrada();
    cargarInventario();
  } else {
    alert('Error: ' + (data.error?.sqlMessage || JSON.stringify(data.error)));
  }
}

// ── MODAL AJUSTE MANUAL ───────────────────────
function abrirModalAjuste(idMedicamento, nombre, stockActual) {
  document.getElementById('ajuste-id-med').value    = idMedicamento;
  document.getElementById('ajuste-nombre').textContent = nombre;
  document.getElementById('ajuste-stock-actual').textContent = stockActual;
  document.getElementById('ajuste-cantidad').value  = stockActual;
  document.getElementById('ajuste-motivo').value    = '';
  document.getElementById('modal-ajuste').classList.add('active');
}

function cerrarModalAjuste() {
  document.getElementById('modal-ajuste').classList.remove('active');
}

async function guardarAjuste() {
  const id             = document.getElementById('ajuste-id-med').value;
  const cantidad_nueva = parseInt(document.getElementById('ajuste-cantidad').value);
  const motivo         = document.getElementById('ajuste-motivo').value.trim();

  if (cantidad_nueva === undefined || isNaN(cantidad_nueva)) return alert('Ingresa una cantidad válida');

  const res  = await fetch(`/api/medicamentos/${id}/ajuste`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ cantidad_nueva, motivo: motivo || 'Ajuste manual' })
  });
  const data = await res.json();
  if (data.message) {
    cerrarModalAjuste();
    cargarInventario();
  } else {
    alert('Error: ' + (data.error?.sqlMessage || JSON.stringify(data.error)));
  }
}

// ── TOGGLE ESTADO ─────────────────────────────
async function toggleMedicamento(id, nuevoEstado) {
  const accion = nuevoEstado === 'ACTIVO' ? 'activar' : 'desactivar';
  if (!confirm(`¿Deseas ${accion} este medicamento?`)) return;
  const res  = await fetch(`/api/medicamentos/${id}/toggle`, {
    method: 'PATCH', headers: H,
    body: JSON.stringify({ estado: nuevoEstado })
  });
  const data = await res.json();
  if (data.message) cargarInventario();
  else alert('Error: ' + (data.error?.sqlMessage || JSON.stringify(data.error)));
}

function switchTabInv(tab) {
  document.getElementById('tab-inv-medicamentos').style.display = tab === 'medicamentos' ? 'block' : 'none';
  document.getElementById('tab-inv-movimientos').style.display  = tab === 'movimientos'  ? 'block' : 'none';
  document.getElementById('tab-medicamentos').classList.toggle('active', tab === 'medicamentos');
  document.getElementById('tab-movimientos').classList.toggle('active',  tab === 'movimientos');
}

function abrirDesdeEditar(tipo) {
  const id     = document.getElementById('med-id').value;
  const nombre = document.getElementById('med-nombre').value;
  const stock  = parseInt(document.getElementById('med-stock').value) || 0;
  cerrarModalMed();
  if (tipo === 'entrada') {
    abrirModalEntrada(id, nombre);
  } else {
    abrirModalAjuste(id, nombre, stock);
  }
}
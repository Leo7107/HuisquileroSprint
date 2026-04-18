// ══════════════════════════════════════════════
//  DASHBOARD RECEPCIONISTA — dashboard-recepcionista.js
// ══════════════════════════════════════════════

// ── AUTH ──────────────────────────────────────
const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
if (!usuario || usuario.rol !== 30003) {
  alert('Acceso denegado.');
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
const token = localStorage.getItem('token');
const H = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

// ── NAVEGACIÓN ────────────────────────────────
function nav(seccion, linkEl) {
  document.querySelectorAll('[id^="sec-"]').forEach(s => s.style.display = 'none');
  document.getElementById('sec-' + seccion).style.display = 'block';
  document.querySelectorAll('.nav-item').forEach(a => a.classList.remove('active'));
  if (linkEl) linkEl.classList.add('active');

  if (seccion === 'citas')     cargarCitas();
  if (seccion === 'pacientes') cargarPacientesRecientes();
  if (seccion === 'buscar')    iniciarBuscador();
  if (seccion === 'medicos')   cargarMedicos();
}

// ── STATS ─────────────────────────────────────
async function cargarStats() {
  try {
    const [cRes, pRes] = await Promise.all([
      fetch('/api/citas',     { headers: H }),
      fetch('/api/pacientes', { headers: H }),
    ]);
    const citas     = await cRes.json();
    const pacientes = await pRes.json();

    const hoy = new Date().toISOString().split('T')[0];
    const citasHoy = Array.isArray(citas)
      ? citas.filter(c => c.fecha && String(c.fecha).startsWith(hoy)) : [];

    document.getElementById('s-citas-hoy').textContent = citasHoy.length;
    document.getElementById('s-pacientes').textContent = Array.isArray(pacientes) ? pacientes.length : '—';

   document.getElementById('citas-preview').innerHTML = citasHoy.length
      ? citasHoy.slice(0,4).map(c => {
          const paciente = c.NombrePaciente
            ? `${c.NombrePaciente} ${c.ApellidosPaciente}`
            : `#${c.idPaciente}`;
          const doctor = c.NombreDoctor
            ? `${c.NombreDoctor} ${c.ApellidosDoctor}`
            : `#${c.idDoctor}`;
          return `
            <tr>
              <td>${c.hora || '—'}</td>
              <td>${paciente}</td>
              <td>${doctor}</td>
              <td><span class="badge badge--${c.estado === 'CONFIRMADA' ? 'activo' : 'pendiente'}">${c.estado}</span></td>
            </tr>`;
        }).join('')
      : '<tr><td colspan="4" style="text-align:center;color:var(--text-soft);padding:16px;">Sin citas para hoy</td></tr>';
  } catch { /* sin datos */ }
}

// ── CITAS ─────────────────────────────────────
let todasCitas    = [];
let tabCitaActual = 'todas';

async function cargarCitas() {
  try {
    const res  = await fetch('/api/citas', { headers: H });
    todasCitas = await res.json();
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
  document.getElementById('tbody-citas').innerHTML = lista.map(c => {
    const paciente = c.NombrePaciente
      ? `${c.NombrePaciente} ${c.ApellidosPaciente}`
      : `#${c.idPaciente}`;
    const doctor = c.NombreDoctor
      ? `${c.NombreDoctor} ${c.ApellidosDoctor}`
      : `#${c.idDoctor}`;
    return `
      <tr>
        <td>#${c.idCita}</td>
        <td>${c.fecha ? c.fecha.split('T')[0] : '—'}</td>
        <td>${c.hora  || '—'}</td>
        <td>${paciente}</td>
        <td>${doctor}</td>
        <td><span class="badge badge--${['CONFIRMADA','FINALIZADA'].includes(c.estado) ? 'activo' : 'pendiente'}">${c.estado}</span></td>
        <td>
          <div class="action-icons">
            <button class="icon-btn icon-btn--edit"   title="Editar"   onclick='abrirModalEditarCita(${JSON.stringify(c)})'>✏️</button>
            <button class="icon-btn icon-btn--cancel" title="Cancelar" onclick="cancelarCita(${c.idCita})">✕</button>
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

async function cancelarCita(id) {
  if (!confirm('¿Cancelar esta cita?')) return;
  await fetch(`/api/citas/${id}`, {
    method: 'PUT', headers: H, body: JSON.stringify({ estado: 'CANCELADA' })
  });
  cargarCitas();
}

// ── MODAL CITA ────────────────────────────────
function abrirModalCita() {
  document.getElementById('modal-cita-titulo').textContent  = 'Nueva Cita';
  document.getElementById('cita-id').value                  = '';
  ['fecha','hora','motivo'].forEach(f => document.getElementById('cita-' + f).value = '');
  document.getElementById('cita-paciente').value            = '';
  document.getElementById('cita-paciente-nombre').value     = '';
  document.getElementById('cita-doctor').value              = '';
  document.getElementById('cita-doctor-nombre').value       = '';
  document.getElementById('cita-estado').value              = 'PENDIENTE';
  document.getElementById('modal-cita').classList.add('active');
}

function abrirModalEditarCita(c) {
  document.getElementById('modal-cita-titulo').textContent = 'Editar Cita';
  document.getElementById('cita-id').value       = c.idCita;
  document.getElementById('cita-fecha').value    = c.fecha ? c.fecha.split('T')[0] : '';
  document.getElementById('cita-hora').value     = c.hora       || '';
  document.getElementById('cita-paciente').value = c.idPaciente || '';
  document.getElementById('cita-doctor').value   = c.idDoctor   || '';
  document.getElementById('cita-estado').value   = c.estado     || 'PENDIENTE';
  document.getElementById('cita-motivo').value   = c.motivo     || '';
  document.getElementById('modal-cita').classList.add('active');
}

function cerrarModalCita() {
  document.getElementById('modal-cita').classList.remove('active');
}

async function guardarCita() {
  const id         = document.getElementById('cita-id').value;
  const idPaciente = parseInt(document.getElementById('cita-paciente').value);
  const idDoctor   = parseInt(document.getElementById('cita-doctor').value);

  if (!idPaciente || !idDoctor) {
    alert('Debes seleccionar un paciente y un doctor.');
    return;
  }

  const payload = {
    fecha:      document.getElementById('cita-fecha').value,
    hora:       document.getElementById('cita-hora').value,
    idPaciente,
    idDoctor,
    estado:     document.getElementById('cita-estado').value,
    motivo:     document.getElementById('cita-motivo').value,
  };

  const url    = id ? `/api/citas/${id}` : '/api/citas';
  const method = id ? 'PUT' : 'POST';
  const res    = await fetch(url, { method, headers: H, body: JSON.stringify(payload) });
  const data   = await res.json();

  if (data.id || data.message) {
    cerrarModalCita();
    cargarCitas();
  } else {
    alert('Error al guardar cita: ' + (data.error?.sqlMessage || 'Revisa los datos'));
  }
}

// ── PACIENTES ─────────────────────────────────
async function cargarPacientesRecientes() {
  try {
    const res   = await fetch('/api/pacientes', { headers: H });
    const lista = await res.json();
    const recientes = Array.isArray(lista) ? lista.slice(-6).reverse() : [];
    document.getElementById('lista-recientes').innerHTML = recientes.length
      ? recientes.map(p => `
          <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(42,107,94,0.07);">
            <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,var(--teal),var(--teal-light));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0;">
              ${(p.numero_expediente || 'P')[0]}
            </div>
            <div>
              <strong style="display:block;font-size:13px;color:var(--deep);">${p.numero_expediente}</strong>
              <span style="font-size:11.5px;color:var(--text-soft);">${p.estado_paciente} · ${p.tipo_sangre || 'Sin tipo'}</span>
            </div>
          </div>`).join('')
      : '<p style="color:var(--text-soft);font-size:13px;">Sin pacientes registrados aún.</p>';
  } catch { /* sin datos */ }
}

async function buscarUsuarioPaciente() {
  const input = document.getElementById('pac-usuario-nombre');
  const sugerencias = document.getElementById('sugerencias-usuario-paciente');
  const q = input.value.toLowerCase().trim();

  if (!q) { 
    sugerencias.style.display = 'none'; 
    return; 
  }

  try {
    const res = await fetch('/api/usuarios', { headers: H });
    const usuarios = await res.json();

    // Filtramos correctamente por rol 30001 y por nombre/email
    const filtrados = usuarios.filter(u => {
      const coincideRol = u.idRol === 30001;
      const coincideBusqueda = `${u.Nombres} ${u.Apellidos}`.toLowerCase().includes(q) || 
                               (u.Email && u.Email.toLowerCase().includes(q));

      return coincideRol && coincideBusqueda;
    });

    if (filtrados.length > 0) {
      sugerencias.innerHTML = filtrados.map(u => `
        <div class="autocomplete-item" 
             onclick="seleccionarUsuarioParaPaciente(${u.idUsuario}, '${u.Nombres} ${u.Apellidos}')">
          <strong>${u.Nombres} ${u.Apellidos}</strong>
          <span>${u.Email || 'Sin correo'}</span>
        </div>
      `).join('');
      sugerencias.style.display = 'block';
    } else {
      sugerencias.innerHTML = '<div class="autocomplete-item">No se encontraron pacientes disponibles</div>';
      sugerencias.style.display = 'block';
    }
  } catch (error) {
    console.error("Error buscando usuarios:", error);
  }
}

function seleccionarUsuarioParaPaciente(id, nombreCompleto) {
  document.getElementById('pac-usuario-nombre').value = nombreCompleto;
  document.getElementById('pac-usuario').value = id;
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
  const res  = await fetch('/api/pacientes', { method:'POST', headers: H, body: JSON.stringify(payload) });
  const data = await res.json();
  if (data.id) {
    alert('✅ Paciente registrado correctamente');
    ['exp','contacto','parentesco','obs','usuario'].forEach(f =>
      document.getElementById('pac-' + f).value = '');
    document.getElementById('pac-sangre').value = '';
    cargarPacientesRecientes();
  } else {
    alert('Error: ' + (data.message || data.error?.sqlMessage || 'No se pudo registrar'));
  }
}

// ── BUSCADOR GLOBAL ───────────────────────────
let todosPacientes = [];

async function iniciarBuscador() {
  if (todosPacientes.length) return;
  try {
    const res = await fetch('/api/pacientes', { headers: H });
    todosPacientes = await res.json();
  } catch { /* sin datos */ }
}

function buscarPaciente() {
  const q    = document.getElementById('q-global').value.toLowerCase().trim();
  const cont = document.getElementById('resultados-busqueda');

  if (!q) {
    cont.innerHTML = '<p style="text-align:center;color:var(--text-soft);padding:24px;font-size:13px;">Escribe para buscar un paciente...</p>';
    return;
  }

  const res = Array.isArray(todosPacientes)
    ? todosPacientes.filter(p =>
        (p.numero_expediente || '').toLowerCase().includes(q) ||
        String(p.idPaciente).includes(q))
    : [];

  cont.innerHTML = res.length
    ? res.map(p => `
        <div class="resultado-item">
          <div class="resultado-avatar">${(p.numero_expediente || 'P')[0]}</div>
          <div class="resultado-info">
            <strong>Expediente: ${p.numero_expediente}</strong>
            <span>ID ${p.idPaciente} · ${p.estado_paciente} · Sangre: ${p.tipo_sangre || 'N/A'} · Contacto: ${p.contacto_emergencia || '—'}</span>
          </div>
        </div>`).join('')
    : `<p style="text-align:center;color:var(--text-soft);padding:24px;font-size:13px;">No se encontraron resultados para "<strong>${q}</strong>".</p>`;
}

// ── AUTOCOMPLETADO CITAS ──────────────────────
let listaPacientes = [];
let listaDoctores  = [];

// Carga pacientes y doctores ACTIVOS para el autocompletado del modal de citas
async function cargarListasAutocompletado() {
  try {
    const [pRes, dRes] = await Promise.all([
      fetch('/api/pacientes',        { headers: H }),
      fetch('/api/doctores/activos', { headers: H }),
    ]);
    listaPacientes = await pRes.json();
    listaDoctores  = await dRes.json();
  } catch { /* sin datos */ }
}

function buscarAutocompletado(tipo) {
  const inputNombre = document.getElementById(`cita-${tipo}-nombre`);
  const sugerencias = document.getElementById(`sugerencias-${tipo}`);
  const q = inputNombre.value.toLowerCase().trim();

  if (!q) { sugerencias.style.display = 'none'; return; }

  let lista = [];

  if (tipo === 'paciente') {
  lista = Array.isArray(listaPacientes)
    ? listaPacientes.filter(p =>
        (p.numero_expediente || '').toLowerCase().includes(q) ||
        (`${p.Nombres || ''} ${p.Apellidos || ''}`).toLowerCase().includes(q) ||
        String(p.idPaciente).includes(q))
    : [];
  sugerencias.innerHTML = lista.length
    ? lista.map(p => `
        <div class="autocomplete-item"
          onclick="seleccionar('paciente', ${p.idPaciente}, '${p.Nombres || ''} ${p.Apellidos || ''}')">
          <strong>${p.Nombres || ''} ${p.Apellidos || ''}</strong>
          <span>Exp: ${p.numero_expediente} · ${p.estado_paciente}</span>
        </div>`).join('')
    : '<div class="autocomplete-item">Sin resultados</div>';
}

  if (tipo === 'doctor') {
    lista = Array.isArray(listaDoctores)
      ? listaDoctores.filter(d =>
          (d.Nombres + ' ' + d.Apellidos).toLowerCase().includes(q) ||
          (d.Especialidad || '').toLowerCase().includes(q))
      : [];
    sugerencias.innerHTML = lista.length
      ? lista.map(d => `
          <div class="autocomplete-item"
            onclick="seleccionar('doctor', ${d.idDoctor}, '${d.Nombres} ${d.Apellidos}')">
            <strong>${d.Nombres} ${d.Apellidos}</strong>
            <span>${d.Especialidad}</span>
          </div>`).join('')
      : '<div class="autocomplete-item">Sin resultados</div>';
  }

  sugerencias.style.display = 'block';
}

function seleccionar(tipo, id, nombre) {
  document.getElementById(`cita-${tipo}-nombre`).value = nombre;
  document.getElementById(`cita-${tipo}`).value        = id;
  document.getElementById(`sugerencias-${tipo}`).style.display = 'none';
}

// ── AUTOCOMPLETADO USUARIO DOCTOR ─────────────
let listaUsuariosDoctores = [];

// Carga usuarios con rol Doctor (30002) para vincular al registrar un médico
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

// Cierra todas las listas de sugerencias al hacer clic fuera
document.addEventListener('click', (e) => {
  ['paciente','doctor'].forEach(tipo => {
    const input = document.getElementById(`cita-${tipo}-nombre`);
    const sug   = document.getElementById(`sugerencias-${tipo}`);
    if (input && sug && !input.contains(e.target) && !sug.contains(e.target)) {
      sug.style.display = 'none';
    }
  });

  const inputMd = document.getElementById('md-usuario-nombre');
  const sugMd   = document.getElementById('sugerencias-usuario-doctor');
  if (inputMd && sugMd && !inputMd.contains(e.target) && !sugMd.contains(e.target)) {
    sugMd.style.display = 'none';
  }

  const inputPac = document.getElementById('pac-usuario-nombre');
  const sugPac = document.getElementById('sugerencias-usuario-paciente');
  if (inputPac && sugPac && !inputPac.contains(e.target) && !sugPac.contains(e.target)) {
    sugPac.style.display = 'none';
  }
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
  document.getElementById('tbody-medicos').innerHTML = lista.map(d => {
    const esActivo = d.Estado === 'ACTIVO';
    // Criterio 2: muestra hora_inicio y hora_fin si existen
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

  // Criterio 1: especialidad obligatoria
  if (!document.getElementById('md-especialidad').value) {
    alert('La especialidad es obligatoria.');
    return;
  }

  // Criterio 2: hora_fin debe ser posterior a hora_inicio
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
    Estado:              document.getElementById('md-estado').value,
    idUsuario:           parseInt(document.getElementById('md-usuario').value) || null,
  };

  const url    = id ? `/api/doctores/${id}` : '/api/doctores';
  const method = id ? 'PUT' : 'POST';
  const res    = await fetch(url, { method, headers: H, body: JSON.stringify(payload) });
  const data   = await res.json();

  // Criterio 3: backend devuelve 409 si número de junta ya existe
  if (res.status === 409) {
    alert('⚠️ ' + data.error);
    return;
  }

  if (data.message || data.id) {
    cerrarModalMedico();
    cargarMedicos();
    cargarListasAutocompletado(); // refresca doctores activos en modal de citas
  } else {
    alert('Error: ' + (data.error?.sqlMessage || data.error || 'Revisa los datos'));
  }
}

// Criterio 1 y 4: activa o desactiva un médico
async function toggleMedico(id, estaActivo) {
  const accion  = estaActivo ? 'desactivar' : 'activar';
  const mensaje = estaActivo
    ? '¿Desactivar este médico? No aparecerá disponible para agendar citas.'
    : '¿Activar este médico?';
  if (!confirm(mensaje)) return;

  const res  = await fetch(`/api/doctores/${id}/${accion}`, { method: 'PATCH', headers: H });
  const data = await res.json();

  if (data.message) {
    cargarMedicos();
    cargarListasAutocompletado(); // refresca el autocompletado de citas
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
cargarListasAutocompletado();
cargarUsuariosDoctores();
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
    const sinPreconsulta = citasHoy.filter(c =>
      ['PENDIENTE','CONFIRMADA'].includes(c.estado) &&
      !idsConPreconsulta.includes(String(c.idCita))
    );
    const atendidas = citasHoy.filter(c => c.estado === 'FINALIZADA');

    document.getElementById('s-citas-hoy').textContent    = citasHoy.length;
    document.getElementById('s-preconsultas').textContent = sinPreconsulta.length;
    document.getElementById('s-atendidos').textContent    = atendidas.length;
    document.getElementById('s-pacientes').textContent    = Array.isArray(pacientes) ? pacientes.length : '—';

    document.getElementById('citas-preview').innerHTML = citasHoy.length
      ? citasHoy.slice(0,4).map(c => {
          const paciente = c.NombrePaciente ? `${c.NombrePaciente} ${c.ApellidosPaciente}` : `#${c.idPaciente}`;
          const doctor   = c.NombreDoctor   ? `${c.NombreDoctor} ${c.ApellidosDoctor}`     : `#${c.idDoctor}`;
          const tienePre = idsConPreconsulta.includes(String(c.idCita));
          return `
            <tr>
              <td>${c.hora || '—'}</td>
              <td>${paciente}</td>
              <td>${doctor}</td>
              <td>
                <span class="badge badge--${['CONFIRMADA','FINALIZADA'].includes(c.estado) ? 'activo' : 'pendiente'}">${c.estado}</span>
                ${tienePre ? '<span style="font-size:10px;color:var(--teal);margin-left:4px;">📋</span>' : ''}
              </td>
            </tr>`;
        }).join('')
      : '<tr><td colspan="4" style="text-align:center;color:var(--text-soft);padding:16px;">Sin citas para hoy</td></tr>';
  } catch {}
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
    const paciente = c.NombrePaciente ? `${c.NombrePaciente} ${c.ApellidosPaciente}` : `#${c.idPaciente}`;
    const doctor   = c.NombreDoctor   ? `${c.NombreDoctor} ${c.ApellidosDoctor}`     : `#${c.idDoctor}`;
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
  await fetch(`/api/citas/${id}`, { method:'PUT', headers:H, body:JSON.stringify({ estado:'CANCELADA' }) });
  cargarCitas();
}

// ── MODAL CITA ────────────────────────────────
function abrirModalCita() {
  document.getElementById('modal-cita-titulo').textContent = 'Nueva Cita';
  document.getElementById('cita-id').value                 = '';
  ['fecha','hora','motivo'].forEach(f => document.getElementById('cita-' + f).value = '');
  document.getElementById('cita-paciente').value       = '';
  document.getElementById('cita-paciente-nombre').value = '';
  document.getElementById('cita-doctor').value         = '';
  document.getElementById('cita-doctor-nombre').value  = '';
  document.getElementById('cita-estado').value         = 'PENDIENTE';
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

  if (res.status === 409) { alert('⚠️ ' + data.error); return; }
  if (data.id || data.message) { cerrarModalCita(); cargarCitas(); }
  else alert('Error al guardar cita: ' + (data.error?.sqlMessage || data.error || 'Revisa los datos'));
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
            <strong>${p.Nombres || ''} ${p.Apellidos || ''}</strong><br>
            <span style="font-size:12px;color:#666;">Expediente: ${p.numero_expediente} | ID: ${p.idPaciente}</span>
          </div>`).join('')
      : '<p>Sin pacientes registrados.</p>';
  } catch (e) { console.error(e); }
}

async function buscarUsuarioPaciente() {
  const input     = document.getElementById('pac-usuario-nombre');
  const sugerencias = document.getElementById('sugerencias-usuario-paciente');
  const q = input.value.toLowerCase().trim();
  document.getElementById('pac-usuario').value = '';
  if (!q) { sugerencias.style.display = 'none'; return; }
  try {
    const res     = await fetch('/api/usuarios', { headers: H });
    const usuarios = await res.json();
    const soloPacientes = usuarios.filter(u => u.idRol === 30001);
    const resPac  = await fetch('/api/pacientes', { headers: H });
    const pacientesConExp = await resPac.json();
    const idsConExp  = pacientesConExp.map(p => p.idUsuario);
    const disponibles = soloPacientes.filter(u => !idsConExp.includes(u.idUsuario));
    const filtrados   = disponibles.filter(u =>
      (`${u.Nombres || ''} ${u.Apellidos || ''}`).toLowerCase().includes(q));
    sugerencias.innerHTML = filtrados.length
      ? filtrados.map(u => `
          <div class="autocomplete-item"
            onclick="seleccionarUsuarioParaPaciente(${u.idUsuario}, '${(u.Nombres+' '+u.Apellidos).replace(/'/g,"\\'")}')">
            <strong>${u.Nombres} ${u.Apellidos}</strong>
            <span>Sin expediente</span>
          </div>`).join('')
      : '<div class="autocomplete-item">Sin resultados</div>';
    sugerencias.style.display = 'block';
  } catch (e) { console.error(e); }
}

function seleccionarUsuarioParaPaciente(id, nombreCompleto) {
  document.getElementById('pac-usuario-nombre').value = nombreCompleto;
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
    alert('✅ Paciente registrado correctamente');
    ['exp','contacto','parentesco','obs','usuario','usuario-nombre'].forEach(f =>
      document.getElementById('pac-' + f).value = '');
    document.getElementById('pac-sangre').value = '';
    cargarPacientesRecientes();
    iniciarBuscador();
    cargarListasAutocompletado();
  } else {
    alert('Error: ' + (data.message || data.error?.sqlMessage || 'No se pudo registrar'));
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
          <strong>${p.Nombres} ${p.Apellidos}</strong><br>
          <span>Exp: ${p.numero_expediente} | ID: ${p.idPaciente}</span>
        </div>`).join('')
    : `<p style="text-align:center;color:gray;">No se encontró "${q}"</p>`;
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
          <div class="autocomplete-item" onclick="seleccionar('paciente', ${p.idPaciente}, '${p.Nombres || ''} ${p.Apellidos || ''}')">
            <strong>${p.Nombres || ''} ${p.Apellidos || ''}</strong>
            <span>Exp: ${p.numero_expediente} · ${p.estado_paciente}</span>
          </div>`).join('')
      : '<div class="autocomplete-item">Sin resultados</div>';
  }

  if (tipo === 'doctor') {
    lista = Array.isArray(listaDoctores)
      ? listaDoctores.filter(d =>
          (`${d.Nombres || ''} ${d.Apellidos || ''}`).toLowerCase().includes(q) ||
          (d.Especialidad || '').toLowerCase().includes(q))
      : [];
    sugerencias.innerHTML = lista.length
      ? lista.map(d => `
          <div class="autocomplete-item" onclick="seleccionar('doctor', ${d.idDoctor}, '${d.Nombres || ''} ${d.Apellidos || ''}')">
            <strong>${d.Nombres || ''} ${d.Apellidos || ''}</strong>
            <span>${d.Especialidad}</span>
          </div>`).join('')
      : '<div class="autocomplete-item">Sin resultados</div>';
  }
  sugerencias.style.display = 'block';
}

function seleccionar(tipo, id, nombre) {
  document.getElementById(`cita-${tipo}-nombre`).value = nombre.trim();
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
  const input     = document.getElementById('md-usuario-nombre');
  const sugerencias = document.getElementById('sugerencias-usuario-doctor');
  const q = input.value.toLowerCase().trim();
  if (!q) { sugerencias.style.display = 'none'; return; }
  const lista = listaUsuariosDoctores.filter(u =>
    (`${u.Nombres || ''} ${u.Apellidos || ''}`).toLowerCase().includes(q) ||
    (u.Email || '').toLowerCase().includes(q)
  );
  sugerencias.innerHTML = lista.length
    ? lista.map(u => `
        <div class="autocomplete-item" onclick="seleccionarUsuarioDoctor(${u.idUsuario}, '${u.Nombres || ''} ${u.Apellidos || ''}')">
          <strong>${u.Nombres || ''} ${u.Apellidos || ''}</strong>
          <span>${u.Email}</span>
        </div>`).join('')
    : '<div class="autocomplete-item">Sin resultados</div>';
  sugerencias.style.display = 'block';
}

function seleccionarUsuarioDoctor(id, nombre) {
  document.getElementById('md-usuario-nombre').value = nombre.trim();
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
  document.getElementById('tbody-medicos').innerHTML = lista.map(d => {
    const esActivo = d.Estado === 'ACTIVO';
    const horario  = (d.hora_inicio && d.hora_fin)
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
            <button class="icon-btn icon-btn--edit" title="Editar" onclick='abrirModalEditarMedico(${JSON.stringify(d)})'>✏️</button>
            <button class="icon-btn icon-btn--toggle" title="${esActivo ? 'Desactivar' : 'Activar'}" onclick="toggleMedico(${d.idDoctor}, ${esActivo})">
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
  document.getElementById('md-id').value          = '';
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

function abrirModalEditarMedico(d) {
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
  const id        = document.getElementById('md-id').value;
  const horaInicio = document.getElementById('md-hora-inicio').value;
  const horaFin   = document.getElementById('md-hora-fin').value;
  if (!document.getElementById('md-especialidad').value) { alert('La especialidad es obligatoria.'); return; }
  if (horaInicio && horaFin && horaInicio >= horaFin) { alert('La hora de fin debe ser posterior a la hora de inicio.'); return; }
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
  if (res.status === 409) { alert('⚠️ ' + data.error); return; }
  if (data.message || data.id) { cerrarModalMedico(); cargarMedicos(); cargarListasAutocompletado(); }
  else alert('Error: ' + (data.error?.sqlMessage || data.error || 'Revisa los datos'));
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
  else alert('Error: ' + (data.error || ''));
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
  document.getElementById('pre-buscar-paciente').value             = '';
  document.getElementById('pre-sug-paciente').style.display        = 'none';
  document.getElementById('pre-bloque-citas').style.display        = 'none';
  document.getElementById('pre-cita-badge').style.display          = 'none';
  document.getElementById('pre-bloque-vitales').style.display      = 'none';
  document.getElementById('pre-panel-historial').style.display     = 'none';
  document.getElementById('pre-alerta-alergias').style.display     = 'none';
  document.getElementById('pre-lista-citas').innerHTML             = '';
  document.getElementById('pre-datos-paciente').innerHTML          = '';
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
  lista.innerHTML = pacs.length
    ? pacs.slice(0,8).map(p => `
        <div class="autocomplete-item"
          onclick="preSeleccionarPaciente(${p.idPaciente}, '${(p.Nombres+' '+p.Apellidos).replace(/'/g,"\\'")}', ${p.idUsuario})">
          <strong>${p.Nombres} ${p.Apellidos}</strong>
          <span>Exp: ${p.numero_expediente || '–'} · ${p.tipo_sangre || 'N/A'}</span>
        </div>`).join('')
    : '<div class="autocomplete-item" style="color:var(--text-soft);">Sin resultados</div>';
  lista.style.display = 'block';
}

async function preSeleccionarPaciente(idPaciente, nombre, idUsuario) {
  _prePaciente = { idPaciente, nombre, idUsuario };
  document.getElementById('pre-buscar-paciente').value          = nombre;
  document.getElementById('pre-sug-paciente').style.display     = 'none';
  document.getElementById('pre-bloque-citas').style.display     = 'block';
  document.getElementById('pre-lista-citas').innerHTML          =
    '<p style="font-size:12.5px;color:var(--text-soft);">Cargando citas...</p>';
  document.getElementById('pre-cita-badge').style.display       = 'none';
  document.getElementById('pre-bloque-vitales').style.display   = 'none';

  const pac = listaPacientes.find(p => p.idPaciente === idPaciente);
  preRenderDatosPaciente(pac);

  const alertEl = document.getElementById('pre-alerta-alergias');
  if (pac?.alergias) {
    alertEl.innerHTML     = `⚠️ Alergias registradas: <strong>${pac.alergias}</strong>`;
    alertEl.style.display = 'block';
  } else {
    alertEl.style.display = 'none';
  }

  try {
    const res   = await fetch(`/api/citas/paciente/${idUsuario}`, { headers: H });
    const citas = await res.json();
    const activas = Array.isArray(citas)
      ? citas.filter(c => ['PENDIENTE','CONFIRMADA'].includes(c.estado)) : [];
    document.getElementById('pre-lista-citas').innerHTML = activas.length
      ? activas.map(c => `
          <div class="pre-cita-item"
            onclick="preElegirCita(${c.idCita}, '${c.fecha ? c.fecha.split('T')[0] : ''}', '${c.hora ? c.hora.substring(0,5) : ''}', '${(c.motivo||'').replace(/'/g,"\\'")}')">
            <strong>${c.fecha ? c.fecha.split('T')[0] : '–'} · ${c.hora ? c.hora.substring(0,5) : '–'}</strong>
            <span>${c.motivo || 'Sin motivo especificado'} · ${c.estado}</span>
          </div>`).join('')
      : '<p style="font-size:12.5px;color:var(--text-soft);">No hay citas activas (PENDIENTE/CONFIRMADA) para este paciente</p>';
  } catch {
    document.getElementById('pre-lista-citas').innerHTML =
      '<p style="font-size:12.5px;color:#c03030;">Error al cargar citas</p>';
  }
}

async function preElegirCita(idCita, fecha, hora, motivo) {
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
    ✅ Cita seleccionada: <strong>${_prePaciente.nombre}</strong>
    · ${fecha} ${hora} · Cita #${idCita}
    <button onclick="preCambiarCita()"
      style="margin-left:10px;padding:3px 10px;border:1px solid var(--border);
        border-radius:7px;background:transparent;font-size:11px;cursor:pointer;color:var(--text-soft);">
      ✕ Cambiar
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
        ${(p.Nombres || 'P')[0]}
      </div>
      <div>
        <strong style="display:block;font-size:14px;color:var(--deep);">${p.Nombres || ''} ${p.Apellidos || ''}</strong>
        <span style="font-size:12px;color:var(--text-soft);">Exp: ${p.numero_expediente || '–'}</span>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;">
      <div style="padding:8px 10px;background:var(--cream);border-radius:10px;">
        <span style="font-size:10.5px;color:var(--text-soft);display:block;">Tipo de Sangre</span>
        <strong style="color:var(--deep);">${p.tipo_sangre || 'N/A'}</strong>
      </div>
      <div style="padding:8px 10px;background:var(--cream);border-radius:10px;">
        <span style="font-size:10.5px;color:var(--text-soft);display:block;">Estado</span>
        <strong style="color:var(--deep);">${p.estado_paciente || '–'}</strong>
      </div>
      <div style="padding:8px 10px;background:var(--cream);border-radius:10px;grid-column:1/-1;">
        <span style="font-size:10.5px;color:var(--text-soft);display:block;">Contacto Emergencia</span>
        <strong style="color:var(--deep);">${p.contacto_emergencia || 'No registrado'}</strong>
        ${p.telefono_emergencia ? `<span style="font-size:11.5px;color:var(--text-soft);"> · ${p.telefono_emergencia}</span>` : ''}
      </div>
      ${p.alergias ? `
      <div style="padding:8px 10px;background:rgba(200,50,50,0.06);border:1.5px solid rgba(200,50,50,0.15);border-radius:10px;grid-column:1/-1;">
        <span style="font-size:10.5px;color:#c03030;display:block;font-weight:700;">⚠️ Alergias</span>
        <strong style="color:#c03030;">${p.alergias}</strong>
      </div>` : ''}
      ${p.padecimientos_cronicos ? `
      <div style="padding:8px 10px;background:var(--cream);border-radius:10px;grid-column:1/-1;">
        <span style="font-size:10.5px;color:var(--text-soft);display:block;">Padecimientos Crónicos</span>
        <strong style="color:var(--deep);">${p.padecimientos_cronicos}</strong>
      </div>` : ''}
    </div>`;
}

async function guardarPreconsulta() {
  if (!_prePaciente) { alert('⚠️ Selecciona un paciente primero.'); return; }
  if (!_preCita)     { alert('⚠️ Selecciona la cita a atender.'); return; }

  const peso    = parseFloat(document.getElementById('pre-peso').value)    || null;
  const altura  = parseFloat(document.getElementById('pre-altura').value)  || null;
  const presion = document.getElementById('pre-presion').value.trim()      || null;
  const temp    = parseFloat(document.getElementById('pre-temp').value)    || null;
  const fc      = parseInt(document.getElementById('pre-fc').value)        || null;
  const sat     = parseFloat(document.getElementById('pre-sat').value)     || null;
  const motivo  = document.getElementById('pre-motivo').value.trim();
  const obs     = document.getElementById('pre-obs').value.trim();

  if (!presion && !peso && !temp) {
    alert('⚠️ Ingresa al menos un signo vital (presión, peso o temperatura).');
    return;
  }

  // ── Validaciones de rango clínico ──────────────────────────────────────────
  const erroresClinico = [];

  if (peso !== null) {
    if (peso < 0.5 || peso > 500)
      erroresClinico.push(`Peso fuera de rango clínico: ${peso} kg (rango válido: 0.5 – 500 kg)`);
  }
  if (altura !== null) {
    if (altura < 20 || altura > 250)
      erroresClinico.push(`Talla fuera de rango clínico: ${altura} cm (rango válido: 20 – 250 cm)`);
  }
  if (temp !== null) {
    if (temp < 32 || temp > 43)
      erroresClinico.push(`Temperatura fuera de rango clínico: ${temp}°C (rango válido: 32 – 43°C)`);
  }
  if (fc !== null) {
    if (fc < 30 || fc > 250)
      erroresClinico.push(`Frecuencia cardíaca fuera de rango: ${fc} lpm (rango válido: 30 – 250 lpm)`);
  }
  if (sat !== null) {
    if (sat < 50 || sat > 100)
      erroresClinico.push(`Saturación O₂ fuera de rango: ${sat}% (rango válido: 50 – 100%)`);
  }
  if (presion) {
    // Validar formato NNN/NNN y rangos sistólica/diastólica
    const matchPres = presion.match(/^(\d{2,3})\/(\d{2,3})$/);
    if (!matchPres) {
      erroresClinico.push(`Formato de presión arterial inválido: "${presion}". Use el formato 120/80`);
    } else {
      const sistolica  = parseInt(matchPres[1]);
      const diastolica = parseInt(matchPres[2]);
      if (sistolica < 50 || sistolica > 300)
        erroresClinico.push(`Presión sistólica fuera de rango: ${sistolica} mmHg (rango válido: 50 – 300)`);
      if (diastolica < 30 || diastolica > 200)
        erroresClinico.push(`Presión diastólica fuera de rango: ${diastolica} mmHg (rango válido: 30 – 200)`);
      if (diastolica >= sistolica)
        erroresClinico.push(`La presión diastólica (${diastolica}) no puede ser mayor o igual a la sistólica (${sistolica})`);
    }
  }

  if (erroresClinico.length) {
    alert('⚠️ Datos fuera de rango clínico:\n\n' + erroresClinico.join('\n'));
    return;
  }
  // ── Fin validaciones ───────────────────────────────────────────────────────

  try {
    const checkRes  = await fetch('/api/consultas', { headers: H });
    const consultas = await checkRes.json();
    const yaExiste  = Array.isArray(consultas)
      ? consultas.find(c => String(c.idCita) === String(_preCita.idCita)) : null;

    if (yaExiste) {
      if (!confirm('Ya existe una preconsulta para esta cita. ¿Deseas actualizarla?')) return;
      const payload = {
        peso, altura, presion_arterial: presion, temperatura: temp,
        observaciones: [motivo, obs, fc ? `FC: ${fc} lpm` : '', sat ? `SpO2: ${sat}%` : '']
          .filter(Boolean).join(' | ') || null,
      };
      const res  = await fetch(`/api/consultas/${yaExiste.idConsulta}`, { method:'PUT', headers:H, body:JSON.stringify(payload) });
      const data = await res.json();
      if (data.message) { alert('✅ Preconsulta actualizada correctamente.'); preLimpiarFormulario(); preCargarUltimas(); cargarStats(); }
      else alert('Error: ' + (data.error?.sqlMessage || data.error || 'No se pudo actualizar'));
      return;
    }

    if (!_preCita.idHistorial) {
      alert('⚠️ Este paciente no tiene historial clínico registrado. Debe registrarse antes de la preconsulta.');
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
      alert(`✅ Preconsulta registrada correctamente para ${_prePaciente.nombre}.`);
      preLimpiarFormulario();
      preCargarUltimas();
      cargarStats();
    } else {
      alert('Error: ' + (data.error?.sqlMessage || data.error || 'No se pudo registrar'));
    }
  } catch (err) {
    alert('Error de conexión.');
    console.error(err);
  }
}

async function preCargarUltimas() {
  try {
    const res  = await fetch('/api/consultas', { headers: H });
    const data = await res.json();
    const cont = document.getElementById('pre-ultimas');
    if (!cont) return;
    cont.innerHTML = Array.isArray(data) && data.length
      ? data.slice(0,6).map(c => `
          <div class="pre-historial-item">
            <strong>${c.NombrePaciente ? `${c.NombrePaciente} ${c.ApellidosPaciente || ''}` : `Cita #${c.idCita}`}</strong>
            <span>
              ${c.fecha_consulta ? c.fecha_consulta.split('T')[0] : '–'}
              ${c.peso ? '· ' + c.peso + ' kg' : ''}
              ${c.presion_arterial ? '· ' + c.presion_arterial : ''}
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
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  window.location.href = '/';
}

// ── INIT ──────────────────────────────────────
cargarStats();
iniciarBuscador();
cargarListasAutocompletado();
cargarUsuariosDoctores();
preCargarUltimas();

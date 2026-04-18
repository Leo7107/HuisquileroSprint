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

// ── NAVEGACIÓN ────────────────────────────────
function nav(seccion, linkEl) {
  document.querySelectorAll('[id^="sec-"]').forEach(s => s.style.display = 'none');
  document.getElementById('sec-' + seccion).style.display = 'block';
  document.querySelectorAll('.nav-item').forEach(a => a.classList.remove('active'));
  if (linkEl) linkEl.classList.add('active');

  if (seccion === 'citas')     cargarCitas();
  if (seccion === 'consultas') cargarConsultas();
  if (seccion === 'recetas')   cargarRecetas();
  if (seccion === 'perfil')    cargarPerfil();
}

// ── CITAS ─────────────────────────────────────
async function cargarCitas() {
  try {
    const res  = await fetch('/api/citas', { headers: H });
    const data = await res.json();
    document.getElementById('tbody-citas').innerHTML = Array.isArray(data) && data.length
      ? data.map(c => `
          <tr>
            <td>#${c.idCita}</td>
            <td>${c.fecha ? c.fecha.split('T')[0] : '—'}</td>
            <td>${c.hora ? c.hora.substring(0,5) : '—'}</td>
            <td>${c.NombreDoctor ? `${c.NombreDoctor} ${c.ApellidosDoctor}` : `#${c.idDoctor}`}</td>
            <td>${c.motivo || '—'}</td>
            <td><span class="badge badge--${c.estado === 'CONFIRMADA' ? 'activo' : 'pendiente'}">${c.estado}</span></td>
          </tr>`).join('')
      : '<tr><td colspan="6" style="text-align:center;color:var(--text-soft);padding:20px;">No tienes citas registradas</td></tr>';
  } catch {
    document.getElementById('tbody-citas').innerHTML =
      '<tr><td colspan="6" style="text-align:center;color:#c03030;padding:20px;">Error al cargar citas</td></tr>';
  }
}

// ── CONSULTAS (solo citas COMPLETADAS) ────────
async function cargarConsultas() {
  try {
    const res  = await fetch('/api/citas', { headers: H });
    const data = await res.json();
    const completadas = Array.isArray(data) ? data.filter(c => c.estado === 'COMPLETADA') : [];
    document.getElementById('tbody-consultas').innerHTML = completadas.length
      ? completadas.map(c => `
          <tr>
            <td>${c.fecha ? c.fecha.split('T')[0] : '—'}</td>
            <td>${c.NombreDoctor ? `${c.NombreDoctor} ${c.ApellidosDoctor}` : `#${c.idDoctor}`}</td>
            <td>${c.motivo || '—'}</td>
            <td>${c.hora ? c.hora.substring(0,5) : '—'}</td>
            <td><span class="badge badge--activo">Completada</span></td>
          </tr>`).join('')
      : '<tr><td colspan="5" style="text-align:center;color:var(--text-soft);padding:20px;">No tienes consultas anteriores</td></tr>';
  } catch {
    document.getElementById('tbody-consultas').innerHTML =
      '<tr><td colspan="5" style="text-align:center;color:#c03030;padding:20px;">Error al cargar consultas</td></tr>';
  }
}

// ── RECETAS ───────────────────────────────────
async function cargarRecetas() {
  try {
    const res  = await fetch('/api/recetas', { headers: H });
    const data = await res.json();
    document.getElementById('tbody-recetas').innerHTML = Array.isArray(data) && data.length
      ? data.map(r => `
          <tr>
            <td>${r.medicamento  || '—'}</td>
            <td>${r.dosis        || '—'}</td>
            <td>${r.frecuencia   || '—'}</td>
            <td>${r.duracion     || '—'}</td>
            <td>${r.indicaciones || '—'}</td>
          </tr>`).join('')
      : '<tr><td colspan="5" style="text-align:center;color:var(--text-soft);padding:20px;">No tienes recetas registradas</td></tr>';
  } catch {
    document.getElementById('tbody-recetas').innerHTML =
      '<tr><td colspan="5" style="text-align:center;color:#c03030;padding:20px;">Error al cargar recetas</td></tr>';
  }
}

// ── NUEVA CITA ────────────────────────────────
let listaDoctores = [];

async function cargarDoctores() {
  try {
    const res = await fetch('/api/doctores/activos', { headers: H });
    listaDoctores = await res.json();
  } catch { /* sin datos */ }
}

function abrirModalCita() {
  document.getElementById('cita-fecha').value        = '';
  document.getElementById('cita-hora').value         = '';
  document.getElementById('cita-doctor').value       = '';
  document.getElementById('cita-doctor-nombre').value = '';
  document.getElementById('cita-motivo').value       = '';
  document.getElementById('horario-info').style.display = 'none';
  document.getElementById('sugerencias-doctor').style.display = 'none';
  document.getElementById('modal-cita').classList.add('active');
}

function cerrarModalCita() {
  document.getElementById('modal-cita').classList.remove('active');
}

function buscarDoctor() {
  const input     = document.getElementById('cita-doctor-nombre');
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
          <span>${d.Especialidad} · ${d.hora_inicio && d.hora_fin ? d.hora_inicio.substring(0,5) + ' – ' + d.hora_fin.substring(0,5) : 'Sin horario'}</span>
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

async function solicitarCita() {
  const idDoctor = parseInt(document.getElementById('cita-doctor').value);
  const fecha    = document.getElementById('cita-fecha').value;
  const hora     = document.getElementById('cita-hora').value;
  const motivo   = document.getElementById('cita-motivo').value;

  if (!idDoctor) { alert('Debes seleccionar un doctor.'); return; }
  if (!fecha || !hora) { alert('Debes seleccionar fecha y hora.'); return; }
  if (!motivo.trim()) { alert('Debes escribir el motivo de la cita.'); return; }

  try {
    const pRes = await fetch('/api/pacientes', { headers: H });
    const pacientes = await pRes.json();
    const miPaciente = Array.isArray(pacientes)
      ? pacientes.find(p => p.idUsuario === usuario.id)
      : null;

    if (!miPaciente) {
      alert('No se encontró tu registro de paciente. Contacta a la recepción.');
      return;
    }

    const payload = { fecha, hora, idPaciente: miPaciente.idPaciente, idDoctor, estado: 'PENDIENTE', motivo };
    const res  = await fetch('/api/citas', { method: 'POST', headers: H, body: JSON.stringify(payload) });
    const data = await res.json();

    if (res.status === 409) { alert('⚠️ ' + data.error); return; }

    if (data.id || data.message) {
      alert('✅ Cita solicitada correctamente. Estado: Pendiente de confirmación.');
      cerrarModalCita();
      cargarCitas();
    } else {
      alert('Error: ' + (data.error?.sqlMessage || data.error || 'No se pudo solicitar la cita'));
    }
  } catch {
    alert('Error de conexión. Intenta de nuevo.');
  }
}

document.addEventListener('click', (e) => {
  const input = document.getElementById('cita-doctor-nombre');
  const sug   = document.getElementById('sugerencias-doctor');
  if (input && sug && !input.contains(e.target) && !sug.contains(e.target)) {
    sug.style.display = 'none';
  }
});

// ── MI PERFIL ─────────────────────────────────
let miPerfilData = null;

async function cargarPerfil() {
  try {
    const res  = await fetch(`/api/perfil/${usuario.id}`, { headers: H });
    const data = await res.json();
    if (data.error) { alert('Error al cargar perfil'); return; }
    miPerfilData = data;

    document.getElementById('perf-nombres').value    = data.Nombres           || '';
    document.getElementById('perf-apellidos').value  = data.Apellidos         || '';
    document.getElementById('perf-email').value      = data.Email             || '';
    document.getElementById('perf-fecha-nac').value  = data.Fecha_nacimiento ? data.Fecha_nacimiento.split('T')[0] : '';
    document.getElementById('perf-sexo').value       = data.Sexo              || '';
    document.getElementById('perf-expediente').value = data.numero_expediente || '';
    document.getElementById('perf-telefono').value   = data.Telefono          || '';
    document.getElementById('perf-direccion').value  = data.Direccion         || '';

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
    alert('Error de conexión al cargar perfil');
  }
}

async function guardarPerfil() {
  if (!miPerfilData) { alert('Primero debes cargar el perfil'); return; }

  const payload = {
    Telefono:              document.getElementById('perf-telefono').value,
    Direccion:             document.getElementById('perf-direccion').value,
    idPaciente:            miPerfilData.idPaciente,
    tipo_sangre:           document.getElementById('perf-tipo-sangre').value,
    contacto_emergencia:   document.getElementById('perf-contacto-emg').value,
    parentesco_emergencia: document.getElementById('perf-parentesco').value,
    telefono_emergencia:   document.getElementById('perf-tel-emg').value,
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
      alert('✅ Perfil actualizado correctamente');
      cargarPerfil();
    } else {
      alert('Error: ' + (data.error?.sqlMessage || data.error || 'No se pudo actualizar'));
    }
  } catch {
    alert('Error de conexión');
  }
}

// ── CERRAR SESIÓN ─────────────────────────────
function cerrarSesion() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  window.location.href = '/';
}

// ── INIT ──────────────────────────────────────
cargarDoctores();

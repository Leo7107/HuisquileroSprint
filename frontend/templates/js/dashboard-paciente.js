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
  if (seccion === 'historial') cargarHistorial();
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

// ── CONSULTAS ─────────────────────────────────
async function cargarConsultas() {
  try {
    const res  = await fetch('/api/consultas', { headers: H });
    const data = await res.json();
    document.getElementById('tbody-consultas').innerHTML = Array.isArray(data) && data.length
      ? data.map(c => `
          <tr>
            <td>${c.fecha_consulta    || '—'}</td>
            <td>${c.peso             || '—'} kg</td>
            <td>${c.presion_arterial || '—'}</td>
            <td>${c.temperatura      || '—'} °C</td>
            <td>${c.observaciones    || '—'}</td>
          </tr>`).join('')
      : '<tr><td colspan="5" style="text-align:center;color:var(--text-soft);padding:20px;">No tienes consultas registradas</td></tr>';
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

// ── HISTORIAL ─────────────────────────────────
async function cargarHistorial() {
  try {
    const res  = await fetch('/api/historial', { headers: H });
    const data = await res.json();
    const h    = Array.isArray(data) ? data[0] : data;
    document.getElementById('contenido-historial').innerHTML = h
      ? `<table class="tabla">
          <tr><th>Fecha apertura</th><td>${h.fecha_apertura || '—'}</td></tr>
          <tr><th>Antecedentes familiares</th><td>${h.antecedentes_familiares || '—'}</td></tr>
          <tr><th>Antecedentes personales</th><td>${h.antecedentes_personales || '—'}</td></tr>
          <tr><th>Alergias</th><td>${h.alergias || '—'}</td></tr>
          <tr><th>Padecimientos crónicos</th><td>${h.padecimientos_cronicos || '—'}</td></tr>
          <tr><th>Cirugías previas</th><td>${h.cirugias_previas || '—'}</td></tr>
          <tr><th>Observaciones</th><td>${h.observaciones_generales || '—'}</td></tr>
        </table>`
      : '<p style="color:var(--text-soft);font-size:13px;">No tienes historial clínico registrado</p>';
  } catch {
    document.getElementById('contenido-historial').innerHTML =
      '<p style="color:#c03030;font-size:13px;">Error al cargar historial</p>';
  }
}

// ── NUEVA CITA ────────────────────────────────
let listaDoctores = [];

// Carga doctores activos al iniciar
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

  // Limpiar selección y ocultar horario si se borra el texto
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

  // Mostrar horario disponible del doctor
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

  if (!idDoctor) {
    alert('Debes seleccionar un doctor.');
    return;
  }
  if (!fecha || !hora) {
    alert('Debes seleccionar fecha y hora.');
    return;
  }
  if (!motivo.trim()) {
    alert('Debes escribir el motivo de la cita.');
    return;
  }

  // Obtener el idPaciente del paciente vinculado al usuario actual
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

    const payload = {
      fecha,
      hora,
      idPaciente: miPaciente.idPaciente,
      idDoctor,
      estado: 'PENDIENTE',
      motivo,
    };

    const res  = await fetch('/api/citas', { method: 'POST', headers: H, body: JSON.stringify(payload) });
    const data = await res.json();

    if (res.status === 409) {
      alert('⚠️ ' + data.error);
      return;
    }

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

// Cierra sugerencias al hacer clic fuera
document.addEventListener('click', (e) => {
  const input = document.getElementById('cita-doctor-nombre');
  const sug   = document.getElementById('sugerencias-doctor');
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
cargarDoctores();
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
            <td>${c.fecha  || '—'}</td>
            <td>${c.hora   || '—'}</td>
            <td>#${c.idDoctor}</td>
            <td>${c.motivo || '—'}</td>
            <td><span class="badge badge--${c.estado === 'CONFIRMADA' ? 'activo' : 'pendiente'}">${c.estado}</span></td>
          </tr>`).join('')
      : '<tr><td colspan="5" style="text-align:center;color:var(--text-soft);padding:20px;">No tienes citas registradas</td></tr>';
  } catch {
    document.getElementById('tbody-citas').innerHTML =
      '<tr><td colspan="5" style="text-align:center;color:#c03030;padding:20px;">Error al cargar citas</td></tr>';
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

// ── CERRAR SESIÓN ─────────────────────────────
function cerrarSesion() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  window.location.href = '/';
}
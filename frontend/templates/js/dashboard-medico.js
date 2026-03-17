// ══════════════════════════════════════════════
//  DASHBOARD MÉDICO — dashboard-medico.js
// ══════════════════════════════════════════════

const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
if (!usuario || usuario.rol !== 30002) {
  alert('Acceso denegado.');
  window.location.href = '/';
}

if (usuario) {
  const nombre = usuario.nombre || 'Doctor';
  document.getElementById('nombre-medico').textContent  = nombre;
  document.getElementById('usuario-nombre').textContent = nombre;
  document.getElementById('avatar-inicial').textContent = nombre[0].toUpperCase();
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

  if (seccion === 'citas')       cargarCitas();
  if (seccion === 'consulta')    cargarConsultasRecientes();
  if (seccion === 'receta')      cargarRecetasRecientes();
  if (seccion === 'diagnostico') cargarDiagnosticosRecientes();
  if (seccion === 'expediente')  iniciarBuscador();
}

// ── STATS ─────────────────────────────────────
async function cargarStats() {
  try {
    const [cRes, pRes, conRes, rRes] = await Promise.all([
      fetch('/api/citas',     { headers: H }),
      fetch('/api/pacientes', { headers: H }),
      fetch('/api/consultas', { headers: H }),
      fetch('/api/recetas',   { headers: H }),
    ]);
    const citas     = await cRes.json();
    const pacientes = await pRes.json();
    const consultas = await conRes.json();
    const recetas   = await rRes.json();

    const hoy = new Date().toISOString().split('T')[0];
    const citasHoy = Array.isArray(citas)
      ? citas.filter(c => c.fecha && String(c.fecha).startsWith(hoy)) : [];

    document.getElementById('s-citas').textContent     = citasHoy.length;
    document.getElementById('s-pacientes').textContent = Array.isArray(pacientes) ? pacientes.length : '—';
    document.getElementById('s-consultas').textContent = Array.isArray(consultas) ? consultas.length : '—';
    document.getElementById('s-recetas').textContent   = Array.isArray(recetas)   ? recetas.length   : '—';

    document.getElementById('citas-preview').innerHTML = citasHoy.length
      ? citasHoy.slice(0,4).map(c => `
          <tr>
            <td>${c.hora || '—'}</td>
            <td>#${c.idPaciente}</td>
            <td>${c.motivo || '—'}</td>
            <td><span class="badge badge--${c.estado === 'CONFIRMADA' ? 'activo' : 'pendiente'}">${c.estado}</span></td>
          </tr>`).join('')
      : '<tr><td colspan="4" style="text-align:center;color:var(--text-soft);padding:16px;">Sin citas para hoy</td></tr>';

    document.getElementById('consultas-preview').innerHTML = Array.isArray(consultas) && consultas.length
      ? consultas.slice(0,3).map(c => `
          <tr>
            <td>${c.fecha_consulta || '—'}</td>
            <td>#${c.idHistorial}</td>
            <td>${c.observaciones || '—'}</td>
            <td><button class="btn-tabla">Ver detalle</button></td>
          </tr>`).join('')
      : '<tr><td colspan="4" style="text-align:center;color:var(--text-soft);padding:16px;">Sin consultas registradas</td></tr>';

  } catch { /* sin datos */ }
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
            <td>#${c.idPaciente}</td>
            <td>${c.motivo || '—'}</td>
            <td><span class="badge badge--${c.estado === 'CONFIRMADA' ? 'activo' : 'pendiente'}">${c.estado}</span></td>
          </tr>`).join('')
      : '<tr><td colspan="5" style="text-align:center;color:var(--text-soft);padding:20px;">Sin citas</td></tr>';
  } catch {
    document.getElementById('tbody-citas').innerHTML =
      '<tr><td colspan="5" style="text-align:center;color:#c03030;padding:20px;">Error al cargar</td></tr>';
  }
}

// ── CONSULTAS ─────────────────────────────────
async function cargarConsultasRecientes() {
  try {
    const res  = await fetch('/api/consultas', { headers: H });
    const data = await res.json();
    document.getElementById('consultas-recientes').innerHTML = Array.isArray(data) && data.length
      ? data.slice(0,5).map(c => `
          <div style="padding:10px 0;border-bottom:1px solid rgba(42,107,94,0.07);">
            <strong style="display:block;font-size:13px;color:var(--deep);">Consulta #${c.idConsulta}</strong>
            <span style="font-size:11.5px;color:var(--text-soft);">${c.fecha_consulta || '—'} · ${c.observaciones || '—'}</span>
          </div>`).join('')
      : '<p style="color:var(--text-soft);font-size:13px;">Sin consultas registradas</p>';
  } catch { /* sin datos */ }
}

async function guardarConsulta() {
  const payload = {
    fecha_consulta:   new Date().toISOString().slice(0,19).replace('T',' '),
    peso:             parseFloat(document.getElementById('con-peso').value)    || null,
    altura:           parseFloat(document.getElementById('con-altura').value)  || null,
    presion_arterial: document.getElementById('con-presion').value             || null,
    temperatura:      parseFloat(document.getElementById('con-temp').value)    || null,
    observaciones:    document.getElementById('con-obs').value,
    idHistorial:      parseInt(document.getElementById('con-historial').value),
    idCita:           parseInt(document.getElementById('con-cita').value),
  };
  const res  = await fetch('/api/consultas', { method:'POST', headers: H, body: JSON.stringify(payload) });
  const data = await res.json();
  if (data.id) {
    alert('✅ Consulta registrada correctamente');
    ['con-peso','con-altura','con-presion','con-temp','con-obs','con-historial','con-cita']
      .forEach(id => document.getElementById(id).value = '');
    cargarConsultasRecientes();
  } else {
    alert('Error: ' + (data.error?.sqlMessage || 'No se pudo registrar'));
  }
}

// ── RECETAS ───────────────────────────────────
async function cargarRecetasRecientes() {
  try {
    const res  = await fetch('/api/recetas', { headers: H });
    const data = await res.json();
    document.getElementById('recetas-recientes').innerHTML = Array.isArray(data) && data.length
      ? data.slice(0,5).map(r => `
          <div style="padding:10px 0;border-bottom:1px solid rgba(42,107,94,0.07);">
            <strong style="display:block;font-size:13px;color:var(--deep);">${r.medicamento}</strong>
            <span style="font-size:11.5px;color:var(--text-soft);">${r.dosis} · ${r.frecuencia} · ${r.duracion || '—'}</span>
          </div>`).join('')
      : '<p style="color:var(--text-soft);font-size:13px;">Sin recetas registradas</p>';
  } catch { /* sin datos */ }
}

async function guardarReceta() {
  const payload = {
    medicamento:   document.getElementById('rec-medicamento').value,
    dosis:         document.getElementById('rec-dosis').value,
    frecuencia:    document.getElementById('rec-frecuencia').value,
    duracion:      document.getElementById('rec-duracion').value,
    indicaciones:  document.getElementById('rec-indicaciones').value,
    idDiagnostico: parseInt(document.getElementById('rec-diagnostico').value),
    idFactura:     parseInt(document.getElementById('rec-factura').value),
  };
  const res  = await fetch('/api/recetas', { method:'POST', headers: H, body: JSON.stringify(payload) });
  const data = await res.json();
  if (data.id) {
    alert('✅ Receta emitida correctamente');
    ['rec-medicamento','rec-dosis','rec-frecuencia','rec-duracion','rec-indicaciones','rec-diagnostico','rec-factura']
      .forEach(id => document.getElementById(id).value = '');
    cargarRecetasRecientes();
  } else {
    alert('Error: ' + (data.error?.sqlMessage || 'No se pudo emitir'));
  }
}

// ── DIAGNÓSTICOS ──────────────────────────────
async function cargarDiagnosticosRecientes() {
  try {
    const res  = await fetch('/api/diagnosticos', { headers: H });
    const data = await res.json();
    document.getElementById('diagnosticos-recientes').innerHTML = Array.isArray(data) && data.length
      ? data.slice(0,5).map(d => `
          <div style="padding:10px 0;border-bottom:1px solid rgba(42,107,94,0.07);">
            <strong style="display:block;font-size:13px;color:var(--deep);">Diagnóstico #${d.idDiagnostico}</strong>
            <span style="font-size:11.5px;color:var(--text-soft);">${d.fecha_diagnostico || '—'} · ${d.descripcion || '—'}</span>
          </div>`).join('')
      : '<p style="color:var(--text-soft);font-size:13px;">Sin diagnósticos registrados</p>';
  } catch { /* sin datos */ }
}

async function guardarDiagnostico() {
  const payload = {
    descripcion:        document.getElementById('diag-descripcion').value,
    fecha_diagnostico:  document.getElementById('diag-fecha').value.replace('T',' '),
    idConsulta:         parseInt(document.getElementById('diag-consulta').value),
  };
  const res  = await fetch('/api/diagnosticos', { method:'POST', headers: H, body: JSON.stringify(payload) });
  const data = await res.json();
  if (data.id) {
    alert('✅ Diagnóstico registrado correctamente');
    ['diag-descripcion','diag-fecha','diag-consulta'].forEach(id => document.getElementById(id).value = '');
    cargarDiagnosticosRecientes();
  } else {
    alert('Error: ' + (data.error?.sqlMessage || 'No se pudo registrar'));
  }
}

// ── EXPEDIENTE ────────────────────────────────
let todosPacientes = [];

async function iniciarBuscador() {
  if (todosPacientes.length) return;
  try {
    const res = await fetch('/api/pacientes', { headers: H });
    todosPacientes = await res.json();
  } catch { /* sin datos */ }
}

function buscarExpediente() {
  const q    = document.getElementById('q-expediente').value.toLowerCase().trim();
  const cont = document.getElementById('resultados-expediente');
  if (!q) {
    cont.innerHTML = '<p style="text-align:center;color:var(--text-soft);padding:24px;font-size:13px;">Escribe para buscar un expediente...</p>';
    return;
  }
  const res = Array.isArray(todosPacientes)
    ? todosPacientes.filter(p =>
        (p.numero_expediente || '').toLowerCase().includes(q) ||
        String(p.idPaciente).includes(q))
    : [];
  cont.innerHTML = res.length
    ? res.map(p => `
        <div style="display:flex;align-items:center;gap:14px;padding:12px;border-radius:12px;border-bottom:1px solid rgba(42,107,94,0.06);">
          <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,var(--teal),var(--teal-light));color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;">
            ${(p.numero_expediente || 'P')[0]}
          </div>
          <div>
            <strong style="display:block;font-size:13.5px;color:var(--deep);">Exp: ${p.numero_expediente}</strong>
            <span style="font-size:11.5px;color:var(--text-soft);">ID ${p.idPaciente} · ${p.estado_paciente} · Sangre: ${p.tipo_sangre || 'N/A'}</span>
          </div>
        </div>`).join('')
    : '<p style="text-align:center;color:var(--text-soft);padding:24px;font-size:13px;">No se encontraron resultados</p>';
}

// ── CERRAR SESIÓN ─────────────────────────────
function cerrarSesion() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  window.location.href = '/';
}

// ── INIT ──────────────────────────────────────
cargarStats();
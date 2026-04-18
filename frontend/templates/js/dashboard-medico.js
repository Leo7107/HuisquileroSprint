// ══════════════════════════════════════════════
//  DASHBOARD MÉDICO – dashboard-medico.js
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
    document.getElementById('s-pacientes').textContent = Array.isArray(pacientes) ? pacientes.length : '–';
    document.getElementById('s-consultas').textContent = Array.isArray(consultas) ? consultas.length : '–';
    document.getElementById('s-recetas').textContent   = Array.isArray(recetas)   ? recetas.length   : '–';

    document.getElementById('citas-preview').innerHTML = citasHoy.length
      ? citasHoy.slice(0,4).map(c => `
          <tr>
            <td>${c.hora || '–'}</td>
            <td>#${c.idPaciente}</td>
            <td>${c.motivo || '–'}</td>
            <td><span class="badge badge--${c.estado === 'CONFIRMADA' ? 'activo' : 'pendiente'}">${c.estado}</span></td>
          </tr>`).join('')
      : '<tr><td colspan="4" style="text-align:center;color:var(--text-soft);padding:16px;">Sin citas para hoy</td></tr>';

    document.getElementById('consultas-preview').innerHTML = Array.isArray(consultas) && consultas.length
      ? consultas.slice(0,3).map(c => `
          <tr>
            <td>${c.fecha_consulta || '–'}</td>
            <td>#${c.idHistorial}</td>
            <td>${c.observaciones || '–'}</td>
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
            <td>#${c.idCita}</td>
            <td>${c.fecha ? c.fecha.split('T')[0] : '–'}</td>
            <td>${c.hora ? c.hora.substring(0,5) : '–'}</td>
            <td>${c.NombrePaciente ? `${c.NombrePaciente} ${c.ApellidosPaciente}` : `#${c.idPaciente}`}</td>
            <td>${c.motivo || '–'}</td>
            <td><span class="badge badge--${c.estado === 'CONFIRMADA' || c.estado === 'COMPLETADA' ? 'activo' : 'pendiente'}">${c.estado}</span></td>
            <td>
              ${c.estado === 'CONFIRMADA'
                ? `<button class="btn-tabla" onclick="completarCita(${c.idCita})">✅ Completar</button>`
                : '–'}
            </td>
          </tr>`).join('')
      : '<tr><td colspan="7" style="text-align:center;color:var(--text-soft);padding:20px;">Sin citas</td></tr>';
  } catch {
    document.getElementById('tbody-citas').innerHTML =
      '<tr><td colspan="7" style="text-align:center;color:#c03030;padding:20px;">Error al cargar</td></tr>';
  }
}

async function completarCita(id) {
  if (!confirm('¿Marcar esta cita como completada?')) return;
  try {
    const res  = await fetch(`/api/citas/${id}/completar`, { method: 'PATCH', headers: H });
    const data = await res.json();
    if (data.message) {
      alert('✅ Cita marcada como completada');
      cargarCitas();
      cargarStats();
    } else {
      alert('Error: ' + (data.error || 'No se pudo completar'));
    }
  } catch { alert('Error de conexión'); }
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
            <span style="font-size:11.5px;color:var(--text-soft);">${c.fecha_consulta || '–'} · ${c.observaciones || '–'}</span>
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
            <span style="font-size:11.5px;color:var(--text-soft);">${r.dosis} · ${r.frecuencia} · ${r.duracion || '–'}</span>
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
            <span style="font-size:11.5px;color:var(--text-soft);">${d.fecha_diagnostico || '–'} · ${d.descripcion || '–'}</span>
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
        String(p.idPaciente).includes(q) ||
        (p.Nombres || '').toLowerCase().includes(q) ||
        (p.Apellidos || '').toLowerCase().includes(q))
    : [];
  cont.innerHTML = res.length
    ? res.map(p => `
        <div onclick="abrirExpediente(${p.idPaciente})" style="display:flex;align-items:center;gap:14px;padding:12px;border-radius:12px;border-bottom:1px solid rgba(42,107,94,0.06);cursor:pointer;transition:background 0.2s;" onmouseover="this.style.background='rgba(42,107,94,0.05)'" onmouseout="this.style.background='transparent'">
          <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,var(--teal),var(--teal-light));color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;">
            ${(p.Nombres || 'P')[0]}
          </div>
          <div>
            <strong style="display:block;font-size:13.5px;color:var(--deep);">Exp: ${p.numero_expediente} — ${p.Nombres || ''} ${p.Apellidos || ''}</strong>
            <span style="font-size:11.5px;color:var(--text-soft);">ID ${p.idPaciente} · ${p.estado_paciente} · Sangre: ${p.tipo_sangre || 'N/A'}</span>
          </div>
          <span style="margin-left:auto;font-size:12px;color:var(--teal);">Ver →</span>
        </div>`).join('')
    : '<p style="text-align:center;color:var(--text-soft);padding:24px;font-size:13px;">No se encontraron resultados</p>';
}

async function abrirExpediente(idPaciente) {
  const cont = document.getElementById('resultados-expediente');
  cont.innerHTML = '<p style="text-align:center;color:var(--text-soft);padding:24px;">Cargando expediente...</p>';

  try {
    const [pRes, hRes, cRes, recRes] = await Promise.all([
      fetch(`/api/pacientes/${idPaciente}`, { headers: H }),
      fetch(`/api/historial?idPaciente=${idPaciente}`, { headers: H }),
      fetch(`/api/citas?idPaciente=${idPaciente}`, { headers: H }),
      fetch('/api/recetas', { headers: H }),
    ]);

    const paciente  = await pRes.json();
    const historial = await hRes.json();
    const citas     = await cRes.json();
    const recetas   = await recRes.json();

    const p = Array.isArray(paciente) ? paciente[0] : paciente;
    const h = Array.isArray(historial) ? historial[0] : historial;
    const citasPaciente = Array.isArray(citas) ? citas.filter(c => c.idPaciente === idPaciente) : [];
    const recetasPaciente = Array.isArray(recetas) ? recetas.filter(r => r.idPaciente === idPaciente) : [];

    cont.innerHTML = `
      <!-- BOTÓN VOLVER -->
      <button onclick="volverBuscador()" style="margin-bottom:16px;padding:8px 16px;border:1.5px solid var(--border);border-radius:10px;background:transparent;color:var(--text-soft);cursor:pointer;font-size:13px;">← Volver</button>

      <!-- PERFIL DEL PACIENTE -->
      <div style="background:var(--cream);border:1.5px solid var(--border);border-radius:16px;padding:24px;margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h3 style="font-size:15px;font-weight:700;color:var(--deep);">👤 Datos del Paciente</h3>
          <button onclick="editarPaciente(${p.idPaciente})" style="padding:7px 14px;border:none;border-radius:9px;background:linear-gradient(135deg,var(--teal),var(--teal-light));color:#fff;font-size:12px;font-weight:600;cursor:pointer;">✏️ Editar</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;" id="datos-paciente-${p.idPaciente}">
          <div><span style="color:var(--text-soft);">Nombre:</span> <strong>${p.Nombres || '–'} ${p.Apellidos || ''}</strong></div>
          <div><span style="color:var(--text-soft);">Expediente:</span> <strong>${p.numero_expediente || '–'}</strong></div>
          <div><span style="color:var(--text-soft);">Email:</span> <strong>${p.Email || '–'}</strong></div>
          <div><span style="color:var(--text-soft);">Tipo de sangre:</span> <strong>${p.tipo_sangre || 'N/A'}</strong></div>
          <div><span style="color:var(--text-soft);">Estado:</span> <strong>${p.estado_paciente || '–'}</strong></div>
          <div><span style="color:var(--text-soft);">Fecha registro:</span> <strong>${p.fecha_registro ? p.fecha_registro.split('T')[0] : '–'}</strong></div>
          <div><span style="color:var(--text-soft);">Contacto emergencia:</span> <strong>${p.contacto_emergencia || '–'}</strong></div>
          <div><span style="color:var(--text-soft);">Teléfono emergencia:</span> <strong>${p.telefono_emergencia || '–'}</strong></div>
        </div>
      </div>

      <!-- HISTORIAL CLÍNICO -->
      <div style="background:var(--cream);border:1.5px solid var(--border);border-radius:16px;padding:24px;margin-bottom:16px;">
        <h3 style="font-size:15px;font-weight:700;color:var(--deep);margin-bottom:14px;">🏥 Historial Clínico</h3>
        ${h ? `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px;">
            <div><span style="color:var(--text-soft);">Antecedentes familiares:</span><br/><strong>${h.antecedentes_familiares || 'Ninguno'}</strong></div>
            <div><span style="color:var(--text-soft);">Antecedentes personales:</span><br/><strong>${h.antecedentes_personales || 'Ninguno'}</strong></div>
            <div><span style="color:var(--text-soft);">Alergias:</span><br/><strong>${h.alergias || 'Ninguna'}</strong></div>
            <div><span style="color:var(--text-soft);">Padecimientos crónicos:</span><br/><strong>${h.padecimientos_cronicos || 'Ninguno'}</strong></div>
            <div><span style="color:var(--text-soft);">Cirugías previas:</span><br/><strong>${h.cirugias_previas || 'Ninguna'}</strong></div>
            <div><span style="color:var(--text-soft);">Observaciones:</span><br/><strong>${h.observaciones_generales || 'Ninguna'}</strong></div>
          </div>` : '<p style="color:var(--text-soft);font-size:13px;">Sin historial registrado</p>'}
      </div>

      <!-- CITAS -->
      <div style="background:var(--cream);border:1.5px solid var(--border);border-radius:16px;padding:24px;margin-bottom:16px;">
        <h3 style="font-size:15px;font-weight:700;color:var(--deep);margin-bottom:14px;">📅 Registro de Citas</h3>
        ${citasPaciente.length ? `
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead><tr style="color:var(--text-soft);font-size:11.5px;">
              <th style="text-align:left;padding:6px 0;">Fecha</th>
              <th style="text-align:left;padding:6px 0;">Hora</th>
              <th style="text-align:left;padding:6px 0;">Motivo</th>
              <th style="text-align:left;padding:6px 0;">Estado</th>
            </tr></thead>
            <tbody>
              ${citasPaciente.map(c => `
                <tr style="border-top:1px solid rgba(42,107,94,0.07);">
                  <td style="padding:8px 0;">${c.fecha ? c.fecha.split('T')[0] : '–'}</td>
                  <td style="padding:8px 0;">${c.hora ? c.hora.substring(0,5) : '–'}</td>
                  <td style="padding:8px 0;">${c.motivo || '–'}</td>
                  <td style="padding:8px 0;"><span class="badge badge--${c.estado === 'CONFIRMADA' || c.estado === 'COMPLETADA' ? 'activo' : 'pendiente'}">${c.estado}</span></td>
                </tr>`).join('')}
            </tbody>
          </table>` : '<p style="color:var(--text-soft);font-size:13px;">Sin citas registradas</p>'}
      </div>

      <!-- RECETAS -->
      <div style="background:var(--cream);border:1.5px solid var(--border);border-radius:16px;padding:24px;margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <h3 style="font-size:15px;font-weight:700;color:var(--deep);">💊 Recetas</h3>
          <button onclick="mostrarFormReceta(${p.idPaciente})" style="padding:7px 14px;border:none;border-radius:9px;background:linear-gradient(135deg,var(--teal),var(--teal-light));color:#fff;font-size:12px;font-weight:600;cursor:pointer;">+ Agregar Receta</button>
        </div>
        <div id="recetas-expediente-${p.idPaciente}">
          ${recetasPaciente.length ? recetasPaciente.map(r => `
            <div style="padding:10px 0;border-bottom:1px solid rgba(42,107,94,0.07);font-size:13px;">
              <strong>${r.medicamento}</strong> — ${r.dosis} · ${r.frecuencia} · ${r.duracion || '–'}
              <br/><span style="color:var(--text-soft);font-size:11.5px;">${r.indicaciones || ''}</span>
            </div>`).join('') : '<p style="color:var(--text-soft);font-size:13px;">Sin recetas registradas</p>'}
        </div>
        <div id="form-receta-${p.idPaciente}" style="display:none;margin-top:16px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <input type="number" id="nr-diagnostico-${p.idPaciente}" placeholder="ID Diagnóstico" style="padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;background:white;"/>
            <input type="number" id="nr-factura-${p.idPaciente}" placeholder="ID Factura" style="padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;background:white;"/>
            <input type="text" id="nr-medicamento-${p.idPaciente}" placeholder="Medicamento" style="padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;background:white;"/>
            <input type="text" id="nr-dosis-${p.idPaciente}" placeholder="Dosis (ej: 500mg)" style="padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;background:white;"/>
            <input type="text" id="nr-frecuencia-${p.idPaciente}" placeholder="Frecuencia (ej: cada 8h)" style="padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;background:white;"/>
            <input type="text" id="nr-duracion-${p.idPaciente}" placeholder="Duración (ej: 7 días)" style="padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;background:white;"/>
            <textarea id="nr-indicaciones-${p.idPaciente}" placeholder="Indicaciones..." style="padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;background:white;grid-column:span 2;"></textarea>
          </div>
          <button onclick="guardarRecetaExpediente(${p.idPaciente})" style="margin-top:10px;padding:10px 20px;border:none;border-radius:10px;background:linear-gradient(135deg,var(--teal),var(--teal-light));color:#fff;font-weight:600;font-size:13px;cursor:pointer;">Guardar Receta</button>
          <button onclick="document.getElementById('form-receta-${p.idPaciente}').style.display='none'" style="margin-top:10px;margin-left:8px;padding:10px 20px;border:1.5px solid var(--border);border-radius:10px;background:transparent;color:var(--text-soft);font-size:13px;cursor:pointer;">Cancelar</button>
        </div>
      </div>

      <!-- FORMULARIO EDITAR PACIENTE (oculto) -->
      <div id="form-editar-${p.idPaciente}" style="display:none;background:var(--cream);border:1.5px solid var(--border);border-radius:16px;padding:24px;margin-bottom:16px;">
        <h3 style="font-size:15px;font-weight:700;color:var(--deep);margin-bottom:14px;">✏️ Editar Paciente</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label style="font-size:11.5px;color:var(--text-soft);font-weight:600;">Tipo de Sangre</label>
            <select id="ep-sangre-${p.idPaciente}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;background:white;margin-top:4px;">
              <option value="">Seleccionar</option>
              ${['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(s => `<option value="${s}" ${p.tipo_sangre === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:11.5px;color:var(--text-soft);font-weight:600;">Estado</label>
            <select id="ep-estado-${p.idPaciente}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;background:white;margin-top:4px;">
              <option value="ACTIVO" ${p.estado_paciente === 'ACTIVO' ? 'selected' : ''}>ACTIVO</option>
              <option value="INACTIVO" ${p.estado_paciente === 'INACTIVO' ? 'selected' : ''}>INACTIVO</option>
              <option value="FALLECIDO" ${p.estado_paciente === 'FALLECIDO' ? 'selected' : ''}>FALLECIDO</option>
            </select>
          </div>
          <div>
            <label style="font-size:11.5px;color:var(--text-soft);font-weight:600;">Contacto Emergencia</label>
            <input type="text" id="ep-contacto-${p.idPaciente}" value="${p.contacto_emergencia || ''}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;background:white;margin-top:4px;box-sizing:border-box;"/>
          </div>
          <div>
            <label style="font-size:11.5px;color:var(--text-soft);font-weight:600;">Teléfono Emergencia</label>
            <input type="text" id="ep-telefono-${p.idPaciente}" value="${p.telefono_emergencia || ''}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;background:white;margin-top:4px;box-sizing:border-box;"/>
          </div>
          <div style="grid-column:span 2;">
            <label style="font-size:11.5px;color:var(--text-soft);font-weight:600;">Observaciones Generales</label>
            <textarea id="ep-observaciones-${p.idPaciente}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;background:white;margin-top:4px;box-sizing:border-box;">${p.observaciones_generales || ''}</textarea>
          </div>
        </div>
        <div style="margin-top:12px;">
          <button onclick="guardarEdicionPaciente(${p.idPaciente})" style="padding:10px 20px;border:none;border-radius:10px;background:linear-gradient(135deg,var(--teal),var(--teal-light));color:#fff;font-weight:600;font-size:13px;cursor:pointer;">Guardar Cambios</button>
          <button onclick="document.getElementById('form-editar-${p.idPaciente}').style.display='none'" style="margin-left:8px;padding:10px 20px;border:1.5px solid var(--border);border-radius:10px;background:transparent;color:var(--text-soft);font-size:13px;cursor:pointer;">Cancelar</button>
        </div>
      </div>
    `;
  } catch(e) {
    cont.innerHTML = '<p style="text-align:center;color:#c03030;padding:24px;">Error al cargar el expediente</p>';
  }
}

function volverBuscador() {
  document.getElementById('resultados-expediente').innerHTML =
    '<p style="text-align:center;color:var(--text-soft);padding:24px;font-size:13px;">Escribe para buscar un expediente...</p>';
  document.getElementById('q-expediente').value = '';
}

function editarPaciente(idPaciente) {
  const form = document.getElementById(`form-editar-${idPaciente}`);
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

function mostrarFormReceta(idPaciente) {
  const form = document.getElementById(`form-receta-${idPaciente}`);
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

async function guardarEdicionPaciente(idPaciente) {
  const payload = {
    tipo_sangre:           document.getElementById(`ep-sangre-${idPaciente}`).value,
    estado_paciente:       document.getElementById(`ep-estado-${idPaciente}`).value,
    contacto_emergencia:   document.getElementById(`ep-contacto-${idPaciente}`).value,
    telefono_emergencia:   document.getElementById(`ep-telefono-${idPaciente}`).value,
    observaciones_generales: document.getElementById(`ep-observaciones-${idPaciente}`).value,
  };
  const res  = await fetch(`/api/pacientes/${idPaciente}`, { method:'PUT', headers: H, body: JSON.stringify(payload) });
  const data = await res.json();
  if (data.message) {
    alert('✅ Paciente actualizado correctamente');
    document.getElementById(`form-editar-${idPaciente}`).style.display = 'none';
    abrirExpediente(idPaciente);
  } else {
    alert('Error: ' + (data.error?.sqlMessage || 'No se pudo actualizar'));
  }
}

async function guardarRecetaExpediente(idPaciente) {
  const payload = {
    medicamento:   document.getElementById(`nr-medicamento-${idPaciente}`).value,
    dosis:         document.getElementById(`nr-dosis-${idPaciente}`).value,
    frecuencia:    document.getElementById(`nr-frecuencia-${idPaciente}`).value,
    duracion:      document.getElementById(`nr-duracion-${idPaciente}`).value,
    indicaciones:  document.getElementById(`nr-indicaciones-${idPaciente}`).value,
    idDiagnostico: parseInt(document.getElementById(`nr-diagnostico-${idPaciente}`).value),
    idFactura:     parseInt(document.getElementById(`nr-factura-${idPaciente}`).value),
  };
  const res  = await fetch('/api/recetas', { method:'POST', headers: H, body: JSON.stringify(payload) });
  const data = await res.json();
  if (data.id) {
    alert('✅ Receta agregada correctamente');
    abrirExpediente(idPaciente);
  } else {
    alert('Error: ' + (data.error?.sqlMessage || 'No se pudo agregar'));
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

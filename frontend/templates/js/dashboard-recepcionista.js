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
  document.getElementById('nombre-recep').textContent   = nombre;
  document.getElementById('usuario-nombre').textContent  = nombre;
  document.getElementById('avatar-inicial').textContent  = nombre[0].toUpperCase();
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

    // Preview tabla
    document.getElementById('citas-preview').innerHTML = citasHoy.length
      ? citasHoy.slice(0,4).map(c => `
        <tr>
          <td>${c.hora || '—'}</td>
          <td>#${c.idPaciente}</td>
          <td>#${c.idDoctor}</td>
          <td><span class="badge badge--${c.estado === 'CONFIRMADA' ? 'activo' : 'pendiente'}">${c.estado}</span></td>
        </tr>`).join('')
      : '<tr><td colspan="4" style="text-align:center;color:var(--text-soft);padding:16px;">Sin citas para hoy</td></tr>';
  } catch { /* sin datos */ }
}

// ── CITAS ─────────────────────────────────────
let todasCitas     = [];
let tabCitaActual  = 'todas';

async function cargarCitas() {
  try {
    const res   = await fetch('/api/citas', { headers: H });
    todasCitas  = await res.json();
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
  document.getElementById('tbody-citas').innerHTML = lista.map(c => `
    <tr>
      <td>#${c.idCita}</td>
      <td>${c.fecha || '—'}</td>
      <td>${c.hora  || '—'}</td>
      <td>#${c.idPaciente}</td>
      <td>#${c.idDoctor}</td>
      <td><span class="badge badge--${['CONFIRMADA','FINALIZADA'].includes(c.estado) ? 'activo' : 'pendiente'}">${c.estado}</span></td>
      <td>
        <div class="action-icons">
          <button class="icon-btn icon-btn--edit"   title="Editar"   onclick='abrirModalEditarCita(${JSON.stringify(c)})'>✏️</button>
          <button class="icon-btn icon-btn--cancel" title="Cancelar" onclick="cancelarCita(${c.idCita})">✕</button>
        </div>
      </td>
    </tr>
  `).join('');
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
  document.getElementById('modal-cita-titulo').textContent = 'Nueva Cita';
  document.getElementById('cita-id').value = '';
  ['fecha','hora','motivo'].forEach(f => document.getElementById('cita-' + f).value = '');
  document.getElementById('cita-paciente').value = '';
  document.getElementById('cita-doctor').value   = '';
  document.getElementById('cita-estado').value   = 'PENDIENTE';
  document.getElementById('modal-cita').classList.add('active');
}

function abrirModalEditarCita(c) {
  document.getElementById('modal-cita-titulo').textContent = 'Editar Cita';
  document.getElementById('cita-id').value      = c.idCita;
  document.getElementById('cita-fecha').value   = c.fecha      || '';
  document.getElementById('cita-hora').value    = c.hora       || '';
  document.getElementById('cita-paciente').value= c.idPaciente || '';
  document.getElementById('cita-doctor').value  = c.idDoctor   || '';
  document.getElementById('cita-estado').value  = c.estado     || 'PENDIENTE';
  document.getElementById('cita-motivo').value  = c.motivo     || '';
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
    const res  = await fetch('/api/pacientes', { headers: H });
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

// ── SALA DE ESPERA ────────────────────────────
function mover(btn, colDestino) {
  const card = btn.closest('.pac-card');
  const col  = document.getElementById(colDestino);

  if (colDestino === 'col-fin') {
    card.style.opacity = '0.65';
    card.querySelector('.pac-card-actions').innerHTML =
      '<span class="badge-fin">✓ Completado</span>';
    document.getElementById('s-atendidos').textContent =
      parseInt(document.getElementById('s-atendidos').textContent || 0) + 1;
  } else {
    card.querySelector('.pac-card-actions').innerHTML = `
      <button class="btn-mover btn-mover--fin" onclick="mover(this,'col-fin')">✓ Finalizar</button>`;
  }

  col.appendChild(card);
  document.getElementById('s-espera').textContent =
    document.getElementById('col-llego').children.length +
    document.getElementById('col-consulta').children.length;
}

// ── BUSCADOR GLOBAL ───────────────────────────
let todosPacientes = [];

async function iniciarBuscador() {
  if (todosPacientes.length) return; // ya cargado
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
    : '<p style="text-align:center;color:var(--text-soft);padding:24px;font-size:13px;">No se encontraron resultados para "<strong>' + q + '</strong>".</p>';
}

// ── CERRAR SESIÓN ─────────────────────────────
function cerrarSesion() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  window.location.href = '/';
}

// ── INIT ──────────────────────────────────────
cargarStats();
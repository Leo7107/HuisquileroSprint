/**
 * dashboard-medico.js
 *
 * Fixes aplicados:
 * 1. Diagnósticos: eliminados campos inexistentes (codigo_cie, tipo, notas) → fix error "No se pudo registrar"
 * 2. Consultas: autocompletado por nombre de paciente → citas activas → autocompleta idCita e idHistorial
 * 3. Mi Horario: filtrado por idDoctor del médico logueado (GET /api/citas/doctor/:idDoctor)
 * 4. Todas las tablas: nombres en vez de IDs
 * 5. Diagnósticos recientes: muestra nombre del paciente
 * 6. HU12: reportes médico integrados en nav()
 */

const usuario = JSON.parse(sessionStorage.getItem('usuario') || 'null');
if (!usuario || usuario.rol !== 30002) {
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

const token = sessionStorage.getItem('token');
const H = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

// ── UTILIDADES ────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function toast(msg, tipo = 'success') {
  let el = document.getElementById('_toast_notif');
  if (!el) {
    el = document.createElement('div');
    el.id = '_toast_notif';
    Object.assign(el.style, {
      position:'fixed', bottom:'24px', right:'24px', padding:'12px 20px',
      borderRadius:'12px', fontSize:'13px', fontWeight:'600', zIndex:'9999',
      display:'none', boxShadow:'0 4px 20px rgba(0,0,0,0.15)', maxWidth:'380px',
    });
    document.body.appendChild(el);
  }
  const bg    = tipo === 'error' ? '#ffebee' : tipo === 'warning' ? '#fff8e1' : '#e8f5e9';
  const color = tipo === 'error' ? '#c62828' : tipo === 'warning' ? '#e65100' : '#2e7d32';
  el.style.background = bg;
  el.style.color      = color;
  el.textContent      = msg;
  el.style.display    = 'block';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.style.display = 'none'; }, 3500);
}

// ── MAPS PARA ONCLICK SEGURO ──────────────────────────────────────────────────
const _mapPacCon   = new Map(); // pacientes en sección consulta
const _mapCitaCon  = new Map(); // citas en sección consulta
const _mapPacDiag  = new Map(); // pacientes en sección diagnóstico
const _mapConDiag  = new Map(); // consultas en sección diagnóstico
const _mapPacRec   = new Map(); // pacientes en sección receta
const _mapMedRec   = new Map(); // medicamentos en sección receta

// ── ESTADO GLOBAL ─────────────────────────────────────────────────────────────
let todasLasCitas   = [];
let miDoctor        = null;
let fechaDia        = new Date();
let fechaSemana     = new Date();
let diaSeleccionado = null;
let todosPacientes  = [];

// ── NAVEGACIÓN ────────────────────────────────────────────────────────────────
function nav(seccion, linkEl) {
  document.querySelectorAll('[id^="sec-"]').forEach(s => s.style.display = 'none');
  const sec = document.getElementById('sec-' + seccion);
  if (sec) sec.style.display = 'block';
  document.querySelectorAll('.nav-item').forEach(a => a.classList.remove('active'));
  if (linkEl) linkEl.classList.add('active');

  if (seccion === 'citas')      cargarCitas();
  if (seccion === 'expediente') iniciarBuscador();
  if (seccion === 'horario')    iniciarHorario();
  if (seccion === 'reportes')   iniciarReportesMedico();
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function estadoDot(estado) {
  const mapa = {
    'CONFIRMADA':  'confirmada',
    'PENDIENTE':   'pendiente',
    'EN ATENCION': 'en-atencion',
    'FINALIZADA':  'finalizada',
    'CANCELADA':   'cancelada',
    'COMPLETADA':  'finalizada',
  };
  return `<span class="estado-dot estado-dot--${mapa[estado] || 'pendiente'}">${esc(estado)}</span>`;
}

function nombrePaciente(c) {
  return c.NombrePaciente
    ? `${esc(c.NombrePaciente)} ${esc(c.ApellidosPaciente || '')}`.trim()
    : `Paciente #${c.idPaciente}`;
}

// ── OBTENER DOCTOR LOGUEADO ───────────────────────────────────────────────────
async function obtenerMiDoctor() {
  if (miDoctor) return miDoctor;
  try {
    const res = await fetch(`/api/doctores/by-usuario/${usuario.id}`, { headers: H });
    miDoctor  = await res.json();
    return miDoctor;
  } catch { return null; }
}

// ── CARGAR PACIENTES ──────────────────────────────────────────────────────────
async function cargarPacientes() {
  if (todosPacientes.length) return todosPacientes;
  try {
    const res   = await fetch('/api/pacientes', { headers: H });
    const data  = await res.json();
    todosPacientes = Array.isArray(data) ? data : [];
    return todosPacientes;
  } catch { return []; }
}

// ── STATS ─────────────────────────────────────────────────────────────────────
async function cargarStats() {
  try {
    const doc = await obtenerMiDoctor();
    const idDoctor = doc?.idDoctor;
    const citasUrl = idDoctor ? `/api/citas/doctor/${idDoctor}` : '/api/citas';

    const [cRes, pRes, conRes, rRes] = await Promise.all([
      fetch(citasUrl,        { headers: H }),
      fetch('/api/pacientes',{ headers: H }),
      fetch('/api/consultas',{ headers: H }),
      fetch('/api/recetas',  { headers: H }),
    ]);

    const citas     = await cRes.json();
    const pacientes = await pRes.json();
    const consultas = await conRes.json();
    const recetas   = await rRes.json();

    todasLasCitas  = Array.isArray(citas) ? citas : [];
    todosPacientes = Array.isArray(pacientes) ? pacientes : [];

    const hoy      = new Date().toISOString().split('T')[0];
    const citasHoy = todasLasCitas.filter(c => c.fecha && String(c.fecha).startsWith(hoy));

    document.getElementById('s-citas').textContent     = citasHoy.length;
    document.getElementById('s-pacientes').textContent = todosPacientes.length;
    document.getElementById('s-consultas').textContent = Array.isArray(consultas) ? consultas.length : '–';
    document.getElementById('s-recetas').textContent   = Array.isArray(recetas)   ? recetas.length   : '–';

    document.getElementById('citas-preview').innerHTML = citasHoy.length
      ? citasHoy.slice(0, 4).map(c => `
          <tr>
            <td><strong>${c.hora ? c.hora.substring(0,5) : '–'}</strong></td>
            <td>${nombrePaciente(c)}</td>
            <td>${esc(c.motivo || '–')}</td>
            <td>${estadoDot(c.estado)}</td>
            <td>${['CONFIRMADA','PENDIENTE'].includes(c.estado)
              ? `<button class="btn-tabla" onclick="abrirHistorialPaciente(${c.idCita}, ${c.idPaciente})">📋 Ver</button>`
              : '–'}</td>
          </tr>`).join('')
      : '<tr><td colspan="5" style="text-align:center;color:var(--text-soft);padding:16px;">Sin citas para hoy</td></tr>';

    const recientes = [...new Map(
      todasLasCitas
        .filter(c => c.NombrePaciente)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .map(c => [c.idPaciente, c])
    ).values()].slice(0, 4);

    document.getElementById('historial-pacientes-preview').innerHTML = recientes.length
      ? recientes.map(c => `
          <div class="resultado-item" onclick="irExpediente(${c.idPaciente})" style="cursor:pointer;">
            <div style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,var(--teal),var(--teal-light));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0;">
              ${esc((c.NombrePaciente || 'P')[0])}
            </div>
            <div style="flex:1;">
              <strong style="display:block;font-size:13px;color:var(--deep);">${nombrePaciente(c)}</strong>
              <span style="font-size:11.5px;color:var(--text-soft);">Última cita: ${c.fecha ? c.fecha.split('T')[0] : '–'} · ${esc(c.estado)}</span>
            </div>
            <span style="font-size:11.5px;color:var(--teal);font-weight:600;">Ver →</span>
          </div>`).join('')
      : '<p style="color:var(--text-soft);font-size:13px;padding:12px 0;">Sin pacientes recientes</p>';

    document.getElementById('consultas-preview').innerHTML = Array.isArray(consultas) && consultas.length
      ? consultas.slice(0,3).map(c => `
          <tr>
            <td>${c.fecha_consulta ? c.fecha_consulta.split('T')[0] : '–'}</td>
            <td>${c.NombrePaciente ? `${esc(c.NombrePaciente)} ${esc(c.ApellidosPaciente || '')}` : `Cita #${c.idCita}`}</td>
            <td>${esc(c.observaciones || '–')}</td>
            <td><button class="btn-tabla" onclick="verDetalleConsulta(${c.idConsulta})">Ver detalle</button></td>
          </tr>`).join('')
      : '<tr><td colspan="4" style="text-align:center;color:var(--text-soft);padding:16px;">Sin consultas registradas</td></tr>';

  } catch (e) { console.error(e); }
}

// ── MODAL HISTORIAL PACIENTE ──────────────────────────────────────────────────
async function abrirHistorialPaciente(idCita, idPaciente) {
  document.getElementById('modal-historial-paciente').classList.add('active');
  document.getElementById('modal-historial-contenido').innerHTML =
    '<p style="text-align:center;color:var(--text-soft);padding:30px;">Cargando historial...</p>';

  document.getElementById('btn-atender-modal').onclick = () => {
    cerrarModalHistorial();
    accesoCitaRapido(idCita, idPaciente);
  };

  try {
    const [pRes, conRes, diagRes, recRes] = await Promise.all([
      fetch(`/api/pacientes/${idPaciente}`, { headers: H }),
      fetch('/api/consultas', { headers: H }),
      fetch('/api/diagnosticos', { headers: H }),
      fetch('/api/recetas', { headers: H }),
    ]);

    const paciente     = await pRes.json();
    const consultas    = await conRes.json();
    const diagnosticos = await diagRes.json();
    const recetas      = await recRes.json();
    const p = Array.isArray(paciente) ? paciente[0] : paciente;

    document.getElementById('modal-historial-contenido').innerHTML = `
      <div style="display:flex;align-items:center;gap:14px;padding:14px;background:var(--cream);border-radius:14px;margin-bottom:18px;border:1px solid var(--border);">
        <div style="width:46px;height:46px;border-radius:12px;background:linear-gradient(135deg,var(--teal),var(--teal-light));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;flex-shrink:0;">
          ${esc((p?.Nombres || 'P')[0])}
        </div>
        <div>
          <strong style="display:block;font-size:14px;color:var(--deep);">${esc(p?.Nombres || '–')} ${esc(p?.Apellidos || '')}</strong>
          <span style="font-size:12px;color:var(--text-soft);">Exp: ${esc(p?.numero_expediente || '–')} · Sangre: ${esc(p?.tipo_sangre || 'N/A')}</span>
        </div>
        ${p?.alergias ? `<div style="margin-left:auto;background:rgba(200,50,50,0.07);border:1px solid rgba(200,50,50,0.15);border-radius:10px;padding:8px 12px;font-size:11.5px;color:#c03030;">⚠️ Alergia: ${esc(p.alergias)}</div>` : ''}
      </div>
      <h4 style="font-size:12.5px;font-weight:700;color:var(--deep);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.06em;">🩺 Últimas Consultas</h4>
      <div class="historial-mini" style="margin-bottom:18px;">
        ${Array.isArray(consultas) && consultas.length
          ? consultas.slice(0,3).map(c => `
              <div class="historial-mini__item">
                <h4>${c.fecha_consulta ? c.fecha_consulta.split('T')[0] : '–'} · ${c.NombrePaciente ? esc(c.NombrePaciente) + ' ' + esc(c.ApellidosPaciente||'') : 'Cita #' + c.idCita}</h4>
                <p>Peso: ${c.peso || '–'} kg · Presión: ${esc(c.presion_arterial || '–')} · Temp: ${c.temperatura || '–'}°C</p>
                <p style="margin-top:4px;">${esc(c.observaciones || 'Sin observaciones')}</p>
              </div>`).join('')
          : '<p style="color:var(--text-soft);font-size:12.5px;">Sin consultas registradas</p>'}
      </div>
      <h4 style="font-size:12.5px;font-weight:700;color:var(--deep);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.06em;">🔬 Diagnósticos Recientes</h4>
      <div class="historial-mini" style="margin-bottom:18px;">
        ${Array.isArray(diagnosticos) && diagnosticos.length
          ? diagnosticos.slice(0,3).map(d => `
              <div class="historial-mini__item">
                <h4>Diagnóstico #${d.idDiagnostico} · ${d.fecha_diagnostico ? d.fecha_diagnostico.split('T')[0] : '–'}</h4>
                <p>${esc(d.descripcion || 'Sin descripción')}</p>
              </div>`).join('')
          : '<p style="color:var(--text-soft);font-size:12.5px;">Sin diagnósticos registrados</p>'}
      </div>
      <h4 style="font-size:12.5px;font-weight:700;color:var(--deep);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.06em;">💊 Recetas Recientes</h4>
      <div class="historial-mini">
        ${Array.isArray(recetas) && recetas.length
          ? recetas.slice(0,3).map(r => `
              <div class="historial-mini__item">
                <h4>${esc(r.medicamento)} — ${esc(r.dosis || '–')}</h4>
                <p>${esc(r.frecuencia || '–')} · ${esc(r.duracion || '–')}</p>
              </div>`).join('')
          : '<p style="color:var(--text-soft);font-size:12.5px;">Sin recetas registradas</p>'}
      </div>`;
  } catch {
    document.getElementById('modal-historial-contenido').innerHTML =
      '<p style="color:#c03030;text-align:center;padding:20px;">Error al cargar historial</p>';
  }
}

function cerrarModalHistorial() {
  document.getElementById('modal-historial-paciente').classList.remove('active');
}

// ── ACCESO RÁPIDO DESDE MODAL HISTORIAL ──────────────────────────────────────
function accesoCitaRapido(idCita, idPaciente) {
  cerrarModalHistorial();
  nav('citas', document.querySelector('.nav-item[onclick*="citas"]'));
  setTimeout(() => abrirAtencion(idCita, idPaciente), 200);
}

// ── PANEL DE ATENCIÓN CLÍNICA ─────────────────────────────────────────────────
let _citaSeleccionada = null;

async function abrirAtencion(idCita, idPaciente) {
  const cita    = todasLasCitas.find(c => c.idCita === idCita);
  const nombre  = cita ? nombrePaciente(cita) : `Paciente #${idPaciente}`;
  const fechaStr = cita?.fecha ? cita.fecha.split('T')[0] : '';
  const horaStr  = cita?.hora  ? cita.hora.substring(0,5)  : '';

  // Mostrar panel y cabecera
  document.getElementById('panel-atencion').style.display = 'block';
  document.getElementById('atencion-paciente-info').innerHTML =
    `👤 <strong>${esc(nombre)}</strong> · Cita #${idCita} · ${fechaStr} ${horaStr ? '— ' + horaStr : ''}`;

  // Resetear accordions
  _setAccordion('consulta',    true,  '', '');
  _setAccordion('diagnostico', false, '· opcional', '');
  _setAccordion('receta',      false, '· opcional', '');

  // Limpiar formularios
  ['con-peso','con-altura','con-presion','con-temp','con-obs'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('diag-descripcion').value = '';
  document.getElementById('diag-fecha').value       = '';

  // Obtener historial del paciente
  let idHistorial = null;
  try {
    const hRes = await fetch(`/api/historial/by-paciente?idPaciente=${idPaciente}`, { headers: H });
    const hData = await hRes.json();
    const h = Array.isArray(hData) ? hData[0] : hData;
    idHistorial = h?.idHistorial || null;
  } catch {}

  // Configurar estado para guardarConsulta()
  _citaSeleccionada = { idCita, idPaciente, nombre, fecha: fechaStr, hora: horaStr, idHistorial };
  document.getElementById('con-cita').value     = idCita;
  document.getElementById('con-historial').value = idHistorial || '';

  // Configurar estado para diagnóstico
  _consultaSeleccionada = null;
  document.getElementById('diag-consulta').value = '';
  document.getElementById('diagnostico-consulta-info').style.display = 'none';

  // Verificar si ya existe una consulta para esta cita
  try {
    const conRes = await fetch(`/api/consultas/by-cita/${idCita}`, { headers: H });
    const con    = await conRes.json();
    if (con?.idConsulta) {
      _consultaSeleccionada = {
        idConsulta:     con.idConsulta,
        nombrePaciente: nombre,
        fecha:          con.fecha_consulta ? con.fecha_consulta.split('T')[0] : '',
      };
      document.getElementById('diag-consulta').value = con.idConsulta;
      document.getElementById('diag-fecha').value    = new Date().toISOString().slice(0,16);
      _marcarAccordionDone('consulta', '· Ya registrada');
      renderConsultaSeleccionada();
    }
  } catch {}

  // Configurar estado para receta
  _recPacienteId = idPaciente;
  _recLineas     = [];
  _recMedActual  = null;
  renderLineasReceta();
  if (!listaMedsActivos.length) cargarMedicamentosActivos();
  cargarDiagnosticosPacienteParaReceta(idPaciente);

  // Cargar preconsulta
  cargarPreconsulta(idCita);

  // Scroll suave al panel
  setTimeout(() => document.getElementById('panel-atencion').scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
}

function cerrarPanelAtencion() {
  document.getElementById('panel-atencion').style.display = 'none';
  document.getElementById('bloque-preconsulta').style.display = 'none';
  _citaSeleccionada    = null;
  _consultaSeleccionada = null;
  _recPacienteId        = null;
  _recLineas            = [];
}

// Helpers de accordions
function toggleAccordion(seccion) {
  const body  = document.getElementById(`acc-body-${seccion}`);
  const arrow = document.getElementById(`acc-arrow-${seccion}`);
  const abierto = body.style.display !== 'none';
  body.style.display  = abierto ? 'none' : 'block';
  arrow.textContent   = abierto ? '▶' : '▼';
}

function _setAccordion(seccion, abierto, statusText, statusColor) {
  const body  = document.getElementById(`acc-body-${seccion}`);
  const arrow = document.getElementById(`acc-arrow-${seccion}`);
  const num   = document.getElementById(`acc-num-${seccion}`);
  const status = document.getElementById(`acc-status-${seccion}`);
  body.style.display  = abierto ? 'block' : 'none';
  arrow.textContent   = abierto ? '▼' : '▶';
  num.classList.remove('done');
  if (status) { status.textContent = statusText; status.style.color = statusColor || 'var(--text-soft)'; }
}

function _marcarAccordionDone(seccion, statusText) {
  const num    = document.getElementById(`acc-num-${seccion}`);
  const status = document.getElementById(`acc-status-${seccion}`);
  num.textContent = '✓';
  num.classList.add('done');
  if (status) { status.textContent = statusText || '· Registrado'; status.style.color = 'var(--teal)'; }
}

async function cargarDiagnosticosPacienteParaReceta(idPaciente) {
  const sel = document.getElementById('rec-diagnostico-sel');
  if (!sel) return;
  sel.innerHTML = '<option value="">Cargando...</option>';
  try {
    const pac      = todosPacientes.find(p => p.idPaciente === Number(idPaciente));
    const idUsuario = pac?.idUsuario;
    const [citasRes, diagRes, consRes] = await Promise.all([
      idUsuario ? fetch(`/api/citas/paciente/${idUsuario}`, { headers: H }) : Promise.resolve({ json: () => [] }),
      fetch('/api/diagnosticos', { headers: H }),
      fetch('/api/consultas',   { headers: H }),
    ]);
    const citas    = await citasRes.json().catch(() => []);
    const diags    = await diagRes.json();
    const consultas = await consRes.json();
    const idsCitas  = Array.isArray(citas)    ? citas.map(c => c.idCita)    : [];
    const idsCons   = Array.isArray(consultas) ? consultas.filter(c => idsCitas.includes(c.idCita)).map(c => c.idConsulta) : [];
    const diagsPac  = Array.isArray(diags)    ? diags.filter(d => idsCons.includes(d.idConsulta)) : [];
    sel.innerHTML = '<option value="">— Sin diagnóstico asociado —</option>' +
      diagsPac.map(d => `<option value="${d.idDiagnostico}">#${d.idDiagnostico} · ${d.fecha_diagnostico ? d.fecha_diagnostico.split('T')[0] : '–'} · ${esc((d.descripcion||'').substring(0,50))}</option>`).join('');
  } catch {
    sel.innerHTML = '<option value="">— Sin diagnóstico asociado —</option>';
  }
}

// ── PRECONSULTA ───────────────────────────────────────────────────────────────
async function cargarPreconsulta(idCita) {
  if (!idCita) return;
  const bloque = document.getElementById('bloque-preconsulta');
  const datos  = document.getElementById('preconsulta-datos');
  try {
    const res = await fetch(`/api/consultas/by-cita/${idCita}`, { headers: H });
    const pre = await res.json();

    if (pre && pre.idConsulta) {
      let fcVal = '–', satVal = '–', motivoVal = '–', obsVal = '';
      if (pre.observaciones) {
        const partes = pre.observaciones.split(' | ');
        partes.forEach(p => {
          if (p.startsWith('FC:'))   fcVal   = p.replace('FC:', '').trim();
          if (p.startsWith('SpO2:')) satVal  = p.replace('SpO2:', '').trim();
          if (!p.startsWith('FC:') && !p.startsWith('SpO2:')) {
            if (!motivoVal || motivoVal === '–') motivoVal = p;
            else obsVal += (obsVal ? ' | ' : '') + p;
          }
        });
      }
      datos.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px;">
          <div class="preconsulta-item"><div class="preconsulta-item__label">Peso</div><div class="preconsulta-item__value">${pre.peso ? pre.peso + ' kg' : '–'}</div></div>
          <div class="preconsulta-item"><div class="preconsulta-item__label">Talla</div><div class="preconsulta-item__value">${pre.altura ? pre.altura + ' cm' : '–'}</div></div>
          <div class="preconsulta-item"><div class="preconsulta-item__label">Temperatura</div><div class="preconsulta-item__value">${pre.temperatura ? pre.temperatura + '°C' : '–'}</div></div>
          <div class="preconsulta-item"><div class="preconsulta-item__label">Presión Arterial</div><div class="preconsulta-item__value">${esc(pre.presion_arterial || '–')}</div></div>
          <div class="preconsulta-item"><div class="preconsulta-item__label">Frec. Cardíaca</div><div class="preconsulta-item__value">${esc(fcVal)}</div></div>
          <div class="preconsulta-item"><div class="preconsulta-item__label">Saturación O₂</div><div class="preconsulta-item__value">${esc(satVal)}</div></div>
        </div>
        ${motivoVal && motivoVal !== '–' ? `<div class="preconsulta-item" style="margin-bottom:8px;"><div class="preconsulta-item__label">Motivo de Consulta</div><div class="preconsulta-item__value" style="white-space:pre-wrap;">${esc(motivoVal)}</div></div>` : ''}
        ${obsVal ? `<div class="preconsulta-item"><div class="preconsulta-item__label">Observaciones de Enfermería</div><div class="preconsulta-item__value" style="white-space:pre-wrap;">${esc(obsVal)}</div></div>` : ''}
        <div style="margin-top:10px;padding:6px 10px;background:rgba(42,107,94,0.06);border-radius:8px;font-size:11px;color:var(--teal);font-weight:600;">
          🔒 Solo lectura — registrado por recepcionista${pre.fecha_consulta ? ' · ' + pre.fecha_consulta.split('T')[0] : ''}
        </div>`;
      if (pre.peso)             document.getElementById('con-peso').value    = pre.peso;
      if (pre.presion_arterial) document.getElementById('con-presion').value = pre.presion_arterial;
      if (pre.temperatura)      document.getElementById('con-temp').value    = pre.temperatura;
      if (pre.altura)           document.getElementById('con-altura').value  = pre.altura;
      bloque.style.display = 'block';
    } else {
      datos.innerHTML = `<div style="font-size:12.5px;color:var(--text-soft);padding:8px 0;">Sin preconsulta registrada para esta cita.</div>`;
      bloque.style.display = 'block';
    }
  } catch { bloque.style.display = 'none'; }
}

// ── GUARDAR CONSULTA ──────────────────────────────────────────────────────────
async function guardarConsulta() {
  if (!_citaSeleccionada)             { toast('⚠️ No hay cita seleccionada.', 'warning'); return; }
  if (!_citaSeleccionada.idHistorial) { toast('⚠️ No se encontró historial clínico para este paciente.', 'warning'); return; }

  const payload = {
    fecha_consulta:   new Date().toISOString().slice(0,19).replace('T',' '),
    peso:             parseFloat(document.getElementById('con-peso').value)    || null,
    altura:           parseFloat(document.getElementById('con-altura').value)  || null,
    presion_arterial: document.getElementById('con-presion').value             || null,
    temperatura:      parseFloat(document.getElementById('con-temp').value)    || null,
    observaciones:    document.getElementById('con-obs').value,
    idHistorial:      _citaSeleccionada.idHistorial,
    idCita:           _citaSeleccionada.idCita,
  };

  const res  = await fetch('/api/consultas', { method:'POST', headers: H, body: JSON.stringify(payload) });
  const data = await res.json();
  if (data.id) {
    toast('✅ Consulta registrada');
    _marcarAccordionDone('consulta', '· Registrada');

    // Auto-vincular al accordion de diagnóstico
    _consultaSeleccionada = {
      idConsulta:     data.id,
      nombrePaciente: _citaSeleccionada.nombre,
      fecha:          new Date().toISOString().split('T')[0],
    };
    document.getElementById('diag-consulta').value = data.id;
    document.getElementById('diag-fecha').value    = new Date().toISOString().slice(0,16);
    renderConsultaSeleccionada();

    // Abrir siguiente paso
    _setAccordion('diagnostico', true, '· opcional', '');
    cargarStats();
  } else {
    toast('Error: ' + (data.error?.sqlMessage || data.error || 'No se pudo registrar'), 'error');
  }
}

// ── CITAS ─────────────────────────────────────────────────────────────────────
async function cargarCitas() {
  try {
    const doc = await obtenerMiDoctor();
    const url = doc?.idDoctor ? `/api/citas/doctor/${doc.idDoctor}` : '/api/citas';
    const res  = await fetch(url, { headers: H });
    const data = await res.json();
    todasLasCitas = Array.isArray(data) ? data : [];

    document.getElementById('tbody-citas').innerHTML = todasLasCitas.length
      ? todasLasCitas.map(c => {
          const atendible = ['CONFIRMADA', 'PENDIENTE', 'EN ATENCION'].includes(c.estado);
          return `
          <tr>
            <td>#${c.idCita}</td>
            <td>${c.fecha ? c.fecha.split('T')[0] : '–'}</td>
            <td>${c.hora ? c.hora.substring(0,5) : '–'}</td>
            <td>${nombrePaciente(c)}</td>
            <td>${esc(c.motivo || '–')}</td>
            <td>${estadoDot(c.estado)}</td>
            <td>
              <div class="action-icons">
                <button class="btn-tabla" onclick="abrirHistorialPaciente(${c.idCita}, ${c.idPaciente})">📋 Ver</button>
                ${atendible ? `<button class="btn-atender" onclick="abrirAtencion(${c.idCita}, ${c.idPaciente})">🩺 Atender</button>` : ''}
              </div>
            </td>
          </tr>`;
        }).join('')
      : '<tr><td colspan="7" style="text-align:center;color:var(--text-soft);padding:20px;">Sin citas</td></tr>';
  } catch {
    document.getElementById('tbody-citas').innerHTML =
      '<tr><td colspan="7" style="text-align:center;color:#c03030;padding:20px;">Error al cargar</td></tr>';
  }
}

// ── MI HORARIO ────────────────────────────────────────────────────────────────
async function iniciarHorario() {
  try {
    const doc = await obtenerMiDoctor();
    if (doc) {
      const hi = doc.hora_inicio ? doc.hora_inicio.substring(0,5) : '–';
      const hf = doc.hora_fin    ? doc.hora_fin.substring(0,5)    : '–';
      document.getElementById('horario-info').innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:20px;">
          <div style="background:var(--cream);border:1.5px solid var(--border);border-radius:14px;padding:18px;text-align:center;">
            <p style="font-size:10.5px;color:var(--text-soft);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Horario</p>
            <p style="font-family:'Playfair Display',serif;font-size:1.4rem;font-weight:700;color:var(--teal);">${hi} – ${hf}</p>
          </div>
          <div style="background:var(--cream);border:1.5px solid var(--border);border-radius:14px;padding:18px;text-align:center;">
            <p style="font-size:10.5px;color:var(--text-soft);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Consultorio</p>
            <p style="font-family:'Playfair Display',serif;font-size:1.2rem;font-weight:700;color:var(--deep);">${esc(doc.Consultorio || '–')}</p>
          </div>
          <div style="background:var(--cream);border:1.5px solid var(--border);border-radius:14px;padding:18px;text-align:center;">
            <p style="font-size:10.5px;color:var(--text-soft);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Especialidad</p>
            <p style="font-family:'Playfair Display',serif;font-size:1rem;font-weight:700;color:var(--deep);">${esc(doc.Especialidad || '–')}</p>
          </div>
          <div style="background:var(--cream);border:1.5px solid var(--border);border-radius:14px;padding:18px;text-align:center;">
            <p style="font-size:10.5px;color:var(--text-soft);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">N° Junta Médica</p>
            <p style="font-family:monospace;font-size:1rem;font-weight:700;color:var(--deep);">${esc(doc.numero_junta_medica || '–')}</p>
          </div>
        </div>`;
      if (!todasLasCitas.length && doc.idDoctor) {
        const res = await fetch(`/api/citas/doctor/${doc.idDoctor}`, { headers: H });
        todasLasCitas = await res.json().catch(() => []);
      }
    } else {
      document.getElementById('horario-info').innerHTML =
        '<p style="color:var(--text-soft);font-size:13px;padding:12px;">No se encontró tu perfil de médico.</p>';
    }
  } catch {}
  fechaDia = new Date();
  renderVistaDia();
  renderVistaSemanal();
}

function cambiarVistaHorario(vista) {
  document.getElementById('vista-diaria').style.display  = vista === 'diaria'  ? 'block' : 'none';
  document.getElementById('vista-semanal').style.display = vista === 'semanal' ? 'block' : 'none';
  document.getElementById('tab-diaria').classList.toggle('active',  vista === 'diaria');
  document.getElementById('tab-semanal').classList.toggle('active', vista === 'semanal');
}

function navegarDia(delta) {
  fechaDia.setDate(fechaDia.getDate() + delta);
  renderVistaDia();
}

function renderVistaDia() {
  const fechaStr = fechaDia.toISOString().split('T')[0];
  const hoy      = new Date().toISOString().split('T')[0];
  const label    = fechaStr === hoy
    ? 'Hoy — ' + fechaDia.toLocaleDateString('es-SV', { weekday:'long', day:'numeric', month:'long' })
    : fechaDia.toLocaleDateString('es-SV', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  document.getElementById('titulo-dia-actual').textContent = label;
  const citasDia = todasLasCitas.filter(c => c.fecha && String(c.fecha).startsWith(fechaStr));
  document.getElementById('tbody-citas-dia').innerHTML = citasDia.length
    ? citasDia.sort((a,b) => (a.hora||'').localeCompare(b.hora||'')).map(c => `
        <tr>
          <td><strong>${c.hora ? c.hora.substring(0,5) : '–'}</strong></td>
          <td>${nombrePaciente(c)}</td>
          <td>${esc(c.motivo || '–')}</td>
          <td>${estadoDot(c.estado)}</td>
          <td>${['CONFIRMADA','PENDIENTE'].includes(c.estado)
            ? `<button class="btn-tabla" onclick="abrirHistorialPaciente(${c.idCita}, ${c.idPaciente})">📋 Ver</button>`
            : '–'}</td>
        </tr>`).join('')
    : '<tr><td colspan="5" style="text-align:center;color:var(--text-soft);padding:20px;">Sin citas para este día</td></tr>';
}

function navegarSemana(delta) {
  fechaSemana.setDate(fechaSemana.getDate() + delta * 7);
  renderVistaSemanal();
}

function renderVistaSemanal() {
  const hoy   = new Date();
  const lunes = new Date(fechaSemana);
  lunes.setDate(lunes.getDate() - (lunes.getDay() === 0 ? 6 : lunes.getDay() - 1));
  const dias    = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  const domingo = new Date(lunes);
  domingo.setDate(domingo.getDate() + 6);
  document.getElementById('titulo-semana').textContent =
    lunes.toLocaleDateString('es-SV', { day:'numeric', month:'short' }) + ' – ' +
    domingo.toLocaleDateString('es-SV', { day:'numeric', month:'short', year:'numeric' });
  document.getElementById('semana-tabs').innerHTML = dias.map((nombre, i) => {
    const dia      = new Date(lunes);
    dia.setDate(dia.getDate() + i);
    const fechaStr = dia.toISOString().split('T')[0];
    const esHoy    = fechaStr === hoy.toISOString().split('T')[0];
    const sel      = diaSeleccionado === fechaStr;
    const tieneCitas = todasLasCitas.some(c => c.fecha && String(c.fecha).startsWith(fechaStr));
    return `
      <div class="dia-tab ${esHoy ? 'hoy' : ''} ${sel ? 'active' : ''}" onclick="seleccionarDia('${fechaStr}')">
        <span class="dia-nombre">${nombre}</span>
        <span class="dia-num">${dia.getDate()}</span>
        ${tieneCitas ? '<span class="dia-badge"></span>' : '<span style="width:6px;height:6px;"></span>'}
      </div>`;
  }).join('');
  if (diaSeleccionado) renderCitasSemana(diaSeleccionado);
}

function seleccionarDia(fechaStr) {
  diaSeleccionado = fechaStr;
  renderVistaSemanal();
  renderCitasSemana(fechaStr);
}

function renderCitasSemana(fechaStr) {
  const citasDia = todasLasCitas.filter(c => c.fecha && String(c.fecha).startsWith(fechaStr));
  document.getElementById('tbody-citas-semana').innerHTML = citasDia.length
    ? citasDia.sort((a,b) => (a.hora||'').localeCompare(b.hora||'')).map(c => `
        <tr>
          <td><strong>${c.hora ? c.hora.substring(0,5) : '–'}</strong></td>
          <td>${nombrePaciente(c)}</td>
          <td>${esc(c.motivo || '–')}</td>
          <td>${estadoDot(c.estado)}</td>
          <td>${['CONFIRMADA','PENDIENTE'].includes(c.estado)
            ? `<button class="btn-tabla" onclick="abrirHistorialPaciente(${c.idCita}, ${c.idPaciente})">📋 Ver</button>`
            : '–'}</td>
        </tr>`).join('')
    : '<tr><td colspan="5" style="text-align:center;color:var(--text-soft);padding:16px;">Sin citas para este día</td></tr>';
}

// ── DIAGNÓSTICOS ──────────────────────────────────────────────────────────────
let _consultaSeleccionada = null;

function renderConsultaSeleccionada() {
  const info = document.getElementById('diagnostico-consulta-info');
  if (!info) return;
  if (_consultaSeleccionada) {
    info.style.display = 'block';
    info.innerHTML = `<span style="font-size:12px;color:var(--teal);font-weight:600;">✅ Vinculada a Consulta #${_consultaSeleccionada.idConsulta} · ${esc(_consultaSeleccionada.nombrePaciente)}</span>`;
    document.getElementById('diag-consulta').value = _consultaSeleccionada.idConsulta;
  } else {
    info.style.display = 'none';
    document.getElementById('diag-consulta').value = '';
  }
}

async function guardarDiagnostico() {
  if (!_consultaSeleccionada) { toast('⚠️ Primero registra la consulta del paciente.', 'warning'); return; }
  const descripcion = document.getElementById('diag-descripcion').value.trim();
  const fechaVal    = document.getElementById('diag-fecha').value;
  if (!descripcion) { toast('La descripción es obligatoria.', 'warning'); return; }
  if (!fechaVal)    { toast('La fecha del diagnóstico es obligatoria.', 'warning'); return; }
  const payload = {
    descripcion,
    fecha_diagnostico: fechaVal.replace('T', ' '),
    idConsulta:        _consultaSeleccionada.idConsulta,
  };
  const res  = await fetch('/api/diagnosticos', { method:'POST', headers: H, body: JSON.stringify(payload) });
  const data = await res.json();
  if (data.id) {
    toast('✅ Diagnóstico registrado');
    _marcarAccordionDone('diagnostico', '· Registrado');

    // Agregar el nuevo diagnóstico al selector de receta
    const sel = document.getElementById('rec-diagnostico-sel');
    const opt = document.createElement('option');
    opt.value    = data.id;
    opt.textContent = `#${data.id} · Hoy · ${esc(descripcion.substring(0,50))}`;
    opt.selected = true;
    sel.appendChild(opt);

    // Abrir siguiente paso
    _setAccordion('receta', true, '· opcional', '');
  } else {
    toast('Error: ' + (data.error?.sqlMessage || data.error || 'No se pudo registrar'), 'error');
  }
}

// ── RECETAS ───────────────────────────────────────────────────────────────────
let listaMedsActivos = [];
let _recPacienteId   = null;
let _recMedActual    = null;
let _recLineas       = [];

async function cargarMedicamentosActivos() {
  try {
    const res = await fetch('/api/medicamentos/activos', { headers: H });
    listaMedsActivos = await res.json();
  } catch {}
}

function limpiarFormReceta() {
  _recMedActual  = null;
  _recLineas     = [];
  document.getElementById('rec-medicamento-nombre').value = '';
  document.getElementById('rec-medicamento-id').value     = '';
  document.getElementById('rec-med-campos').style.display  = 'none';
  document.getElementById('rec-stock-info').style.display  = 'none';
  document.getElementById('sug-medicamento').style.display = 'none';
  limpiarCamposMed();
  renderLineasReceta();
}

function limpiarCamposMed() {
  ['rec-dosis','rec-frecuencia','rec-duracion','rec-indicaciones'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const cant = document.getElementById('rec-cantidad');
  if (cant) cant.value = '1';
}


function buscarMedicamentoReceta() {
  const input = document.getElementById('rec-medicamento-nombre');
  const sug   = document.getElementById('sug-medicamento');
  const q     = input.value.toLowerCase().trim();
  _recMedActual = null;
  document.getElementById('rec-medicamento-id').value = '';
  document.getElementById('rec-med-campos').style.display = 'none';
  document.getElementById('rec-stock-info').style.display = 'none';
  if (!q) { sug.style.display = 'none'; return; }
  const lista = Array.isArray(listaMedsActivos)
    ? listaMedsActivos.filter(m => m.nombre.toLowerCase().includes(q) && m.stock_actual > 0)
    : [];
  lista.forEach(m => _mapMedRec.set(m.idMedicamento, m));
  sug.innerHTML = lista.length
    ? lista.map(m => `
        <div class="autocomplete-item"
          onclick="seleccionarMedicamento(${m.idMedicamento})">
          <strong>${esc(m.nombre)}</strong>
          <span>Stock: ${m.stock_actual} ${esc(m.unidad_medida)} · $${parseFloat(m.precio_unitario || 0).toFixed(2)}</span>
        </div>`).join('')
    : '<div class="autocomplete-item" style="color:var(--text-soft);">Sin medicamentos disponibles</div>';
  sug.style.display = 'block';
}

function seleccionarMedicamento(id) {
  const m = _mapMedRec.get(Number(id));
  if (!m) return;
  document.getElementById('rec-medicamento-nombre').value = m.nombre;
  document.getElementById('rec-medicamento-id').value     = id;
  document.getElementById('sug-medicamento').style.display = 'none';
  const dosisMatch = (m.descripcion || '').match(/\d+\s*(?:mg|ml|mcg|g|UI|ug)(?:\/\d+\s*(?:mg|ml))?/i);
  if (dosisMatch) document.getElementById('rec-dosis').value = dosisMatch[0];
  _recMedActual = { id: m.idMedicamento, nombre: m.nombre, descripcion: m.descripcion, unidad: m.unidad_medida, stock: m.stock_actual, precio: parseFloat(m.precio_unitario) };
  document.getElementById('rec-med-campos').style.display = 'block';
  const infoEl = document.getElementById('rec-stock-info');
  infoEl.textContent = `Stock disponible: ${m.stock_actual} ${m.unidad_medida} · Precio unitario: $${parseFloat(m.precio_unitario).toFixed(2)}`;
  infoEl.style.display = 'block';
}

document.addEventListener('click', (e) => {
  const inp = document.getElementById('rec-medicamento-nombre');
  const sug = document.getElementById('sug-medicamento');
  if (inp && sug && !inp.contains(e.target) && !sug.contains(e.target))
    sug.style.display = 'none';
});

function agregarMedicamentoLista() {
  if (!_recMedActual) { toast('⚠️ Selecciona un medicamento del listado primero.', 'warning'); return; }
  const cantidad    = parseInt(document.getElementById('rec-cantidad').value) || 1;
  const dosis       = document.getElementById('rec-dosis').value.trim();
  const frecuencia  = document.getElementById('rec-frecuencia').value.trim();
  const duracion    = document.getElementById('rec-duracion').value.trim();
  const indicaciones= document.getElementById('rec-indicaciones').value.trim();
  if (!dosis)      { toast('⚠️ La dosis es obligatoria.', 'warning'); return; }
  if (!frecuencia) { toast('⚠️ La frecuencia es obligatoria.', 'warning'); return; }
  if (!duracion)   { toast('⚠️ La duración es obligatoria.', 'warning'); return; }
  if (cantidad < 1){ toast('⚠️ La cantidad debe ser al menos 1.', 'warning'); return; }
  if (cantidad > _recMedActual.stock) {
    toast(`⚠️ Stock insuficiente. Solo hay ${_recMedActual.stock} ${_recMedActual.unidad} disponibles.`, 'warning');
    return;
  }
  const yaEsta = _recLineas.find(l => l.med.id === _recMedActual.id);
  if (yaEsta) { toast('⚠️ Este medicamento ya fue agregado.', 'warning'); return; }
  const subtotal = _recMedActual.precio * cantidad;
  _recLineas.push({ med: { ..._recMedActual }, dosis, frecuencia, duracion, cantidad, indicaciones, subtotal });
  document.getElementById('rec-medicamento-nombre').value = '';
  document.getElementById('rec-medicamento-id').value = '';
  document.getElementById('rec-med-campos').style.display = 'none';
  document.getElementById('rec-stock-info').style.display = 'none';
  _recMedActual = null;
  limpiarCamposMed();
  renderLineasReceta();
}

function renderLineasReceta() {
  const tbody = document.getElementById('rec-lista-meds');
  const wrap  = document.getElementById('rec-lista-meds-wrap');
  const vacio = document.getElementById('rec-lista-vacia');
  if (!_recLineas.length) {
    wrap.style.display  = 'none';
    vacio.style.display = 'block';
    document.getElementById('rec-total').textContent = '0.00';
    return;
  }
  wrap.style.display  = 'block';
  vacio.style.display = 'none';
  tbody.innerHTML = _recLineas.map((l, i) => `
    <tr>
      <td>
        <strong style="display:block;">${esc(l.med.nombre)}</strong>
        ${l.indicaciones ? `<span style="font-size:11px;color:var(--text-soft);">${esc(l.indicaciones)}</span>` : ''}
      </td>
      <td>${esc(l.dosis)}</td>
      <td>${esc(l.frecuencia)}</td>
      <td>${esc(l.duracion)}</td>
      <td>${l.cantidad} ${esc(l.med.unidad)}</td>
      <td style="font-weight:600;color:var(--teal);">$${l.subtotal.toFixed(2)}</td>
      <td><button onclick="eliminarLineaReceta(${i})"
        style="width:28px;height:28px;border:none;border-radius:7px;background:rgba(200,50,50,0.1);color:#c03030;cursor:pointer;font-size:13px;">✕</button></td>
    </tr>`).join('');
  const total = _recLineas.reduce((s, l) => s + l.subtotal, 0);
  document.getElementById('rec-total').textContent = total.toFixed(2);
}

function eliminarLineaReceta(idx) {
  _recLineas.splice(idx, 1);
  renderLineasReceta();
}

async function guardarReceta() {
  if (!_recPacienteId) { toast('⚠️ Selecciona un paciente primero.', 'warning'); return; }
  if (!_recLineas.length) { toast('⚠️ Agrega al menos un medicamento.', 'warning'); return; }
  const idDiagnostico = parseInt(document.getElementById('rec-diagnostico-sel').value) || null;
  try {
    let errores = 0;
    for (const linea of _recLineas) {
      const payload = {
        medicamento:   linea.med.nombre,
        dosis:         linea.dosis,
        frecuencia:    linea.frecuencia,
        duracion:      linea.duracion || null,
        indicaciones:  linea.indicaciones || null,
        idDiagnostico: idDiagnostico,
        idFactura:     null,
        idMedicamento: linea.med.id,
        cantidad:      linea.cantidad,
      };
      const res  = await fetch('/api/recetas', { method:'POST', headers: H, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.id || data.message) {
        await fetch(`/api/medicamentos/${linea.med.id}/descontar`, {
          method: 'POST', headers: H,
          body: JSON.stringify({ cantidad: linea.cantidad, idReceta: data.id })
        }).catch(() => {});
      } else {
        errores++;
        console.error('Error en receta:', linea.med.nombre, data.error);
      }
    }
    const total = _recLineas.reduce((s, l) => s + l.subtotal, 0);
    if (errores === 0) {
      toast(`✅ Receta emitida. ${_recLineas.length} medicamento(s) · $${total.toFixed(2)}`);
      _marcarAccordionDone('receta', '· Emitida');
      limpiarFormReceta();
      _recPacienteId = _citaSeleccionada?.idPaciente || null;
      await cargarMedicamentosActivos();
    } else {
      toast(`⚠️ Se emitieron ${_recLineas.length - errores} de ${_recLineas.length} medicamentos.`, 'warning');
    }
  } catch (err) {
    toast('Error de conexión al emitir la receta.', 'error');
    console.error(err);
  }
}

// ── EXPEDIENTE ────────────────────────────────────────────────────────────────
async function iniciarBuscador() {
  await cargarPacientes();
}

function buscarExpediente() {
  const q    = document.getElementById('q-expediente').value.toLowerCase().trim();
  const cont = document.getElementById('resultados-expediente');
  if (!q) {
    cont.innerHTML = '<p style="text-align:center;color:var(--text-soft);padding:24px;font-size:13px;">Escribe para buscar un expediente...</p>';
    return;
  }
  const res = todosPacientes.filter(p =>
    (p.numero_expediente || '').toLowerCase().includes(q) ||
    String(p.idPaciente).includes(q) ||
    (p.Nombres || '').toLowerCase().includes(q) ||
    (p.Apellidos || '').toLowerCase().includes(q)
  );
  cont.innerHTML = res.length
    ? res.map(p => `
        <div onclick="abrirExpediente(${p.idPaciente})" style="display:flex;align-items:center;gap:14px;padding:12px;border-radius:12px;border-bottom:1px solid rgba(42,107,94,0.06);cursor:pointer;transition:background 0.2s;" onmouseover="this.style.background='rgba(42,107,94,0.05)'" onmouseout="this.style.background='transparent'">
          <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,var(--teal),var(--teal-light));color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;">
            ${esc((p.Nombres || 'P')[0])}
          </div>
          <div>
            <strong style="display:block;font-size:13.5px;color:var(--deep);">Exp: ${esc(p.numero_expediente)} — ${esc(p.Nombres || '')} ${esc(p.Apellidos || '')}</strong>
            <span style="font-size:11.5px;color:var(--text-soft);">ID ${p.idPaciente} · ${esc(p.estado_paciente || '–')} · Sangre: ${esc(p.tipo_sangre || 'N/A')}</span>
          </div>
          <span style="margin-left:auto;font-size:12px;color:var(--teal);">Ver →</span>
        </div>`).join('')
    : '<p style="text-align:center;color:var(--text-soft);padding:24px;font-size:13px;">No se encontraron resultados</p>';
}

function irExpediente(idPaciente) {
  nav('expediente', document.querySelector('[onclick*="expediente"]'));
  setTimeout(() => {
    iniciarBuscador().then(() => {
      document.getElementById('q-expediente').value = String(idPaciente);
      buscarExpediente();
    });
  }, 100);
}

async function abrirExpediente(idPaciente) {
  const cont = document.getElementById('resultados-expediente');
  cont.innerHTML = '<p style="text-align:center;color:var(--text-soft);padding:24px;">Cargando expediente...</p>';
  try {
    const [pRes, hRes] = await Promise.all([
      fetch(`/api/pacientes/${idPaciente}`, { headers: H }),
      fetch(`/api/historial/by-paciente?idPaciente=${idPaciente}`, { headers: H }),
    ]);
    const paciente  = await pRes.json();
    const historial = await hRes.json();
    const p = Array.isArray(paciente) ? paciente[0] : paciente;
    const h = Array.isArray(historial) ? historial[0] : historial;
    const citasPaciente = todasLasCitas.filter(c => c.idPaciente === idPaciente);

    cont.innerHTML = `
      <button onclick="volverBuscador()" style="margin-bottom:16px;padding:8px 16px;border:1.5px solid var(--border);border-radius:10px;background:transparent;color:var(--text-soft);cursor:pointer;font-size:13px;">← Volver</button>
      <div style="background:var(--cream);border:1.5px solid var(--border);border-radius:16px;padding:24px;margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h3 style="font-size:15px;font-weight:700;color:var(--deep);">👤 ${esc(p?.Nombres || '–')} ${esc(p?.Apellidos || '')}</h3>
          <button onclick="editarPaciente(${p.idPaciente})" style="padding:7px 14px;border:none;border-radius:9px;background:linear-gradient(135deg,var(--teal),var(--teal-light));color:#fff;font-size:12px;font-weight:600;cursor:pointer;">✏️ Editar</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;">
          <div><span style="color:var(--text-soft);">Expediente:</span> <strong>${esc(p?.numero_expediente || '–')}</strong></div>
          <div><span style="color:var(--text-soft);">Tipo de sangre:</span> <strong>${esc(p?.tipo_sangre || 'N/A')}</strong></div>
          <div><span style="color:var(--text-soft);">Email:</span> <strong>${esc(p?.Email || '–')}</strong></div>
          <div><span style="color:var(--text-soft);">Estado:</span> <strong>${esc(p?.estado_paciente || '–')}</strong></div>
        </div>
      </div>
      <div style="background:var(--cream);border:1.5px solid var(--border);border-radius:16px;padding:24px;margin-bottom:16px;">
        <h3 style="font-size:15px;font-weight:700;color:var(--deep);margin-bottom:14px;">🏥 Historial Clínico</h3>
        ${h ? `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px;">
            <div><span style="color:var(--text-soft);">Alergias:</span><br/><strong>${esc(h.alergias || 'Ninguna')}</strong></div>
            <div><span style="color:var(--text-soft);">Padecimientos crónicos:</span><br/><strong>${esc(h.padecimientos_cronicos || 'Ninguno')}</strong></div>
            <div><span style="color:var(--text-soft);">Antecedentes familiares:</span><br/><strong>${esc(h.antecedentes_familiares || 'Ninguno')}</strong></div>
            <div><span style="color:var(--text-soft);">Cirugías previas:</span><br/><strong>${esc(h.cirugias_previas || 'Ninguna')}</strong></div>
          </div>` : '<p style="color:var(--text-soft);font-size:13px;">Sin historial registrado</p>'}
      </div>
      <div style="background:var(--cream);border:1.5px solid var(--border);border-radius:16px;padding:24px;margin-bottom:16px;">
        <h3 style="font-size:15px;font-weight:700;color:var(--deep);margin-bottom:14px;">📅 Citas (${citasPaciente.length})</h3>
        ${citasPaciente.length ? `
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead><tr style="color:var(--text-soft);font-size:11.5px;">
              <th style="text-align:left;padding:6px 0;">Fecha</th>
              <th style="text-align:left;padding:6px 0;">Hora</th>
              <th style="text-align:left;padding:6px 0;">Motivo</th>
              <th style="text-align:left;padding:6px 0;">Estado</th>
            </tr></thead>
            <tbody>${citasPaciente.map(c => `
              <tr style="border-top:1px solid rgba(42,107,94,0.07);">
                <td style="padding:8px 0;">${c.fecha ? c.fecha.split('T')[0] : '–'}</td>
                <td style="padding:8px 0;">${c.hora ? c.hora.substring(0,5) : '–'}</td>
                <td style="padding:8px 0;">${esc(c.motivo || '–')}</td>
                <td style="padding:8px 0;">${estadoDot(c.estado)}</td>
              </tr>`).join('')}</tbody>
          </table>` : '<p style="color:var(--text-soft);font-size:13px;">Sin citas</p>'}
      </div>
      <div id="form-editar-${p.idPaciente}" style="display:none;background:var(--cream);border:1.5px solid var(--border);border-radius:16px;padding:24px;margin-top:16px;">
        <h3 style="font-size:15px;font-weight:700;color:var(--deep);margin-bottom:14px;">✏️ Editar Paciente</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label style="font-size:11.5px;color:var(--text-soft);font-weight:600;">Tipo de Sangre</label>
            <select id="ep-sangre-${p.idPaciente}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;background:white;margin-top:4px;">
              ${['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(s => `<option value="${s}" ${p.tipo_sangre===s?'selected':''}>${s}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:11.5px;color:var(--text-soft);font-weight:600;">Estado</label>
            <select id="ep-estado-${p.idPaciente}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;background:white;margin-top:4px;">
              <option value="ACTIVO" ${p.estado_paciente==='ACTIVO'?'selected':''}>ACTIVO</option>
              <option value="INACTIVO" ${p.estado_paciente==='INACTIVO'?'selected':''}>INACTIVO</option>
            </select>
          </div>
          <div>
            <label style="font-size:11.5px;color:var(--text-soft);font-weight:600;">Contacto Emergencia</label>
            <input type="text" id="ep-contacto-${p.idPaciente}" value="${esc(p.contacto_emergencia||'')}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;background:white;margin-top:4px;box-sizing:border-box;"/>
          </div>
          <div>
            <label style="font-size:11.5px;color:var(--text-soft);font-weight:600;">Teléfono Emergencia</label>
            <input type="text" id="ep-telefono-${p.idPaciente}" value="${esc(p.telefono_emergencia||'')}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;background:white;margin-top:4px;box-sizing:border-box;"/>
          </div>
        </div>
        <div style="margin-top:12px;">
          <button onclick="guardarEdicionPaciente(${p.idPaciente})" style="padding:10px 20px;border:none;border-radius:10px;background:linear-gradient(135deg,var(--teal),var(--teal-light));color:#fff;font-weight:600;font-size:13px;cursor:pointer;">Guardar</button>
          <button onclick="document.getElementById('form-editar-${p.idPaciente}').style.display='none'" style="margin-left:8px;padding:10px 20px;border:1.5px solid var(--border);border-radius:10px;background:transparent;color:var(--text-soft);font-size:13px;cursor:pointer;">Cancelar</button>
        </div>
      </div>`;
  } catch {
    cont.innerHTML = '<p style="text-align:center;color:#c03030;padding:24px;">Error al cargar expediente</p>';
  }
}

function volverBuscador() {
  document.getElementById('resultados-expediente').innerHTML =
    '<p style="text-align:center;color:var(--text-soft);padding:24px;font-size:13px;">Escribe para buscar un expediente...</p>';
  document.getElementById('q-expediente').value = '';
}

function editarPaciente(id) {
  const f = document.getElementById(`form-editar-${id}`);
  if (f) f.style.display = f.style.display === 'none' ? 'block' : 'none';
}

async function guardarEdicionPaciente(idPaciente) {
  const payload = {
    tipo_sangre:         document.getElementById(`ep-sangre-${idPaciente}`).value,
    estado_paciente:     document.getElementById(`ep-estado-${idPaciente}`).value,
    contacto_emergencia: document.getElementById(`ep-contacto-${idPaciente}`).value,
    telefono_emergencia: document.getElementById(`ep-telefono-${idPaciente}`).value,
  };
  const res  = await fetch(`/api/pacientes/${idPaciente}`, { method:'PUT', headers: H, body: JSON.stringify(payload) });
  const data = await res.json();
  if (data.message) { toast('✅ Paciente actualizado'); abrirExpediente(idPaciente); }
  else toast('Error: ' + (data.error?.sqlMessage || 'No se pudo actualizar'), 'error');
}

// ── CERRAR SESIÓN ─────────────────────────────────────────────────────────────
function cerrarSesion() {
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('usuario');
  window.location.href = '/';
}

// ── INIT ──────────────────────────────────────────────────────────────────────
cargarMedicamentosActivos();
cargarStats();

// ══════════════════════════════════════════════════════════════════════════════
// HU12 — REPORTES MÉDICO
// ══════════════════════════════════════════════════════════════════════════════
function iniciarReportesMedico() {
  _repmSetDefaultDates();
}

function _repmSetDefaultDates() {
  const hoy    = new Date();
  const hace30 = new Date(hoy - 30 * 24 * 60 * 60 * 1000);
  document.getElementById('repm-fecha-inicio').value = hace30.toISOString().split('T')[0];
  document.getElementById('repm-fecha-fin').value    = hoy.toISOString().split('T')[0];
}

async function repMedicoGenerar() {
  const fechaInicio = document.getElementById('repm-fecha-inicio').value;
  const fechaFin    = document.getElementById('repm-fecha-fin').value;
  if (!fechaInicio || !fechaFin) { toast('⚠️ Selecciona un rango de fechas.', 'warning'); return; }
  const params = new URLSearchParams({ fechaInicio, fechaFin });
  try {
    const res  = await fetch(`/api/reportes/consultas-medico?${params}`, { headers: H });
    const data = await res.json();
    if (!res.ok) { toast('Error: ' + (data.error?.sqlMessage || data.error), 'error'); return; }
    _repmRenderKPIs(data.resumen);
    _repmRenderDiagnosticos(data.diagnosticos);
    _repmRenderRecetas(data.recetas);
  } catch (err) {
    console.error('repMedicoGenerar:', err);
  }
}

function _repmRenderKPIs(r) {
  if (!r) return;
  document.getElementById('repm-kpi-consultas').textContent    = r.totalConsultas     ?? 0;
  document.getElementById('repm-kpi-pacientes').textContent    = r.pacientesAtendidos ?? 0;
  document.getElementById('repm-kpi-recetas').textContent      = r.totalRecetas       ?? 0;
  document.getElementById('repm-kpi-diagnosticos').textContent = r.totalDiagnosticos  ?? 0;
}

function _repmRenderDiagnosticos(lista) {
  const el = document.getElementById('repm-diagnosticos');
  if (!lista?.length) {
    el.innerHTML = `<p style="text-align:center;color:var(--text-soft);padding:20px;font-size:13px;">Sin diagnósticos en el período seleccionado.</p>`;
    return;
  }
  const max = lista[0].frecuencia;
  el.innerHTML = lista.map((d, i) => `
    <div style="padding:10px 0;border-bottom:1px solid rgba(42,107,94,0.07);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span style="font-size:13px;font-weight:600;color:var(--deep);">${i + 1}. ${esc(d.descripcion)}</span>
        <span style="font-size:12px;font-weight:700;color:var(--teal);min-width:60px;text-align:right;">${d.frecuencia} caso${d.frecuencia !== 1 ? 's' : ''}</span>
      </div>
      <div style="height:6px;background:var(--border);border-radius:4px;overflow:hidden;">
        <div style="height:100%;width:${Math.round(d.frecuencia * 100 / max)}%;background:linear-gradient(90deg,var(--teal),var(--teal-light));border-radius:4px;transition:width 0.6s;"></div>
      </div>
    </div>`).join('');
}

function _repmRenderRecetas(lista) {
  const tbody = document.getElementById('repm-tbody-recetas');
  if (!lista?.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-soft);padding:20px;">Sin recetas en el período seleccionado.</td></tr>`;
    return;
  }
  tbody.innerHTML = lista.map(r => `
    <tr>
      <td style="color:var(--text-soft);font-size:12px;">${r.fecha?.split('T')[0] ?? '—'}</td>
      <td style="font-weight:600;color:var(--deep);">${esc(r.paciente)}</td>
      <td>${esc(r.medicamento)}</td>
      <td style="color:var(--text-soft);">${esc(r.dosis ?? '—')}</td>
      <td style="color:var(--text-soft);">${esc(r.frecuencia ?? '—')}</td>
      <td style="color:var(--text-soft);">${esc(r.duracion ?? '—')}</td>
    </tr>`).join('');
}

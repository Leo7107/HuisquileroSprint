/**
 * dashboard-medico.js
 *
 * Fixes aplicados:
 * 1. Diagnósticos: eliminados campos inexistentes (codigo_cie, tipo, notas) → fix error "No se pudo registrar"
 * 2. Consultas: autocompletado por nombre de paciente → citas activas → autocompleta idCita e idHistorial
 * 3. Mi Horario: filtrado por idDoctor del médico logueado (GET /api/citas/doctor/:idDoctor)
 * 4. Todas las tablas: nombres en vez de IDs
 * 5. Diagnósticos recientes: muestra nombre del paciente
 */

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

// ── ESTADO GLOBAL ─────────────────────────────────────────────────────────────
let todasLasCitas   = [];   // citas del doctor logueado
let miDoctor        = null; // objeto doctor del usuario logueado
let fechaDia        = new Date();
let fechaSemana     = new Date();
let diaSeleccionado = null;
let todosPacientes  = [];   // para búsqueda en consultas/expediente

// ── NAVEGACIÓN ────────────────────────────────────────────────────────────────
function nav(seccion, linkEl) {
  document.querySelectorAll('[id^="sec-"]').forEach(s => s.style.display = 'none');
  document.getElementById('sec-' + seccion).style.display = 'block';
  document.querySelectorAll('.nav-item').forEach(a => a.classList.remove('active'));
  if (linkEl) linkEl.classList.add('active');

  if (seccion === 'citas')               cargarCitas();
  if (seccion === 'consulta')            iniciarSeccionConsulta();
  if (seccion === 'historial-consultas') cargarHistorialConsultas();
  if (seccion === 'receta')              iniciarSeccionReceta();
  if (seccion === 'diagnostico')         iniciarSeccionDiagnostico();
  if (seccion === 'expediente')          iniciarBuscador();
  if (seccion === 'horario')             iniciarHorario();
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
  return `<span class="estado-dot estado-dot--${mapa[estado] || 'pendiente'}">${estado}</span>`;
}

function nombrePaciente(c) {
  return c.NombrePaciente ? `${c.NombrePaciente} ${c.ApellidosPaciente || ''}`.trim() : `Paciente #${c.idPaciente}`;
}

// ── OBTENER DOCTOR LOGUEADO ───────────────────────────────────────────────────
async function obtenerMiDoctor() {
  if (miDoctor) return miDoctor;
  try {
    const res  = await fetch('/api/doctores', { headers: H });
    const data = await res.json();
    miDoctor   = Array.isArray(data) ? data.find(d => d.idUsuario === usuario.id) : null;
    return miDoctor;
  } catch { return null; }
}

// ── CARGAR PACIENTES (para autocompletados) ───────────────────────────────────
async function cargarPacientes() {
  if (todosPacientes.length) return todosPacientes;
  try {
    const res   = await fetch('/api/pacientes', { headers: H });
    todosPacientes = await res.json();
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

    // Agenda de hoy
    document.getElementById('citas-preview').innerHTML = citasHoy.length
      ? citasHoy.slice(0, 4).map(c => `
          <tr>
            <td><strong>${c.hora ? c.hora.substring(0,5) : '–'}</strong></td>
            <td>${nombrePaciente(c)}</td>
            <td>${c.motivo || '–'}</td>
            <td>${estadoDot(c.estado)}</td>
            <td>
              ${['CONFIRMADA','PENDIENTE'].includes(c.estado)
                ? `<button class="btn-tabla" onclick="abrirHistorialPaciente(${c.idCita}, ${c.idPaciente})">📋 Ver</button>`
                : '–'}
            </td>
          </tr>`).join('')
      : '<tr><td colspan="5" style="text-align:center;color:var(--text-soft);padding:16px;">Sin citas para hoy</td></tr>';

    // Pacientes recientes
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
              ${(c.NombrePaciente || 'P')[0]}
            </div>
            <div style="flex:1;">
              <strong style="display:block;font-size:13px;color:var(--deep);">${nombrePaciente(c)}</strong>
              <span style="font-size:11.5px;color:var(--text-soft);">Última cita: ${c.fecha ? c.fecha.split('T')[0] : '–'} · ${c.estado}</span>
            </div>
            <span style="font-size:11.5px;color:var(--teal);font-weight:600;">Ver →</span>
          </div>`).join('')
      : '<p style="color:var(--text-soft);font-size:13px;padding:12px 0;">Sin pacientes recientes</p>';

    // Consultas recientes
    document.getElementById('consultas-preview').innerHTML = Array.isArray(consultas) && consultas.length
      ? consultas.slice(0,3).map(c => `
          <tr>
            <td>${c.fecha_consulta ? c.fecha_consulta.split('T')[0] : '–'}</td>
            <td>${c.NombrePaciente ? `${c.NombrePaciente} ${c.ApellidosPaciente || ''}` : `Cita #${c.idCita}`}</td>
            <td>${c.observaciones || '–'}</td>
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
          ${(p?.Nombres || 'P')[0]}
        </div>
        <div>
          <strong style="display:block;font-size:14px;color:var(--deep);">${p?.Nombres || '–'} ${p?.Apellidos || ''}</strong>
          <span style="font-size:12px;color:var(--text-soft);">Exp: ${p?.numero_expediente || '–'} · Sangre: ${p?.tipo_sangre || 'N/A'}</span>
        </div>
        ${p?.alergias ? `<div style="margin-left:auto;background:rgba(200,50,50,0.07);border:1px solid rgba(200,50,50,0.15);border-radius:10px;padding:8px 12px;font-size:11.5px;color:#c03030;">⚠️ Alergia: ${p.alergias}</div>` : ''}
      </div>

      <h4 style="font-size:12.5px;font-weight:700;color:var(--deep);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.06em;">🩺 Últimas Consultas</h4>
      <div class="historial-mini" style="margin-bottom:18px;">
        ${Array.isArray(consultas) && consultas.length
          ? consultas.slice(0,3).map(c => `
              <div class="historial-mini__item">
                <h4>${c.fecha_consulta ? c.fecha_consulta.split('T')[0] : '–'} · ${c.NombrePaciente ? c.NombrePaciente + ' ' + (c.ApellidosPaciente||'') : 'Cita #' + c.idCita}</h4>
                <p>Peso: ${c.peso || '–'} kg · Presión: ${c.presion_arterial || '–'} · Temp: ${c.temperatura || '–'}°C</p>
                <p style="margin-top:4px;">${c.observaciones || 'Sin observaciones'}</p>
              </div>`).join('')
          : '<p style="color:var(--text-soft);font-size:12.5px;">Sin consultas registradas</p>'}
      </div>

      <h4 style="font-size:12.5px;font-weight:700;color:var(--deep);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.06em;">🔬 Diagnósticos Recientes</h4>
      <div class="historial-mini" style="margin-bottom:18px;">
        ${Array.isArray(diagnosticos) && diagnosticos.length
          ? diagnosticos.slice(0,3).map(d => `
              <div class="historial-mini__item">
                <h4>Diagnóstico #${d.idDiagnostico} · ${d.fecha_diagnostico ? d.fecha_diagnostico.split('T')[0] : '–'}</h4>
                <p>${d.descripcion || 'Sin descripción'}</p>
              </div>`).join('')
          : '<p style="color:var(--text-soft);font-size:12.5px;">Sin diagnósticos registrados</p>'}
      </div>

      <h4 style="font-size:12.5px;font-weight:700;color:var(--deep);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.06em;">💊 Recetas Recientes</h4>
      <div class="historial-mini">
        ${Array.isArray(recetas) && recetas.length
          ? recetas.slice(0,3).map(r => `
              <div class="historial-mini__item">
                <h4>${r.medicamento} — ${r.dosis || '–'}</h4>
                <p>${r.frecuencia || '–'} · ${r.duracion || '–'}</p>
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

// ── ACCESO RÁPIDO DESDE MODAL ─────────────────────────────────────────────────
function accesoCitaRapido(idCita, idPaciente) {
  nav('consulta', document.querySelector('[onclick*="consulta"]'));
  setTimeout(async () => {
    // Buscar historial del paciente
    try {
      const res  = await fetch(`/api/historial/by-paciente?idPaciente=${idPaciente}`, { headers: H });
      const data = await res.json();
      const h    = Array.isArray(data) ? data[0] : data;
      if (h?.idHistorial) {
        _citaSeleccionada = { idCita, idPaciente, idHistorial: h.idHistorial };
        renderCitaSeleccionada();
      }
    } catch {}
    cargarPreconsulta(idCita);
  }, 150);
}

// ── SECCIÓN CONSULTAS: autocompletado por nombre de paciente ──────────────────
let _citaSeleccionada = null; // { idCita, idPaciente, idHistorial, nombre, fecha, hora }

async function iniciarSeccionConsulta() {
  await cargarPacientes();
  cargarConsultasRecientes();
  // Limpiar selección previa si no viene de acceso rápido
  if (!_citaSeleccionada) limpiarSeleccionCita();
}

function limpiarSeleccionCita() {
  _citaSeleccionada = null;
  document.getElementById('con-cita').value      = '';
  document.getElementById('con-historial').value = '';
  document.getElementById('con-peso').value      = '';
  document.getElementById('con-altura').value    = '';
  document.getElementById('con-presion').value   = '';
  document.getElementById('con-temp').value      = '';
  document.getElementById('con-obs').value       = '';
  document.getElementById('bloque-preconsulta').style.display = 'none';
  renderCitaSeleccionada();
}

function renderCitaSeleccionada() {
  // Actualizar campos ocultos/visibles con la cita seleccionada
  if (_citaSeleccionada) {
    document.getElementById('con-cita').value      = _citaSeleccionada.idCita      || '';
    document.getElementById('con-historial').value = _citaSeleccionada.idHistorial || '';
  }
  const info = document.getElementById('cita-seleccionada-info');
  if (!info) return;
  if (_citaSeleccionada) {
    info.style.display = 'block';
    info.innerHTML = `
      <span style="font-size:12px;color:var(--teal);font-weight:600;">
        ✅ Cita seleccionada: <strong>${_citaSeleccionada.nombre || ''}</strong>
        · ${_citaSeleccionada.fecha || ''} ${_citaSeleccionada.hora || ''}
        · Cita #${_citaSeleccionada.idCita}
      </span>
      <button onclick="limpiarSeleccionCita()" style="margin-left:10px;padding:3px 10px;border:1px solid var(--border);border-radius:7px;background:transparent;font-size:11px;cursor:pointer;color:var(--text-soft);">✕ Cambiar</button>`;
  } else {
    info.style.display = 'none';
    info.innerHTML = '';
  }
}

// Autocompletado de paciente en sección consulta
let _sugTimeoutConsulta = null;
function buscarPacienteConsulta() {
  clearTimeout(_sugTimeoutConsulta);
  _sugTimeoutConsulta = setTimeout(_doBuscarPacienteConsulta, 250);
}

async function _doBuscarPacienteConsulta() {
  const input = document.getElementById('buscar-paciente-consulta');
  const lista = document.getElementById('sug-paciente-consulta');
  const q     = input.value.toLowerCase().trim();

  if (!q) { lista.style.display = 'none'; return; }

  const pacs = Array.isArray(todosPacientes) ? todosPacientes.filter(p =>
    `${p.Nombres} ${p.Apellidos}`.toLowerCase().includes(q) ||
    (p.numero_expediente || '').toLowerCase().includes(q)
  ) : [];

  lista.innerHTML = pacs.length
    ? pacs.slice(0, 8).map(p => `
        <div class="autocomplete-item" onclick="seleccionarPacienteConsulta(${p.idPaciente}, '${(p.Nombres+' '+p.Apellidos).replace(/'/g,"\\'")}')">
          <strong>${p.Nombres} ${p.Apellidos}</strong>
          <span>Exp: ${p.numero_expediente || '–'}</span>
        </div>`).join('')
    : '<div class="autocomplete-item" style="color:var(--text-soft);">Sin resultados</div>';

  lista.style.display = 'block';
}

async function seleccionarPacienteConsulta(idPaciente, nombre) {
  document.getElementById('buscar-paciente-consulta').value = nombre;
  document.getElementById('sug-paciente-consulta').style.display = 'none';
  document.getElementById('lista-citas-paciente').innerHTML =
    '<p style="font-size:12.5px;color:var(--text-soft);">Cargando citas...</p>';
  document.getElementById('bloque-citas-paciente').style.display = 'block';

  try {
    // Obtener citas activas del paciente
    const pac = todosPacientes.find(p => p.idPaciente === idPaciente);
    const res  = await fetch(`/api/citas/paciente/${pac?.idUsuario || idPaciente}`, { headers: H });
    const citas = await res.json();
    const activas = Array.isArray(citas)
      ? citas.filter(c => ['PENDIENTE','CONFIRMADA'].includes(c.estado))
      : [];

    // Obtener historial del paciente
    const hRes  = await fetch(`/api/historial/by-paciente?idPaciente=${idPaciente}`, { headers: H });
    const hData = await hRes.json();
    const historial = Array.isArray(hData) ? hData[0] : hData;

    document.getElementById('lista-citas-paciente').innerHTML = activas.length
      ? activas.map(c => `
          <div onclick="elegirCita(${c.idCita}, ${idPaciente}, '${nombre.replace(/'/g,"\\'")}', '${c.fecha ? c.fecha.split('T')[0] : ''}', '${c.hora ? c.hora.substring(0,5) : ''}', ${historial?.idHistorial || 'null'})"
               style="padding:10px 14px;border:1.5px solid var(--border);border-radius:10px;cursor:pointer;transition:all 0.2s;margin-bottom:8px;"
               onmouseover="this.style.borderColor='var(--teal)';this.style.background='rgba(42,107,94,0.04)'"
               onmouseout="this.style.borderColor='var(--border)';this.style.background='transparent'">
            <strong style="font-size:13px;color:var(--deep);">${c.fecha ? c.fecha.split('T')[0] : '–'} · ${c.hora ? c.hora.substring(0,5) : '–'}</strong>
            <span style="display:block;font-size:11.5px;color:var(--text-soft);">${c.motivo || 'Sin motivo'} · ${c.estado}</span>
          </div>`).join('')
      : '<p style="font-size:12.5px;color:var(--text-soft);">Este paciente no tiene citas activas (PENDIENTE/CONFIRMADA)</p>';
  } catch {
    document.getElementById('lista-citas-paciente').innerHTML =
      '<p style="font-size:12.5px;color:#c03030;">Error al cargar citas</p>';
  }
}

async function elegirCita(idCita, idPaciente, nombre, fecha, hora, idHistorial) {
  _citaSeleccionada = { idCita, idPaciente, nombre, fecha, hora, idHistorial };

  // Si no se encontró el historial, intentar obtenerlo
  if (!idHistorial) {
    try {
      const res  = await fetch(`/api/historial/by-paciente?idPaciente=${idPaciente}`, { headers: H });
      const data = await res.json();
      const h    = Array.isArray(data) ? data[0] : data;
      _citaSeleccionada.idHistorial = h?.idHistorial || null;
    } catch {}
  }

  document.getElementById('bloque-citas-paciente').style.display = 'none';
  document.getElementById('buscar-paciente-consulta').value = '';
  renderCitaSeleccionada();
  cargarPreconsulta(idCita);
}

// Cerrar sugerencias al click fuera
document.addEventListener('click', (e) => {
  const inp = document.getElementById('buscar-paciente-consulta');
  const sug = document.getElementById('sug-paciente-consulta');
  if (inp && sug && !inp.contains(e.target) && !sug.contains(e.target))
    sug.style.display = 'none';
});

// ── PRECONSULTA ───────────────────────────────────────────────────────────────
async function cargarPreconsulta(idCita) {
  if (!idCita) return;
  const bloque = document.getElementById('bloque-preconsulta');
  const datos  = document.getElementById('preconsulta-datos');
  try {
    const res  = await fetch('/api/consultas', { headers: H });
    const list = await res.json();
    const pre  = Array.isArray(list)
      ? list.find(c => String(c.idCita) === String(idCita))
      : null;

    if (pre) {
      datos.innerHTML = `
        <div class="preconsulta-item"><div class="preconsulta-item__label">Peso</div><div class="preconsulta-item__value">${pre.peso ? pre.peso + ' kg' : '–'}</div></div>
        <div class="preconsulta-item"><div class="preconsulta-item__label">Presión Arterial</div><div class="preconsulta-item__value">${pre.presion_arterial || '–'}</div></div>
        <div class="preconsulta-item"><div class="preconsulta-item__label">Temperatura</div><div class="preconsulta-item__value">${pre.temperatura ? pre.temperatura + '°C' : '–'}</div></div>
        <div class="preconsulta-item"><div class="preconsulta-item__label">Altura</div><div class="preconsulta-item__value">${pre.altura ? pre.altura + ' cm' : '–'}</div></div>`;
      if (pre.peso)             document.getElementById('con-peso').value    = pre.peso;
      if (pre.presion_arterial) document.getElementById('con-presion').value = pre.presion_arterial;
      if (pre.temperatura)      document.getElementById('con-temp').value    = pre.temperatura;
      if (pre.altura)           document.getElementById('con-altura').value  = pre.altura;
      bloque.style.display = 'block';
    } else {
      bloque.style.display = 'none';
    }
  } catch { bloque.style.display = 'none'; }
}

// ── GUARDAR CONSULTA ──────────────────────────────────────────────────────────
async function guardarConsulta() {
  if (!_citaSeleccionada) {
    alert('⚠️ Primero selecciona un paciente y una cita.');
    return;
  }
  if (!_citaSeleccionada.idHistorial) {
    alert('⚠️ No se encontró historial clínico para este paciente. Verifica que el paciente tenga historial registrado.');
    return;
  }

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
    alert(`✅ Consulta registrada correctamente (Cita #${_citaSeleccionada.idCita})`);
    limpiarSeleccionCita();
    cargarConsultasRecientes();
    cargarStats();
  } else {
    alert('Error: ' + (data.error?.sqlMessage || data.error || 'No se pudo registrar'));
  }
}

// ── HISTORIAL CONSULTAS ───────────────────────────────────────────────────────
async function cargarHistorialConsultas() {
  try {
    const res  = await fetch('/api/consultas', { headers: H });
    const data = await res.json();
    document.getElementById('tbody-historial-consultas').innerHTML = Array.isArray(data) && data.length
      ? data.map(c => `
          <tr>
            <td>#${c.idConsulta}</td>
            <td>${c.fecha_consulta ? c.fecha_consulta.split('T')[0] : '–'}</td>
            <td>${c.NombrePaciente ? `${c.NombrePaciente} ${c.ApellidosPaciente || ''}` : `Cita #${c.idCita}`}</td>
            <td>${c.peso ? c.peso + ' kg' : '–'}</td>
            <td>${c.presion_arterial || '–'}</td>
            <td>${c.temperatura ? c.temperatura + ' °C' : '–'}</td>
            <td>${c.observaciones || '–'}</td>
          </tr>`).join('')
      : '<tr><td colspan="7" style="text-align:center;color:var(--text-soft);padding:20px;">Sin consultas registradas</td></tr>';
  } catch {
    document.getElementById('tbody-historial-consultas').innerHTML =
      '<tr><td colspan="7" style="text-align:center;color:#c03030;padding:20px;">Error al cargar</td></tr>';
  }
}

async function verDetalleConsulta(idConsulta) {
  // Placeholder — puede expandirse a modal si se necesita
  alert(`Detalle de consulta #${idConsulta} — próximamente`);
}

async function cargarConsultasRecientes() {
  try {
    const res  = await fetch('/api/consultas', { headers: H });
    const data = await res.json();
    document.getElementById('consultas-recientes').innerHTML = Array.isArray(data) && data.length
      ? data.slice(0,5).map(c => `
          <div style="padding:10px 0;border-bottom:1px solid rgba(42,107,94,0.07);">
            <strong style="display:block;font-size:13px;color:var(--deep);">
              ${c.NombrePaciente ? `${c.NombrePaciente} ${c.ApellidosPaciente || ''}` : `Cita #${c.idCita}`}
            </strong>
            <span style="font-size:11.5px;color:var(--text-soft);">${c.fecha_consulta ? c.fecha_consulta.split('T')[0] : '–'} · ${c.observaciones || '–'}</span>
          </div>`).join('')
      : '<p style="color:var(--text-soft);font-size:13px;">Sin consultas registradas</p>';
  } catch {}
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
      ? todasLasCitas.map(c => `
          <tr>
            <td>#${c.idCita}</td>
            <td>${c.fecha ? c.fecha.split('T')[0] : '–'}</td>
            <td>${c.hora ? c.hora.substring(0,5) : '–'}</td>
            <td>${nombrePaciente(c)}</td>
            <td>${c.motivo || '–'}</td>
            <td>${estadoDot(c.estado)}</td>
            <td>
              ${['CONFIRMADA','PENDIENTE'].includes(c.estado)
                ? `<button class="btn-tabla" onclick="abrirHistorialPaciente(${c.idCita}, ${c.idPaciente})">📋 Ver</button>`
                : '–'}
            </td>
          </tr>`).join('')
      : '<tr><td colspan="7" style="text-align:center;color:var(--text-soft);padding:20px;">Sin citas</td></tr>';
  } catch {
    document.getElementById('tbody-citas').innerHTML =
      '<tr><td colspan="7" style="text-align:center;color:#c03030;padding:20px;">Error al cargar</td></tr>';
  }
}

// ── MI HORARIO: filtrado por idDoctor ─────────────────────────────────────────
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
            <p style="font-family:'Playfair Display',serif;font-size:1.2rem;font-weight:700;color:var(--deep);">${doc.Consultorio || '–'}</p>
          </div>
          <div style="background:var(--cream);border:1.5px solid var(--border);border-radius:14px;padding:18px;text-align:center;">
            <p style="font-size:10.5px;color:var(--text-soft);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Especialidad</p>
            <p style="font-family:'Playfair Display',serif;font-size:1rem;font-weight:700;color:var(--deep);">${doc.Especialidad || '–'}</p>
          </div>
          <div style="background:var(--cream);border:1.5px solid var(--border);border-radius:14px;padding:18px;text-align:center;">
            <p style="font-size:10.5px;color:var(--text-soft);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">N° Junta Médica</p>
            <p style="font-family:monospace;font-size:1rem;font-weight:700;color:var(--deep);">${doc.numero_junta_medica || '–'}</p>
          </div>
        </div>`;

      // Cargar citas del doctor si no están cargadas aún
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
          <td>${c.motivo || '–'}</td>
          <td>${estadoDot(c.estado)}</td>
          <td>
            ${['CONFIRMADA','PENDIENTE'].includes(c.estado)
              ? `<button class="btn-tabla" onclick="abrirHistorialPaciente(${c.idCita}, ${c.idPaciente})">📋 Ver</button>`
              : '–'}
          </td>
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

  const dias   = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
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
          <td>${c.motivo || '–'}</td>
          <td>${estadoDot(c.estado)}</td>
          <td>
            ${['CONFIRMADA','PENDIENTE'].includes(c.estado)
              ? `<button class="btn-tabla" onclick="abrirHistorialPaciente(${c.idCita}, ${c.idPaciente})">📋 Ver</button>`
              : '–'}
          </td>
        </tr>`).join('')
    : '<tr><td colspan="5" style="text-align:center;color:var(--text-soft);padding:16px;">Sin citas para este día</td></tr>';
}

// ── SECCIÓN DIAGNÓSTICOS: autocompletado por consulta ────────────────────────
let _consultaSeleccionada = null; // { idConsulta, nombrePaciente, fecha }

async function iniciarSeccionDiagnostico() {
  await cargarPacientes();
  cargarDiagnosticosRecientes();
  _consultaSeleccionada = null;
  renderConsultaSeleccionada();
}

function renderConsultaSeleccionada() {
  const info = document.getElementById('diagnostico-consulta-info');
  if (!info) return;
  if (_consultaSeleccionada) {
    info.style.display = 'block';
    info.innerHTML = `
      <span style="font-size:12px;color:var(--teal);font-weight:600;">
        ✅ Consulta seleccionada: <strong>${_consultaSeleccionada.nombrePaciente}</strong>
        · ${_consultaSeleccionada.fecha || ''}
        · Consulta #${_consultaSeleccionada.idConsulta}
      </span>
      <button onclick="limpiarConsultaSeleccionada()" style="margin-left:10px;padding:3px 10px;border:1px solid var(--border);border-radius:7px;background:transparent;font-size:11px;cursor:pointer;color:var(--text-soft);">✕ Cambiar</button>`;
    document.getElementById('diag-consulta').value = _consultaSeleccionada.idConsulta;
  } else {
    info.style.display = 'none';
    info.innerHTML = '';
    document.getElementById('diag-consulta').value = '';
  }
}

function limpiarConsultaSeleccionada() {
  _consultaSeleccionada = null;
  document.getElementById('buscar-paciente-diag').value = '';
  document.getElementById('bloque-consultas-diag').style.display = 'none';
  renderConsultaSeleccionada();
}

let _sugTimeoutDiag = null;
function buscarPacienteDiag() {
  clearTimeout(_sugTimeoutDiag);
  _sugTimeoutDiag = setTimeout(_doBuscarPacienteDiag, 250);
}

async function _doBuscarPacienteDiag() {
  const input = document.getElementById('buscar-paciente-diag');
  const lista = document.getElementById('sug-paciente-diag');
  const q     = input.value.toLowerCase().trim();
  if (!q) { lista.style.display = 'none'; return; }

  const pacs = todosPacientes.filter(p =>
    `${p.Nombres} ${p.Apellidos}`.toLowerCase().includes(q) ||
    (p.numero_expediente || '').toLowerCase().includes(q)
  );

  lista.innerHTML = pacs.length
    ? pacs.slice(0,8).map(p => `
        <div class="autocomplete-item" onclick="seleccionarPacienteDiag(${p.idPaciente}, '${(p.Nombres+' '+p.Apellidos).replace(/'/g,"\\'")}')">
          <strong>${p.Nombres} ${p.Apellidos}</strong>
          <span>Exp: ${p.numero_expediente || '–'}</span>
        </div>`).join('')
    : '<div class="autocomplete-item" style="color:var(--text-soft);">Sin resultados</div>';
  lista.style.display = 'block';
}

async function seleccionarPacienteDiag(idPaciente, nombre) {
  document.getElementById('buscar-paciente-diag').value = nombre;
  document.getElementById('sug-paciente-diag').style.display = 'none';
  document.getElementById('bloque-consultas-diag').style.display = 'block';
  document.getElementById('lista-consultas-diag').innerHTML =
    '<p style="font-size:12.5px;color:var(--text-soft);">Cargando consultas...</p>';

  try {
    const res  = await fetch('/api/consultas', { headers: H });
    const data = await res.json();
    // Filtrar consultas de este paciente mediante sus citas
    const citasPac = todasLasCitas.filter(c => c.idPaciente === idPaciente).map(c => c.idCita);
    const cons = Array.isArray(data)
      ? data.filter(c => citasPac.includes(c.idCita))
      : [];

    document.getElementById('lista-consultas-diag').innerHTML = cons.length
      ? cons.map(c => `
          <div onclick="elegirConsultaDiag(${c.idConsulta}, '${nombre.replace(/'/g,"\\'")}', '${c.fecha_consulta ? c.fecha_consulta.split('T')[0] : ''}')"
               style="padding:10px 14px;border:1.5px solid var(--border);border-radius:10px;cursor:pointer;transition:all 0.2s;margin-bottom:8px;"
               onmouseover="this.style.borderColor='var(--teal)';this.style.background='rgba(42,107,94,0.04)'"
               onmouseout="this.style.borderColor='var(--border)';this.style.background='transparent'">
            <strong style="font-size:13px;color:var(--deep);">Consulta #${c.idConsulta} · ${c.fecha_consulta ? c.fecha_consulta.split('T')[0] : '–'}</strong>
            <span style="display:block;font-size:11.5px;color:var(--text-soft);">${c.observaciones || 'Sin observaciones'}</span>
          </div>`).join('')
      : '<p style="font-size:12.5px;color:var(--text-soft);">No se encontraron consultas para este paciente</p>';
  } catch {
    document.getElementById('lista-consultas-diag').innerHTML =
      '<p style="font-size:12.5px;color:#c03030;">Error al cargar consultas</p>';
  }
}

function elegirConsultaDiag(idConsulta, nombrePaciente, fecha) {
  _consultaSeleccionada = { idConsulta, nombrePaciente, fecha };
  document.getElementById('bloque-consultas-diag').style.display = 'none';
  document.getElementById('buscar-paciente-diag').value = '';
  renderConsultaSeleccionada();
}

document.addEventListener('click', (e) => {
  const inp = document.getElementById('buscar-paciente-diag');
  const sug = document.getElementById('sug-paciente-diag');
  if (inp && sug && !inp.contains(e.target) && !sug.contains(e.target))
    sug.style.display = 'none';
});

// ── GUARDAR DIAGNÓSTICO — FIX: solo campos que existen en la tabla ────────────
async function guardarDiagnostico() {
  if (!_consultaSeleccionada) {
    alert('⚠️ Primero selecciona un paciente y una consulta.');
    return;
  }

  const descripcion = document.getElementById('diag-descripcion').value.trim();
  const fechaVal    = document.getElementById('diag-fecha').value;

  if (!descripcion) { alert('La descripción es obligatoria.'); return; }
  if (!fechaVal)     { alert('La fecha del diagnóstico es obligatoria.'); return; }

  // Solo los 3 campos que existen: descripcion, fecha_diagnostico, idConsulta
  const payload = {
    descripcion,
    fecha_diagnostico: fechaVal.replace('T', ' '),
    idConsulta:        _consultaSeleccionada.idConsulta,
  };

  const res  = await fetch('/api/diagnosticos', { method:'POST', headers: H, body: JSON.stringify(payload) });
  const data = await res.json();

  if (data.id) {
    alert(`✅ Diagnóstico registrado correctamente`);
    document.getElementById('diag-descripcion').value = '';
    document.getElementById('diag-fecha').value       = '';
    limpiarConsultaSeleccionada();
    cargarDiagnosticosRecientes();
  } else {
    alert('Error: ' + (data.error?.sqlMessage || data.error || 'No se pudo registrar'));
  }
}

async function cargarDiagnosticosRecientes() {
  try {
    const res  = await fetch('/api/diagnosticos', { headers: H });
    const data = await res.json();
    document.getElementById('diagnosticos-recientes').innerHTML = Array.isArray(data) && data.length
      ? data.slice(0,5).map(d => `
          <div style="padding:10px 0;border-bottom:1px solid rgba(42,107,94,0.07);">
            <strong style="display:block;font-size:13px;color:var(--deep);">
              Diagnóstico #${d.idDiagnostico} · Consulta #${d.idConsulta}
            </strong>
            <span style="font-size:11.5px;color:var(--text-soft);">${d.fecha_diagnostico ? d.fecha_diagnostico.split('T')[0] : '–'} · ${d.descripcion || '–'}</span>
          </div>`).join('')
      : '<p style="color:var(--text-soft);font-size:13px;">Sin diagnósticos registrados</p>';
  } catch {}
}

// ═══════════════════════════════════════════════════════════════════
// BLOQUE RECETAS — reemplaza todo el bloque "── RECETAS ───" en
// dashboard-medico.js (desde "let listaMedsActivos" hasta el final
// de "guardarReceta")
// ═══════════════════════════════════════════════════════════════════

// ── Estado de receta ─────────────────────────────────────────────
let listaMedsActivos    = [];
let _recPacienteId      = null;   // idPaciente seleccionado
let _recMedActual       = null;   // medicamento en curso antes de agregar
let _recLineas          = [];     // [ { med, dosis, frecuencia, duracion, cantidad, indicaciones, subtotal } ]

// ── Cargar medicamentos activos al init ───────────────────────────
async function cargarMedicamentosActivos() {
  try {
    const res = await fetch('/api/medicamentos/activos', { headers: H });
    listaMedsActivos = await res.json();
  } catch {}
}

// ── Iniciar sección receta ────────────────────────────────────────
async function iniciarSeccionReceta() {
  await cargarPacientes();
  await cargarMedicamentosActivos();
  limpiarFormReceta();
  cargarRecetasRecientes();
}

function limpiarFormReceta() {
  _recPacienteId  = null;
  _recMedActual   = null;
  _recLineas      = [];

  document.getElementById('rec-buscar-paciente').value = '';
  document.getElementById('rec-sug-paciente').style.display = 'none';
  document.getElementById('rec-paciente-info').style.display = 'none';
  document.getElementById('rec-diagnostico-sel').innerHTML = '<option value="">— Selecciona paciente primero —</option>';
  document.getElementById('rec-medicamento-nombre').value = '';
  document.getElementById('rec-medicamento-id').value = '';
  document.getElementById('rec-med-campos').style.display = 'none';
  document.getElementById('rec-stock-info').style.display = 'none';
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

// ── PASO 1: Buscar paciente ───────────────────────────────────────
let _recSugTimer = null;
function buscarPacienteReceta() {
  clearTimeout(_recSugTimer);
  _recSugTimer = setTimeout(() => {
    const input = document.getElementById('rec-buscar-paciente');
    const lista = document.getElementById('rec-sug-paciente');
    const q     = input.value.toLowerCase().trim();
    if (!q) { lista.style.display = 'none'; return; }

    const pacs = todosPacientes.filter(p =>
      `${p.Nombres} ${p.Apellidos}`.toLowerCase().includes(q) ||
      (p.numero_expediente || '').toLowerCase().includes(q)
    );

    lista.innerHTML = pacs.length
      ? pacs.slice(0,8).map(p => `
          <div class="autocomplete-item"
            onclick="seleccionarPacienteReceta(${p.idPaciente}, '${(p.Nombres+' '+p.Apellidos).replace(/'/g,"\\'")}', ${p.idUsuario})">
            <strong>${p.Nombres} ${p.Apellidos}</strong>
            <span>Exp: ${p.numero_expediente || '–'}</span>
          </div>`).join('')
      : '<div class="autocomplete-item" style="color:var(--text-soft);">Sin resultados</div>';
    lista.style.display = 'block';
  }, 220);
}

async function seleccionarPacienteReceta(idPaciente, nombre, idUsuario) {
  _recPacienteId = idPaciente;
  document.getElementById('rec-buscar-paciente').value = nombre;
  document.getElementById('rec-sug-paciente').style.display = 'none';

  const info = document.getElementById('rec-paciente-info');
  info.textContent = `✅ Paciente: ${nombre}`;
  info.style.display = 'block';

  // Cargar diagnósticos del paciente
  const sel = document.getElementById('rec-diagnostico-sel');
  sel.innerHTML = '<option value="">Cargando diagnósticos...</option>';

  try {
    // Obtener citas del paciente para luego filtrar diagnósticos
    const resC = await fetch(`/api/citas/paciente/${idUsuario}`, { headers: H });
    const citas = await resC.json();
    const idsCitas = Array.isArray(citas) ? citas.map(c => c.idCita) : [];

    const resD = await fetch('/api/diagnosticos', { headers: H });
    const diags = await resD.json();

    // Obtener consultas del paciente para cruzar con diagnósticos
    const resC2 = await fetch('/api/consultas', { headers: H });
    const consultas = await resC2.json();
    const idsCons = Array.isArray(consultas)
      ? consultas.filter(c => idsCitas.includes(c.idCita)).map(c => c.idConsulta)
      : [];

    const diagsPac = Array.isArray(diags)
      ? diags.filter(d => idsCons.includes(d.idConsulta))
      : [];

    sel.innerHTML = diagsPac.length
      ? `<option value="">— Sin diagnóstico asociado —</option>` +
        diagsPac.map(d => `
          <option value="${d.idDiagnostico}">
            #${d.idDiagnostico} · ${d.fecha_diagnostico ? d.fecha_diagnostico.split('T')[0] : '–'} · ${(d.descripcion || '').substring(0,50)}${d.descripcion?.length > 50 ? '...' : ''}
          </option>`).join('')
      : '<option value="">Sin diagnósticos registrados</option>';
  } catch {
    sel.innerHTML = '<option value="">Error al cargar diagnósticos</option>';
  }
}

// Cerrar sugerencias al click fuera
document.addEventListener('click', (e) => {
  const inp = document.getElementById('rec-buscar-paciente');
  const sug = document.getElementById('rec-sug-paciente');
  if (inp && sug && !inp.contains(e.target) && !sug.contains(e.target))
    sug.style.display = 'none';
});

// ── PASO 2: Buscar medicamento ────────────────────────────────────
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
    ? listaMedsActivos.filter(m =>
        m.nombre.toLowerCase().includes(q) &&
        m.stock_actual > 0
      )
    : [];

  sug.innerHTML = lista.length
    ? lista.map(m => `
        <div class="autocomplete-item"
          onclick="seleccionarMedicamento(${m.idMedicamento}, '${m.nombre.replace(/'/g,"\\'")}', '${(m.descripcion||'').replace(/'/g,"\\'")}', '${m.unidad_medida}', ${m.stock_actual}, ${m.precio_unitario || 0})">
          <strong>${m.nombre}</strong>
          <span>Stock: ${m.stock_actual} ${m.unidad_medida} · $${parseFloat(m.precio_unitario || 0).toFixed(2)} · ${m.descripcion ? m.descripcion.substring(0,40) : 'Sin descripción'}</span>
        </div>`).join('')
    : '<div class="autocomplete-item" style="color:var(--text-soft);">Sin medicamentos disponibles con ese nombre</div>';

  sug.style.display = 'block';
}

function seleccionarMedicamento(id, nombre, descripcion, unidad, stock, precio) {
  document.getElementById('rec-medicamento-nombre').value = nombre;
  document.getElementById('rec-medicamento-id').value     = id;
  document.getElementById('sug-medicamento').style.display = 'none';

  // Autocompletar dosis desde descripción del medicamento
  // La descripción suele contener "500mg", "250mg/5ml", etc.
  const dosisMatch = descripcion.match(/\d+\s*(?:mg|ml|mcg|g|UI|ug)(?:\/\d+\s*(?:mg|ml))?/i);
  const dosisAuto  = dosisMatch ? dosisMatch[0] : '';

  if (dosisAuto) document.getElementById('rec-dosis').value = dosisAuto;

  _recMedActual = { id, nombre, descripcion, unidad, stock, precio: parseFloat(precio) };

  // Mostrar campos y stock
  document.getElementById('rec-med-campos').style.display = 'block';
  const infoEl = document.getElementById('rec-stock-info');
  infoEl.textContent = `Stock disponible: ${stock} ${unidad} · Precio unitario: $${parseFloat(precio).toFixed(2)}`;
  infoEl.style.display = 'block';
}

document.addEventListener('click', (e) => {
  const inp = document.getElementById('rec-medicamento-nombre');
  const sug = document.getElementById('sug-medicamento');
  if (inp && sug && !inp.contains(e.target) && !sug.contains(e.target))
    sug.style.display = 'none';
});

// ── Agregar medicamento a la lista ────────────────────────────────
function agregarMedicamentoLista() {
  if (!_recMedActual) {
    alert('⚠️ Selecciona un medicamento del listado primero.');
    return;
  }

  const cantidad   = parseInt(document.getElementById('rec-cantidad').value) || 1;
  const dosis      = document.getElementById('rec-dosis').value.trim();
  const frecuencia = document.getElementById('rec-frecuencia').value.trim();
  const duracion   = document.getElementById('rec-duracion').value.trim();
  const indicaciones = document.getElementById('rec-indicaciones').value.trim();

  if (!dosis)      { alert('⚠️ La dosis es obligatoria.'); return; }
  if (!frecuencia) { alert('⚠️ La frecuencia es obligatoria.'); return; }
  if (cantidad < 1){ alert('⚠️ La cantidad debe ser al menos 1.'); return; }
  if (cantidad > _recMedActual.stock) {
    alert(`⚠️ Stock insuficiente. Solo hay ${_recMedActual.stock} ${_recMedActual.unidad} disponibles.`);
    return;
  }

  // Verificar si ya está en la lista
  const yaEsta = _recLineas.find(l => l.med.id === _recMedActual.id);
  if (yaEsta) {
    alert('⚠️ Este medicamento ya fue agregado. Elimínalo primero si quieres cambiarlo.');
    return;
  }

  const subtotal = _recMedActual.precio * cantidad;
  _recLineas.push({
    med: { ..._recMedActual },
    dosis, frecuencia, duracion, cantidad, indicaciones,
    subtotal,
  });

  // Limpiar campos para siguiente medicamento
  document.getElementById('rec-medicamento-nombre').value = '';
  document.getElementById('rec-medicamento-id').value = '';
  document.getElementById('rec-med-campos').style.display = 'none';
  document.getElementById('rec-stock-info').style.display = 'none';
  _recMedActual = null;
  limpiarCamposMed();

  renderLineasReceta();
}

// ── Render tabla de medicamentos ──────────────────────────────────
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
        <strong style="display:block;">${l.med.nombre}</strong>
        ${l.indicaciones ? `<span style="font-size:11px;color:var(--text-soft);">${l.indicaciones}</span>` : ''}
      </td>
      <td>${l.dosis}</td>
      <td>${l.frecuencia}</td>
      <td>${l.duracion || '–'}</td>
      <td>${l.cantidad} ${l.med.unidad}</td>
      <td style="font-weight:600;color:var(--teal);">$${l.subtotal.toFixed(2)}</td>
      <td>
        <button onclick="eliminarLineaReceta(${i})"
          style="width:28px;height:28px;border:none;border-radius:7px;background:rgba(200,50,50,0.1);color:#c03030;cursor:pointer;font-size:13px;">✕</button>
      </td>
    </tr>`).join('');

  const total = _recLineas.reduce((s, l) => s + l.subtotal, 0);
  document.getElementById('rec-total').textContent = total.toFixed(2);
}

function eliminarLineaReceta(idx) {
  _recLineas.splice(idx, 1);
  renderLineasReceta();
}

// ── Guardar receta (una por medicamento, misma sesión) ────────────
async function guardarReceta() {
  if (!_recPacienteId) {
    alert('⚠️ Selecciona un paciente primero.');
    return;
  }
  if (!_recLineas.length) {
    alert('⚠️ Agrega al menos un medicamento.');
    return;
  }

  const idDiagnostico = parseInt(document.getElementById('rec-diagnostico-sel').value) || null;

  try {
    let errores = 0;

    for (const linea of _recLineas) {
      const payload = {
        medicamento:   linea.med.nombre,
        dosis:         linea.dosis,
        frecuencia:    linea.frecuencia,
        duracion:      linea.duracion  || null,
        indicaciones:  linea.indicaciones || null,
        idDiagnostico: idDiagnostico,
        idFactura:     null,
        idMedicamento: linea.med.id,
        cantidad:      linea.cantidad,
      };

      const res  = await fetch('/api/recetas', { method:'POST', headers: H, body: JSON.stringify(payload) });
      const data = await res.json();

      if (data.id || data.message) {
        // Descontar stock
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
      alert(`✅ Receta emitida correctamente.\n${_recLineas.length} medicamento(s) registrado(s).\nMonto total: $${total.toFixed(2)}`);
      limpiarFormReceta();
      await cargarMedicamentosActivos(); // refrescar stock
      cargarRecetasRecientes();
    } else {
      alert(`⚠️ Se emitieron ${_recLineas.length - errores} de ${_recLineas.length} medicamentos. Revisa la consola para detalles.`);
    }
  } catch (err) {
    alert('Error de conexión al emitir la receta.');
    console.error(err);
  }
}

// ── Recetas recientes ─────────────────────────────────────────────
async function cargarRecetasRecientes() {
  try {
    const res  = await fetch('/api/recetas', { headers: H });
    const data = await res.json();
    document.getElementById('recetas-recientes').innerHTML = Array.isArray(data) && data.length
      ? data.slice(0,5).map(r => `
          <div style="padding:10px 0;border-bottom:1px solid rgba(42,107,94,0.07);">
            <strong style="display:block;font-size:13px;color:var(--deep);">${r.medicamento}</strong>
            <span style="font-size:11.5px;color:var(--text-soft);">${r.dosis || '–'} · ${r.frecuencia || '–'} · ${r.duracion || '–'}</span>
          </div>`).join('')
      : '<p style="color:var(--text-soft);font-size:13px;">Sin recetas registradas</p>';
  } catch {}
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
            ${(p.Nombres || 'P')[0]}
          </div>
          <div>
            <strong style="display:block;font-size:13.5px;color:var(--deep);">Exp: ${p.numero_expediente} — ${p.Nombres || ''} ${p.Apellidos || ''}</strong>
            <span style="font-size:11.5px;color:var(--text-soft);">ID ${p.idPaciente} · ${p.estado_paciente || '–'} · Sangre: ${p.tipo_sangre || 'N/A'}</span>
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
    const [pRes, hRes, recRes] = await Promise.all([
      fetch(`/api/pacientes/${idPaciente}`, { headers: H }),
      fetch(`/api/historial/by-paciente?idPaciente=${idPaciente}`, { headers: H }),
      fetch('/api/recetas', { headers: H }),
    ]);
    const paciente  = await pRes.json();
    const historial = await hRes.json();
    const recetas   = await recRes.json();

    const p = Array.isArray(paciente) ? paciente[0] : paciente;
    const h = Array.isArray(historial) ? historial[0] : historial;
    const citasPaciente   = todasLasCitas.filter(c => c.idPaciente === idPaciente);
    const recetasPaciente = Array.isArray(recetas) ? recetas.filter(r => r.idPaciente === idPaciente) : [];

    cont.innerHTML = `
      <button onclick="volverBuscador()" style="margin-bottom:16px;padding:8px 16px;border:1.5px solid var(--border);border-radius:10px;background:transparent;color:var(--text-soft);cursor:pointer;font-size:13px;">← Volver</button>
      <div style="background:var(--cream);border:1.5px solid var(--border);border-radius:16px;padding:24px;margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h3 style="font-size:15px;font-weight:700;color:var(--deep);">👤 ${p?.Nombres || '–'} ${p?.Apellidos || ''}</h3>
          <button onclick="editarPaciente(${p.idPaciente})" style="padding:7px 14px;border:none;border-radius:9px;background:linear-gradient(135deg,var(--teal),var(--teal-light));color:#fff;font-size:12px;font-weight:600;cursor:pointer;">✏️ Editar</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;">
          <div><span style="color:var(--text-soft);">Expediente:</span> <strong>${p?.numero_expediente || '–'}</strong></div>
          <div><span style="color:var(--text-soft);">Tipo de sangre:</span> <strong>${p?.tipo_sangre || 'N/A'}</strong></div>
          <div><span style="color:var(--text-soft);">Email:</span> <strong>${p?.Email || '–'}</strong></div>
          <div><span style="color:var(--text-soft);">Estado:</span> <strong>${p?.estado_paciente || '–'}</strong></div>
        </div>
      </div>
      <div style="background:var(--cream);border:1.5px solid var(--border);border-radius:16px;padding:24px;margin-bottom:16px;">
        <h3 style="font-size:15px;font-weight:700;color:var(--deep);margin-bottom:14px;">🏥 Historial Clínico</h3>
        ${h ? `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px;">
            <div><span style="color:var(--text-soft);">Alergias:</span><br/><strong>${h.alergias || 'Ninguna'}</strong></div>
            <div><span style="color:var(--text-soft);">Padecimientos crónicos:</span><br/><strong>${h.padecimientos_cronicos || 'Ninguno'}</strong></div>
            <div><span style="color:var(--text-soft);">Antecedentes familiares:</span><br/><strong>${h.antecedentes_familiares || 'Ninguno'}</strong></div>
            <div><span style="color:var(--text-soft);">Cirugías previas:</span><br/><strong>${h.cirugias_previas || 'Ninguna'}</strong></div>
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
                <td style="padding:8px 0;">${c.motivo || '–'}</td>
                <td style="padding:8px 0;">${estadoDot(c.estado)}</td>
              </tr>`).join('')}</tbody>
          </table>` : '<p style="color:var(--text-soft);font-size:13px;">Sin citas</p>'}
      </div>
      <!-- form editar / recetas igual que antes -->
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
            <input type="text" id="ep-contacto-${p.idPaciente}" value="${p.contacto_emergencia||''}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;background:white;margin-top:4px;box-sizing:border-box;"/>
          </div>
          <div>
            <label style="font-size:11.5px;color:var(--text-soft);font-weight:600;">Teléfono Emergencia</label>
            <input type="text" id="ep-telefono-${p.idPaciente}" value="${p.telefono_emergencia||''}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;background:white;margin-top:4px;box-sizing:border-box;"/>
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
  if (data.message) { alert('✅ Paciente actualizado'); abrirExpediente(idPaciente); }
  else alert('Error: ' + (data.error?.sqlMessage || 'No se pudo actualizar'));
}

// ── CERRAR SESIÓN ─────────────────────────────────────────────────────────────
function cerrarSesion() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  window.location.href = '/';
}

// ── INIT ──────────────────────────────────────────────────────────────────────
cargarMedicamentosActivos();
cargarStats();
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

// ── ESTADO GLOBAL ─────────────────────────────
let todasLasCitas   = [];
let fechaDia        = new Date();    // día actual en vista diaria
let fechaSemana     = new Date();    // semana actual en vista semanal
let diaSeleccionado = null;          // día seleccionado en vista semanal

// ── NAVEGACIÓN ────────────────────────────────
function nav(seccion, linkEl) {
  document.querySelectorAll('[id^="sec-"]').forEach(s => s.style.display = 'none');
  document.getElementById('sec-' + seccion).style.display = 'block';
  document.querySelectorAll('.nav-item').forEach(a => a.classList.remove('active'));
  if (linkEl) linkEl.classList.add('active');

  if (seccion === 'citas')                cargarCitas();
  if (seccion === 'consulta')             cargarConsultasRecientes();
  if (seccion === 'historial-consultas')  cargarHistorialConsultas();
  if (seccion === 'receta')               cargarRecetasRecientes();
  if (seccion === 'diagnostico')          cargarDiagnosticosRecientes();
  if (seccion === 'expediente')           iniciarBuscador();
  if (seccion === 'horario')              iniciarHorario();
}

// ── HELPERS ───────────────────────────────────
function estadoDot(estado) {
  const mapa = {
    'CONFIRMADA':  'confirmada',
    'PENDIENTE':   'pendiente',
    'EN ATENCION': 'en-atencion',
    'FINALIZADA':  'finalizada',
    'CANCELADA':   'cancelada',
  };
  const clave = mapa[estado] || 'pendiente';
  return `<span class="estado-dot estado-dot--${clave}">${estado}</span>`;
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

    todasLasCitas = Array.isArray(citas) ? citas : [];

    const hoy = new Date().toISOString().split('T')[0];
    const citasHoy = todasLasCitas.filter(c => c.fecha && String(c.fecha).startsWith(hoy));

    document.getElementById('s-citas').textContent     = citasHoy.length;
    document.getElementById('s-pacientes').textContent = Array.isArray(pacientes) ? pacientes.length : '–';
    document.getElementById('s-consultas').textContent = Array.isArray(consultas) ? consultas.length : '–';
    document.getElementById('s-recetas').textContent   = Array.isArray(recetas)   ? recetas.length   : '–';

    // ── AGENDA DIARIA — criterio 1 y 4
    document.getElementById('citas-preview').innerHTML = citasHoy.length
      ? citasHoy.slice(0,4).map(c => {
          const paciente = c.NombrePaciente
            ? `${c.NombrePaciente} ${c.ApellidosPaciente}`
            : `#${c.idPaciente}`;
          const hora = c.hora ? c.hora.substring(0,5) : '–';
          return `
            <tr>
              <td><strong>${hora}</strong></td>
              <td>${paciente}</td>
              <td>${c.motivo || '–'}</td>
              <td>${estadoDot(c.estado)}</td>
              <td>
                ${c.estado === 'CONFIRMADA' || c.estado === 'PENDIENTE'
                  ? `<button class="btn-tabla" onclick="abrirHistorialPaciente(${c.idCita}, ${c.idPaciente})">📋 Ver</button>`
                  : '–'}
              </td>
            </tr>`;
        }).join('')
      : '<tr><td colspan="5" style="text-align:center;color:var(--text-soft);padding:16px;">Sin citas para hoy</td></tr>';

    // ── HISTORIAL RECIENTE DE PACIENTES — criterio 2
    const pacientesRecientes = [...new Map(
      todasLasCitas
        .filter(c => c.NombrePaciente)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .map(c => [c.idPaciente, c])
    ).values()].slice(0, 4);

    document.getElementById('historial-pacientes-preview').innerHTML = pacientesRecientes.length
      ? pacientesRecientes.map(c => `
          <div class="resultado-item" onclick="irExpediente(${c.idPaciente})" style="cursor:pointer;">
            <div style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,var(--teal),var(--teal-light));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0;">
              ${(c.NombrePaciente || 'P')[0]}
            </div>
            <div style="flex:1;">
              <strong style="display:block;font-size:13px;color:var(--deep);">${c.NombrePaciente} ${c.ApellidosPaciente || ''}</strong>
              <span style="font-size:11.5px;color:var(--text-soft);">Última cita: ${c.fecha ? c.fecha.split('T')[0] : '–'} · ${c.estado}</span>
            </div>
            <span style="font-size:11.5px;color:var(--teal);font-weight:600;">Ver →</span>
          </div>`).join('')
      : '<p style="color:var(--text-soft);font-size:13px;padding:12px 0;">Sin pacientes recientes</p>';

    // ── CONSULTAS RECIENTES
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

// ── MODAL HISTORIAL PACIENTE — criterio 2 ─────
async function abrirHistorialPaciente(idCita, idPaciente) {
  document.getElementById('modal-historial-paciente').classList.add('active');
  document.getElementById('modal-historial-contenido').innerHTML =
    '<p style="text-align:center;color:var(--text-soft);padding:30px;">Cargando historial...</p>';

  // Botón Atender prellenado con la cita
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

    const paciente    = await pRes.json();
    const consultas   = await conRes.json();
    const diagnosticos= await diagRes.json();
    const recetas     = await recRes.json();

    const p = Array.isArray(paciente) ? paciente[0] : paciente;
    const ultimasConsultas   = Array.isArray(consultas)    ? consultas.slice(0,3)    : [];
    const ultimosDiag        = Array.isArray(diagnosticos) ? diagnosticos.slice(0,3) : [];
    const ultimasRecetas     = Array.isArray(recetas)      ? recetas.slice(0,3)      : [];

    document.getElementById('modal-historial-contenido').innerHTML = `
      <!-- Datos básicos del paciente -->
      <div style="display:flex;align-items:center;gap:14px;padding:14px;background:var(--cream);border-radius:14px;margin-bottom:18px;border:1px solid var(--border);">
        <div style="width:46px;height:46px;border-radius:12px;background:linear-gradient(135deg,var(--teal),var(--teal-light));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;flex-shrink:0;">
          ${(p?.Nombres || 'P')[0]}
        </div>
        <div>
          <strong style="display:block;font-size:14px;color:var(--deep);">${p?.Nombres || '–'} ${p?.Apellidos || ''}</strong>
          <span style="font-size:12px;color:var(--text-soft);">Exp: ${p?.numero_expediente || '–'} · Sangre: ${p?.tipo_sangre || 'N/A'} · ${p?.estado_paciente || '–'}</span>
        </div>
        ${p?.alergias || p?.observaciones_generales ? `
        <div style="margin-left:auto;background:rgba(200,50,50,0.07);border:1px solid rgba(200,50,50,0.15);border-radius:10px;padding:8px 12px;font-size:11.5px;color:#c03030;">
          ⚠️ ${p?.alergias ? 'Alergia: ' + p.alergias : ''} ${p?.observaciones_generales ? '· ' + p.observaciones_generales : ''}
        </div>` : ''}
      </div>

      <!-- Últimas 3 consultas -->
      <h4 style="font-size:12.5px;font-weight:700;color:var(--deep);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.06em;">🩺 Últimas Consultas</h4>
      <div class="historial-mini" style="margin-bottom:18px;">
        ${ultimasConsultas.length
          ? ultimasConsultas.map(c => `
            <div class="historial-mini__item">
              <h4>${c.fecha_consulta || '–'} · Cita #${c.idCita || '–'}</h4>
              <p>Peso: ${c.peso || '–'} kg · Presión: ${c.presion_arterial || '–'} · Temp: ${c.temperatura || '–'}°C</p>
              <p style="margin-top:4px;">${c.observaciones || 'Sin observaciones'}</p>
            </div>`).join('')
          : '<p style="color:var(--text-soft);font-size:12.5px;padding:8px 0;">Sin consultas registradas</p>'}
      </div>

      <!-- Últimos 3 diagnósticos -->
      <h4 style="font-size:12.5px;font-weight:700;color:var(--deep);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.06em;">🔬 Diagnósticos Recientes</h4>
      <div class="historial-mini" style="margin-bottom:18px;">
        ${ultimosDiag.length
          ? ultimosDiag.map(d => `
            <div class="historial-mini__item">
              <h4>Diagnóstico #${d.idDiagnostico} · ${d.fecha_diagnostico || '–'}</h4>
              <p>${d.descripcion || 'Sin descripción'}</p>
            </div>`).join('')
          : '<p style="color:var(--text-soft);font-size:12.5px;padding:8px 0;">Sin diagnósticos registrados</p>'}
      </div>

      <!-- Últimas 3 recetas -->
      <h4 style="font-size:12.5px;font-weight:700;color:var(--deep);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.06em;">💊 Recetas Recientes</h4>
      <div class="historial-mini">
        ${ultimasRecetas.length
          ? ultimasRecetas.map(r => `
            <div class="historial-mini__item">
              <h4>${r.medicamento} — ${r.dosis}</h4>
              <p>${r.frecuencia} · ${r.duracion || '–'} · ${r.indicaciones || ''}</p>
            </div>`).join('')
          : '<p style="color:var(--text-soft);font-size:12.5px;padding:8px 0;">Sin recetas registradas</p>'}
      </div>`;
  } catch {
    document.getElementById('modal-historial-contenido').innerHTML =
      '<p style="color:#c03030;text-align:center;padding:20px;">Error al cargar historial</p>';
  }
}

function cerrarModalHistorial() {
  document.getElementById('modal-historial-paciente').classList.remove('active');
}

// ── ACCESO RÁPIDO — criterio 3 ────────────────
function accesoCitaRapido(idCita, idPaciente) {
  nav('consulta', document.querySelector('[onclick*="consulta"]'));
  setTimeout(() => {
    document.getElementById('con-cita').value = idCita;
    fetch(`/api/historial?idPaciente=${idPaciente}`, { headers: H })
      .then(r => r.json())
      .then(data => {
        const h = Array.isArray(data) ? data[0] : data;
        if (h?.idHistorial) document.getElementById('con-historial').value = h.idHistorial;
      }).catch(() => {});
    // Cargar preconsulta si existe
    cargarPreconsulta(idCita);
  }, 100);
}

// ── PRECONSULTA — criterio 6 ──────────────────
// Carga datos de preconsulta de una consulta previa vinculada a la cita
async function cargarPreconsulta(idCita) {
  if (!idCita) return;
  const bloque = document.getElementById('bloque-preconsulta');
  const datos  = document.getElementById('preconsulta-datos');
  try {
    const res  = await fetch('/api/consultas', { headers: H });
    const list = await res.json();
    // Busca si existe una consulta de preconsulta para esta cita
    const pre  = Array.isArray(list)
      ? list.find(c => String(c.idCita) === String(idCita))
      : null;

    if (pre) {
      datos.innerHTML = `
        <div class="preconsulta-item">
          <div class="preconsulta-item__label">Peso</div>
          <div class="preconsulta-item__value">${pre.peso ? pre.peso + ' kg' : '–'}</div>
        </div>
        <div class="preconsulta-item">
          <div class="preconsulta-item__label">Presión Arterial</div>
          <div class="preconsulta-item__value">${pre.presion_arterial || '–'}</div>
        </div>
        <div class="preconsulta-item">
          <div class="preconsulta-item__label">Temperatura</div>
          <div class="preconsulta-item__value">${pre.temperatura ? pre.temperatura + '°C' : '–'}</div>
        </div>
        <div class="preconsulta-item">
          <div class="preconsulta-item__label">Altura</div>
          <div class="preconsulta-item__value">${pre.altura ? pre.altura + ' cm' : '–'}</div>
        </div>`;

      // Prellenar campos del formulario con los datos de preconsulta
      if (pre.peso)             document.getElementById('con-peso').value     = pre.peso;
      if (pre.presion_arterial) document.getElementById('con-presion').value  = pre.presion_arterial;
      if (pre.temperatura)      document.getElementById('con-temp').value     = pre.temperatura;
      if (pre.altura)           document.getElementById('con-altura').value   = pre.altura;

      bloque.style.display = 'block';
    } else {
      bloque.style.display = 'none';
    }
  } catch {
    bloque.style.display = 'none';
  }
}

// Ir al expediente desde historial reciente
function irExpediente(idPaciente) {
  nav('expediente', document.querySelector('[onclick*="expediente"]'));
  setTimeout(() => {
    iniciarBuscador().then(() => {
      document.getElementById('q-expediente').value = String(idPaciente);
      buscarExpediente();
    });
  }, 100);
}

// ── CITAS ─────────────────────────────────────
async function cargarCitas() {
  try {
    const res  = await fetch('/api/citas', { headers: H });
    const data = await res.json();
    todasLasCitas = Array.isArray(data) ? data : [];
    document.getElementById('tbody-citas').innerHTML = todasLasCitas.length
      ? todasLasCitas.map(c => {
          const paciente = c.NombrePaciente
            ? `${c.NombrePaciente} ${c.ApellidosPaciente}`
            : `#${c.idPaciente}`;
          return `
            <tr>
              <td>#${c.idCita}</td>
              <td>${c.fecha ? c.fecha.split('T')[0] : '–'}</td>
              <td>${c.hora ? c.hora.substring(0,5) : '–'}</td>
              <td>${paciente}</td>
              <td>${c.motivo || '–'}</td>
              <td>${estadoDot(c.estado)}</td>
              <td>
                ${c.estado === 'CONFIRMADA' || c.estado === 'PENDIENTE'
                  ? `<button class="btn-tabla" onclick="abrirHistorialPaciente(${c.idCita}, ${c.idPaciente})">📋 Ver</button>`
                  : '–'}
              </td>
            </tr>`;
        }).join('')
      : '<tr><td colspan="7" style="text-align:center;color:var(--text-soft);padding:20px;">Sin citas</td></tr>';
  } catch {
    document.getElementById('tbody-citas').innerHTML =
      '<tr><td colspan="7" style="text-align:center;color:#c03030;padding:20px;">Error al cargar</td></tr>';
  }
}

// ── HORARIO — criterio 5 ──────────────────────
async function iniciarHorario() {
  try {
    const res  = await fetch('/api/doctores', { headers: H });
    const data = await res.json();
    const doctores  = Array.isArray(data) ? data : [];
    const miDoctor  = doctores.find(d => d.idUsuario === usuario.id);

    if (miDoctor) {
      const hi = miDoctor.hora_inicio ? miDoctor.hora_inicio.substring(0,5) : '–';
      const hf = miDoctor.hora_fin    ? miDoctor.hora_fin.substring(0,5)    : '–';
      document.getElementById('horario-info').innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:20px;">
          <div style="background:var(--cream);border:1.5px solid var(--border);border-radius:14px;padding:18px;text-align:center;">
            <p style="font-size:10.5px;color:var(--text-soft);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Horario</p>
            <p style="font-family:'Playfair Display',serif;font-size:1.4rem;font-weight:700;color:var(--teal);">${hi} – ${hf}</p>
          </div>
          <div style="background:var(--cream);border:1.5px solid var(--border);border-radius:14px;padding:18px;text-align:center;">
            <p style="font-size:10.5px;color:var(--text-soft);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Consultorio</p>
            <p style="font-family:'Playfair Display',serif;font-size:1.2rem;font-weight:700;color:var(--deep);">${miDoctor.Consultorio || '–'}</p>
          </div>
          <div style="background:var(--cream);border:1.5px solid var(--border);border-radius:14px;padding:18px;text-align:center;">
            <p style="font-size:10.5px;color:var(--text-soft);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Especialidad</p>
            <p style="font-family:'Playfair Display',serif;font-size:1rem;font-weight:700;color:var(--deep);">${miDoctor.Especialidad || '–'}</p>
          </div>
          <div style="background:var(--cream);border:1.5px solid var(--border);border-radius:14px;padding:18px;text-align:center;">
            <p style="font-size:10.5px;color:var(--text-soft);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">N° Junta Médica</p>
            <p style="font-family:monospace;font-size:1rem;font-weight:700;color:var(--deep);">${miDoctor.numero_junta_medica || '–'}</p>
          </div>
        </div>`;
    }
  } catch { /* sin datos */ }

  // Iniciar vista diaria con hoy
  fechaDia = new Date();
  if (!todasLasCitas.length) {
    const res = await fetch('/api/citas', { headers: H }).catch(() => null);
    if (res) todasLasCitas = await res.json().catch(() => []);
  }
  renderVistaDia();
  renderVistaSemanal();
}

function cambiarVistaHorario(vista) {
  document.getElementById('vista-diaria').style.display  = vista === 'diaria'  ? 'block' : 'none';
  document.getElementById('vista-semanal').style.display = vista === 'semanal' ? 'block' : 'none';
  document.getElementById('tab-diaria').classList.toggle('active',  vista === 'diaria');
  document.getElementById('tab-semanal').classList.toggle('active', vista === 'semanal');
}

// Vista diaria — navegar entre días
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
    ? citasDia
        .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''))
        .map(c => {
          const paciente = c.NombrePaciente
            ? `${c.NombrePaciente} ${c.ApellidosPaciente}`
            : `#${c.idPaciente}`;
          return `
            <tr>
              <td><strong>${c.hora ? c.hora.substring(0,5) : '–'}</strong></td>
              <td>${paciente}</td>
              <td>${c.motivo || '–'}</td>
              <td>${estadoDot(c.estado)}</td>
              <td>
                ${c.estado === 'CONFIRMADA' || c.estado === 'PENDIENTE'
                  ? `<button class="btn-tabla" onclick="abrirHistorialPaciente(${c.idCita}, ${c.idPaciente})">📋 Ver</button>`
                  : '–'}
              </td>
            </tr>`;
        }).join('')
    : '<tr><td colspan="5" style="text-align:center;color:var(--text-soft);padding:20px;">Sin citas para este día</td></tr>';
}

// Vista semanal — navegar entre semanas
function navegarSemana(delta) {
  fechaSemana.setDate(fechaSemana.getDate() + delta * 7);
  renderVistaSemanal();
}

function renderVistaSemanal() {
  const hoy       = new Date();
  const lunes     = new Date(fechaSemana);
  lunes.setDate(lunes.getDate() - (lunes.getDay() === 0 ? 6 : lunes.getDay() - 1));

  const dias = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  const domingo = new Date(lunes);
  domingo.setDate(domingo.getDate() + 6);

  document.getElementById('titulo-semana').textContent =
    lunes.toLocaleDateString('es-SV', { day:'numeric', month:'short' }) + ' – ' +
    domingo.toLocaleDateString('es-SV', { day:'numeric', month:'short', year:'numeric' });

  const tabsHTML = dias.map((nombre, i) => {
    const dia = new Date(lunes);
    dia.setDate(dia.getDate() + i);
    const fechaStr  = dia.toISOString().split('T')[0];
    const esHoy     = fechaStr === hoy.toISOString().split('T')[0];
    const seleccionado = diaSeleccionado === fechaStr;
    const tieneCitas = todasLasCitas.some(c => c.fecha && String(c.fecha).startsWith(fechaStr));

    return `
      <div class="dia-tab ${esHoy ? 'hoy' : ''} ${seleccionado ? 'active' : ''}"
           onclick="seleccionarDia('${fechaStr}')">
        <span class="dia-nombre">${nombre}</span>
        <span class="dia-num">${dia.getDate()}</span>
        ${tieneCitas ? '<span class="dia-badge"></span>' : '<span style="width:6px;height:6px;"></span>'}
      </div>`;
  }).join('');

  document.getElementById('semana-tabs').innerHTML = tabsHTML;

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
    ? citasDia
        .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''))
        .map(c => {
          const paciente = c.NombrePaciente
            ? `${c.NombrePaciente} ${c.ApellidosPaciente}`
            : `#${c.idPaciente}`;
          return `
            <tr>
              <td><strong>${c.hora ? c.hora.substring(0,5) : '–'}</strong></td>
              <td>${paciente}</td>
              <td>${c.motivo || '–'}</td>
              <td>${estadoDot(c.estado)}</td>
              <td>
                ${c.estado === 'CONFIRMADA' || c.estado === 'PENDIENTE'
                  ? `<button class="btn-tabla" onclick="abrirHistorialPaciente(${c.idCita}, ${c.idPaciente})">📋 Ver</button>`
                  : '–'}
              </td>
            </tr>`;
        }).join('')
    : '<tr><td colspan="5" style="text-align:center;color:var(--text-soft);padding:16px;">Sin citas para este día</td></tr>';
}

// ── HISTORIAL CONSULTAS ───────────────────────
async function cargarHistorialConsultas() {
  try {
    const res  = await fetch('/api/consultas', { headers: H });
    const data = await res.json();
    document.getElementById('tbody-historial-consultas').innerHTML = Array.isArray(data) && data.length
      ? data.map(c => `
          <tr>
            <td>#${c.idConsulta}</td>
            <td>${c.fecha_consulta || '–'}</td>
            <td>#${c.idCita || '–'}</td>
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
    document.getElementById('bloque-preconsulta').style.display = 'none';
    cargarConsultasRecientes();
    cargarStats();
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

let listaMedsActivos = [];

// Cargar al inicio
async function cargarMedicamentosActivos() {
  try {
    const res = await fetch('/api/medicamentos/activos', { headers: H });
    listaMedsActivos = await res.json();
  } catch { /* sin datos */ }
}

// ── AUTOCOMPLETADO MEDICAMENTOS EN RECETA — criterio 2
function buscarMedicamentoReceta() {
  const input = document.getElementById('rec-medicamento-nombre');
  const sug   = document.getElementById('sug-medicamento');
  const q     = input.value.toLowerCase().trim();

  document.getElementById('rec-medicamento-id').value = '';

  if (!q) { sug.style.display = 'none'; return; }

  const lista = Array.isArray(listaMedsActivos)
    ? listaMedsActivos.filter(m => m.nombre.toLowerCase().includes(q))
    : [];

  sug.innerHTML = lista.length
    ? lista.map(m => `
        <div class="autocomplete-item" onclick="seleccionarMedicamento(${m.idMedicamento}, '${m.nombre.replace(/'/g,"\\'")}', '${m.unidad_medida}', ${m.stock_actual})">
          <strong>${m.nombre}</strong>
          <span>Stock: ${m.stock_actual} ${m.unidad_medida} · $${parseFloat(m.precio_unitario || 0).toFixed(2)}</span>
        </div>`).join('')
    : '<div class="autocomplete-item">Sin resultados con stock disponible</div>';

  sug.style.display = 'block';
}

function seleccionarMedicamento(id, nombre, unidad, stock) {
  document.getElementById('rec-medicamento-nombre').value = nombre;
  document.getElementById('rec-medicamento-id').value     = id;
  document.getElementById('sug-medicamento').style.display = 'none';
  // Mostrar stock disponible
  const infoStock = document.getElementById('rec-stock-info');
  if (infoStock) {
    infoStock.textContent = `Stock disponible: ${stock} ${unidad}`;
    infoStock.style.display = 'block';
  }
}

// ── GUARDAR RECETA — criterio 4 (descuenta stock automáticamente)
async function guardarReceta() {
  const idMedicamento = parseInt(document.getElementById('rec-medicamento-id').value);
  const cantidad      = parseInt(document.getElementById('rec-cantidad').value) || 1;

  if (!idMedicamento) {
    alert('⚠️ Selecciona un medicamento del inventario');
    return;
  }

  const payload = {
    medicamento:   document.getElementById('rec-medicamento-nombre').value,
    dosis:         document.getElementById('rec-dosis').value,
    frecuencia:    document.getElementById('rec-frecuencia').value,
    duracion:      document.getElementById('rec-duracion').value,
    indicaciones:  document.getElementById('rec-indicaciones').value,
    idDiagnostico: parseInt(document.getElementById('rec-diagnostico').value) || null,
    idFactura:     parseInt(document.getElementById('rec-factura').value)     || null,
    idMedicamento,
    cantidad,
  };

  const res  = await fetch('/api/recetas', { method:'POST', headers: H, body: JSON.stringify(payload) });
  const data = await res.json();

  if (data.id || data.message) {
    // Descontar stock automáticamente — criterio 4
    await fetch(`/api/medicamentos/${idMedicamento}/descontar`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ cantidad, idReceta: data.id })
    });

    alert('✅ Receta emitida y stock descontado correctamente');
    ['rec-medicamento-nombre','rec-dosis','rec-frecuencia','rec-duracion',
     'rec-indicaciones','rec-diagnostico','rec-factura','rec-cantidad']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    document.getElementById('rec-medicamento-id').value = '';
    const infoStock = document.getElementById('rec-stock-info');
    if (infoStock) infoStock.style.display = 'none';
    cargarRecetasRecientes();
    // Recargar lista de medicamentos para reflejar nuevo stock
    cargarMedicamentosActivos();
  } else {
    alert('Error: ' + (data.error?.sqlMessage || 'No se pudo emitir la receta'));
  }
}

// Cerrar sugerencias al hacer clic fuera
document.addEventListener('click', (e) => {
  const input = document.getElementById('rec-medicamento-nombre');
  const sug   = document.getElementById('sug-medicamento');
  if (input && sug && !input.contains(e.target) && !sug.contains(e.target)) {
    sug.style.display = 'none';
  }
});

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
    const citasPaciente   = Array.isArray(citas)   ? citas.filter(c => c.idPaciente === idPaciente)   : [];
    const recetasPaciente = Array.isArray(recetas) ? recetas.filter(r => r.idPaciente === idPaciente) : [];

    cont.innerHTML = `
      <button onclick="volverBuscador()" style="margin-bottom:16px;padding:8px 16px;border:1.5px solid var(--border);border-radius:10px;background:transparent;color:var(--text-soft);cursor:pointer;font-size:13px;">← Volver</button>
      <div style="background:var(--cream);border:1.5px solid var(--border);border-radius:16px;padding:24px;margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h3 style="font-size:15px;font-weight:700;color:var(--deep);">👤 Datos del Paciente</h3>
          <button onclick="editarPaciente(${p.idPaciente})" style="padding:7px 14px;border:none;border-radius:9px;background:linear-gradient(135deg,var(--teal),var(--teal-light));color:#fff;font-size:12px;font-weight:600;cursor:pointer;">✏️ Editar</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;">
          <div><span style="color:var(--text-soft);">Nombre:</span> <strong>${p.Nombres || '–'} ${p.Apellidos || ''}</strong></div>
          <div><span style="color:var(--text-soft);">Expediente:</span> <strong>${p.numero_expediente || '–'}</strong></div>
          <div><span style="color:var(--text-soft);">Email:</span> <strong>${p.Email || '–'}</strong></div>
          <div><span style="color:var(--text-soft);">Tipo de sangre:</span> <strong>${p.tipo_sangre || 'N/A'}</strong></div>
          <div><span style="color:var(--text-soft);">Estado:</span> <strong>${p.estado_paciente || '–'}</strong></div>
          <div><span style="color:var(--text-soft);">Fecha registro:</span> <strong>${p.fecha_registro ? p.fecha_registro.split('T')[0] : '–'}</strong></div>
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
        <h3 style="font-size:15px;font-weight:700;color:var(--deep);margin-bottom:14px;">📅 Citas</h3>
        ${citasPaciente.length ? `
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead><tr style="color:var(--text-soft);font-size:11.5px;">
              <th style="text-align:left;padding:6px 0;">Fecha</th><th style="text-align:left;padding:6px 0;">Hora</th>
              <th style="text-align:left;padding:6px 0;">Motivo</th><th style="text-align:left;padding:6px 0;">Estado</th>
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
      <div style="background:var(--cream);border:1.5px solid var(--border);border-radius:16px;padding:24px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <h3 style="font-size:15px;font-weight:700;color:var(--deep);">💊 Recetas</h3>
          <button onclick="mostrarFormReceta(${p.idPaciente})" style="padding:7px 14px;border:none;border-radius:9px;background:linear-gradient(135deg,var(--teal),var(--teal-light));color:#fff;font-size:12px;font-weight:600;cursor:pointer;">+ Agregar</button>
        </div>
        <div id="recetas-expediente-${p.idPaciente}">
          ${recetasPaciente.length ? recetasPaciente.map(r => `
            <div style="padding:10px 0;border-bottom:1px solid rgba(42,107,94,0.07);font-size:13px;">
              <strong>${r.medicamento}</strong> — ${r.dosis} · ${r.frecuencia} · ${r.duracion || '–'}
            </div>`).join('') : '<p style="color:var(--text-soft);font-size:13px;">Sin recetas</p>'}
        </div>
        <div id="form-receta-${p.idPaciente}" style="display:none;margin-top:16px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <input type="number" id="nr-diagnostico-${p.idPaciente}" placeholder="ID Diagnóstico" style="padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;background:white;"/>
            <input type="number" id="nr-factura-${p.idPaciente}" placeholder="ID Factura" style="padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;background:white;"/>
            <input type="text" id="nr-medicamento-${p.idPaciente}" placeholder="Medicamento" style="padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;background:white;"/>
            <input type="text" id="nr-dosis-${p.idPaciente}" placeholder="Dosis" style="padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;background:white;"/>
            <input type="text" id="nr-frecuencia-${p.idPaciente}" placeholder="Frecuencia" style="padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;background:white;"/>
            <input type="text" id="nr-duracion-${p.idPaciente}" placeholder="Duración" style="padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;background:white;"/>
            <textarea id="nr-indicaciones-${p.idPaciente}" placeholder="Indicaciones..." style="padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;background:white;grid-column:span 2;"></textarea>
          </div>
          <button onclick="guardarRecetaExpediente(${p.idPaciente})" style="margin-top:10px;padding:10px 20px;border:none;border-radius:10px;background:linear-gradient(135deg,var(--teal),var(--teal-light));color:#fff;font-weight:600;font-size:13px;cursor:pointer;">Guardar</button>
          <button onclick="document.getElementById('form-receta-${p.idPaciente}').style.display='none'" style="margin-top:10px;margin-left:8px;padding:10px 20px;border:1.5px solid var(--border);border-radius:10px;background:transparent;color:var(--text-soft);font-size:13px;cursor:pointer;">Cancelar</button>
        </div>
      </div>
      <div id="form-editar-${p.idPaciente}" style="display:none;background:var(--cream);border:1.5px solid var(--border);border-radius:16px;padding:24px;margin-top:16px;">
        <h3 style="font-size:15px;font-weight:700;color:var(--deep);margin-bottom:14px;">✏️ Editar Paciente</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label style="font-size:11.5px;color:var(--text-soft);font-weight:600;">Tipo de Sangre</label>
            <select id="ep-sangre-${p.idPaciente}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;background:white;margin-top:4px;">
              ${['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(s => `<option value="${s}" ${p.tipo_sangre === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:11.5px;color:var(--text-soft);font-weight:600;">Estado</label>
            <select id="ep-estado-${p.idPaciente}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;background:white;margin-top:4px;">
              <option value="ACTIVO" ${p.estado_paciente === 'ACTIVO' ? 'selected' : ''}>ACTIVO</option>
              <option value="INACTIVO" ${p.estado_paciente === 'INACTIVO' ? 'selected' : ''}>INACTIVO</option>
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
        </div>
        <div style="margin-top:12px;">
          <button onclick="guardarEdicionPaciente(${p.idPaciente})" style="padding:10px 20px;border:none;border-radius:10px;background:linear-gradient(135deg,var(--teal),var(--teal-light));color:#fff;font-weight:600;font-size:13px;cursor:pointer;">Guardar</button>
          <button onclick="document.getElementById('form-editar-${p.idPaciente}').style.display='none'" style="margin-left:8px;padding:10px 20px;border:1.5px solid var(--border);border-radius:10px;background:transparent;color:var(--text-soft);font-size:13px;cursor:pointer;">Cancelar</button>
        </div>
      </div>`;
  } catch {
    cont.innerHTML = '<p style="text-align:center;color:#c03030;padding:24px;">Error al cargar</p>';
  }
}

function volverBuscador() {
  document.getElementById('resultados-expediente').innerHTML =
    '<p style="text-align:center;color:var(--text-soft);padding:24px;font-size:13px;">Escribe para buscar un expediente...</p>';
  document.getElementById('q-expediente').value = '';
}

function editarPaciente(id) {
  const f = document.getElementById(`form-editar-${id}`);
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
}

function mostrarFormReceta(id) {
  const f = document.getElementById(`form-receta-${id}`);
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
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
  if (data.message) {
    alert('✅ Paciente actualizado');
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
    alert('✅ Receta agregada');
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
cargarMedicamentosActivos();
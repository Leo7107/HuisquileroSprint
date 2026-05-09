@ -30,47 +30,60 @@ function nav(seccion, linkEl) {
  document.querySelectorAll('.nav-item').forEach(a => a.classList.remove('active'));
  if (linkEl) linkEl.classList.add('active');

  if (seccion === 'citas')     cargarCitas();
  if (seccion === 'pacientes') cargarPacientesRecientes();
  if (seccion === 'buscar')    iniciarBuscador();
  if (seccion === 'medicos')   cargarMedicos();
  if (seccion === 'citas')        cargarCitas();
  if (seccion === 'pacientes')    cargarPacientesRecientes();
  if (seccion === 'buscar')       iniciarBuscador();
  if (seccion === 'medicos')      cargarMedicos();
  if (seccion === 'preconsulta')  preIniciarSeccion();
}

// ── STATS ─────────────────────────────────────
async function cargarStats() {
  try {
    const [cRes, pRes] = await Promise.all([
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

    document.getElementById('s-citas-hoy').textContent = citasHoy.length;
    document.getElementById('s-pacientes').textContent = Array.isArray(pacientes) ? pacientes.length : '—';
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
          const paciente = c.NombrePaciente
            ? `${c.NombrePaciente} ${c.ApellidosPaciente}`
            : `#${c.idPaciente}`;
          const doctor = c.NombreDoctor
            ? `${c.NombreDoctor} ${c.ApellidosDoctor}`
            : `#${c.idDoctor}`;
          const paciente = c.NombrePaciente ? `${c.NombrePaciente} ${c.ApellidosPaciente}` : `#${c.idPaciente}`;
          const doctor   = c.NombreDoctor   ? `${c.NombreDoctor} ${c.ApellidosDoctor}`     : `#${c.idDoctor}`;
          const tienePre = idsConPreconsulta.includes(String(c.idCita));
          return `
            <tr>
              <td>${c.hora || '—'}</td>
              <td>${paciente}</td>
              <td>${doctor}</td>
              <td><span class="badge badge--${c.estado === 'CONFIRMADA' ? 'activo' : 'pendiente'}">${c.estado}</span></td>
              <td>
                <span class="badge badge--${['CONFIRMADA','FINALIZADA'].includes(c.estado) ? 'activo' : 'pendiente'}">${c.estado}</span>
                ${tienePre ? '<span style="font-size:10px;color:var(--teal);margin-left:4px;">📋</span>' : ''}
              </td>
            </tr>`;
        }).join('')
      : '<tr><td colspan="4" style="text-align:center;color:var(--text-soft);padding:16px;">Sin citas para hoy</td></tr>';
  } catch { }
  } catch {}
}

// ── CITAS ─────────────────────────────────────
@ -95,12 +108,8 @@ function renderCitas(lista) {
    return;
  }
  document.getElementById('tbody-citas').innerHTML = lista.map(c => {
    const paciente = c.NombrePaciente
      ? `${c.NombrePaciente} ${c.ApellidosPaciente}`
      : `#${c.idPaciente}`;
    const doctor = c.NombreDoctor
      ? `${c.NombreDoctor} ${c.ApellidosDoctor}`
      : `#${c.idDoctor}`;
    const paciente = c.NombrePaciente ? `${c.NombrePaciente} ${c.ApellidosPaciente}` : `#${c.idPaciente}`;
    const doctor   = c.NombreDoctor   ? `${c.NombreDoctor} ${c.ApellidosDoctor}`     : `#${c.idDoctor}`;
    return `
      <tr>
        <td>#${c.idCita}</td>
@ -129,22 +138,20 @@ function setTabCitas(estado, btn) {

async function cancelarCita(id) {
  if (!confirm('¿Cancelar esta cita?')) return;
  await fetch(`/api/citas/${id}`, {
    method: 'PUT', headers: H, body: JSON.stringify({ estado: 'CANCELADA' })
  });
  await fetch(`/api/citas/${id}`, { method:'PUT', headers:H, body:JSON.stringify({ estado:'CANCELADA' }) });
  cargarCitas();
}

// ── MODAL CITA ────────────────────────────────
function abrirModalCita() {
  document.getElementById('modal-cita-titulo').textContent  = 'Nueva Cita';
  document.getElementById('cita-id').value                  = '';
  document.getElementById('modal-cita-titulo').textContent = 'Nueva Cita';
  document.getElementById('cita-id').value                 = '';
  ['fecha','hora','motivo'].forEach(f => document.getElementById('cita-' + f).value = '');
  document.getElementById('cita-paciente').value            = '';
  document.getElementById('cita-paciente-nombre').value     = '';
  document.getElementById('cita-doctor').value              = '';
  document.getElementById('cita-doctor-nombre').value       = '';
  document.getElementById('cita-estado').value              = 'PENDIENTE';
  document.getElementById('cita-paciente').value       = '';
  document.getElementById('cita-paciente-nombre').value = '';
  document.getElementById('cita-doctor').value         = '';
  document.getElementById('cita-doctor-nombre').value  = '';
  document.getElementById('cita-estado').value         = 'PENDIENTE';
  document.getElementById('modal-cita').classList.add('active');
}

@ -176,97 +183,61 @@ async function guardarCita() {
  };
  const url    = id ? `/api/citas/${id}` : '/api/citas';
  const method = id ? 'PUT' : 'POST';
  const res    = await fetch(url, { method, headers: H, body: JSON.stringify(payload) });
  const res    = await fetch(url, { method, headers:H, body:JSON.stringify(payload) });
  const data   = await res.json();

  if (res.status === 409) {
    alert('⚠️ ' + data.error);
    return;
  }

  if (data.id || data.message) {
    cerrarModalCita();
    cargarCitas();
  } else {
    alert('Error al guardar cita: ' + (data.error?.sqlMessage || data.error || 'Revisa los datos'));
  }
  if (res.status === 409) { alert('⚠️ ' + data.error); return; }
  if (data.id || data.message) { cerrarModalCita(); cargarCitas(); }
  else alert('Error al guardar cita: ' + (data.error?.sqlMessage || data.error || 'Revisa los datos'));
}

// ── PACIENTES ─────────────────────────────────
async function cargarPacientesRecientes() {
  try {
    const res = await fetch('/api/pacientes', { headers: H });
    const res   = await fetch('/api/pacientes', { headers: H });
    const lista = await res.json();

    const recientes = Array.isArray(lista) ? lista.slice(-6).reverse() : [];

    document.getElementById('lista-recientes').innerHTML = recientes.length
      ? recientes.map(p => `
        <div style="padding:10px 0;border-bottom:1px solid rgba(0,0,0,0.05);">
          <strong>${p.Nombres || ''} ${p.Apellidos || ''}</strong><br>
          <span style="font-size:12px;color:#666;">
            Expediente: ${p.numero_expediente} | ID: ${p.idPaciente}
          </span>
        </div>
      `).join('')
          <div style="padding:10px 0;border-bottom:1px solid rgba(0,0,0,0.05);">
            <strong>${p.Nombres || ''} ${p.Apellidos || ''}</strong><br>
            <span style="font-size:12px;color:#666;">Expediente: ${p.numero_expediente} | ID: ${p.idPaciente}</span>
          </div>`).join('')
      : '<p>Sin pacientes registrados.</p>';

  } catch (e) {
    console.error(e);
  }
  } catch (e) { console.error(e); }
}

async function buscarUsuarioPaciente() {
  const input = document.getElementById('pac-usuario-nombre');
  const input     = document.getElementById('pac-usuario-nombre');
  const sugerencias = document.getElementById('sugerencias-usuario-paciente');
  const q = input.value.toLowerCase().trim();

  document.getElementById('pac-usuario').value = '';

  if (!q) { 
    sugerencias.style.display = 'none'; 
    return; 
  }

  if (!q) { sugerencias.style.display = 'none'; return; }
  try {
    const res = await fetch('/api/usuarios', { headers: H });
    const res     = await fetch('/api/usuarios', { headers: H });
    const usuarios = await res.json();

    // 👇 SOLO pacientes (rol)
    const soloPacientes = usuarios.filter(u => u.idRol === 30001);

    // 👇 FILTRAR LOS QUE NO TIENEN EXPEDIENTE
    const resPac = await fetch('/api/pacientes', { headers: H });
    const resPac  = await fetch('/api/pacientes', { headers: H });
    const pacientesConExp = await resPac.json();

    const idsConExp = pacientesConExp.map(p => p.idUsuario);

    const idsConExp  = pacientesConExp.map(p => p.idUsuario);
    const disponibles = soloPacientes.filter(u => !idsConExp.includes(u.idUsuario));

    const filtrados = disponibles.filter(u =>
      (`${u.Nombres || ''} ${u.Apellidos || ''}`).toLowerCase().includes(q)
    );

    const filtrados   = disponibles.filter(u =>
      (`${u.Nombres || ''} ${u.Apellidos || ''}`).toLowerCase().includes(q));
    sugerencias.innerHTML = filtrados.length
      ? filtrados.map(u => `
          <div class="autocomplete-item"
            onclick="seleccionarUsuarioParaPaciente(${u.idUsuario}, '${(u.Nombres + ' ' + u.Apellidos).replace(/'/g, "\\'")}')">
            onclick="seleccionarUsuarioParaPaciente(${u.idUsuario}, '${(u.Nombres+' '+u.Apellidos).replace(/'/g,"\\'")}')">
            <strong>${u.Nombres} ${u.Apellidos}</strong>
            <span>Sin expediente</span>
          </div>
        `).join('')
          </div>`).join('')
      : '<div class="autocomplete-item">Sin resultados</div>';

    sugerencias.style.display = 'block';

  } catch (e) {
    console.error(e);
  }
  } catch (e) { console.error(e); }
}

function seleccionarUsuarioParaPaciente(id, nombreCompleto) {
  document.getElementById('pac-usuario-nombre').value = nombreCompleto;
  document.getElementById('pac-usuario').value = id;
  document.getElementById('pac-usuario').value        = id;
  document.getElementById('sugerencias-usuario-paciente').style.display = 'none';
}

@ -282,11 +253,11 @@ async function registrarPaciente() {
    estado_paciente:         document.getElementById('pac-estado').value,
    idUsuario:               parseInt(document.getElementById('pac-usuario').value),
  };
  const res  = await fetch('/api/pacientes', { method:'POST', headers: H, body: JSON.stringify(payload) });
  const res  = await fetch('/api/pacientes', { method:'POST', headers:H, body:JSON.stringify(payload) });
  const data = await res.json();
  if (data.id) {
    alert('✅ Paciente registrado correctamente');
    ['exp','contacto','parentesco','obs','usuario', 'usuario-nombre'].forEach(f =>
    ['exp','contacto','parentesco','obs','usuario','usuario-nombre'].forEach(f =>
      document.getElementById('pac-' + f).value = '');
    document.getElementById('pac-sangre').value = '';
    cargarPacientesRecientes();
@ -302,33 +273,26 @@ let todosPacientes = [];

async function iniciarBuscador() {
  try {
    const res = await fetch('/api/pacientes', { headers: H });
    const res  = await fetch('/api/pacientes', { headers: H });
    todosPacientes = await res.json();
  } catch { }
  } catch {}
}

function buscarPaciente() {
  const q = document.getElementById('q-global').value.toLowerCase().trim();
  const q    = document.getElementById('q-global').value.toLowerCase().trim();
  const cont = document.getElementById('resultados-busqueda');

  if (!q) {
    cont.innerHTML = '<p style="text-align:center;color:gray;">Escribe para buscar...</p>';
    return;
  }

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
      </div>
    `).join('')
        <div class="resultado-item">
          <strong>${p.Nombres} ${p.Apellidos}</strong><br>
          <span>Exp: ${p.numero_expediente} | ID: ${p.idPaciente}</span>
        </div>`).join('')
    : `<p style="text-align:center;color:gray;">No se encontró "${q}"</p>`;
}

@ -339,23 +303,21 @@ let listaDoctores  = [];
async function cargarListasAutocompletado() {
  try {
    const [pRes, dRes] = await Promise.all([
      fetch('/api/pacientes',         { headers: H }),
      fetch('/api/pacientes',        { headers: H }),
      fetch('/api/doctores/activos', { headers: H }),
    ]);
    listaPacientes = await pRes.json();
    listaDoctores  = await dRes.json();
  } catch { }
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
@ -365,8 +327,7 @@ function buscarAutocompletado(tipo) {
      : [];
    sugerencias.innerHTML = lista.length
      ? lista.map(p => `
          <div class="autocomplete-item"
            onclick="seleccionar('paciente', ${p.idPaciente}, '${p.Nombres || ''} ${p.Apellidos || ''}')">
          <div class="autocomplete-item" onclick="seleccionar('paciente', ${p.idPaciente}, '${p.Nombres || ''} ${p.Apellidos || ''}')">
            <strong>${p.Nombres || ''} ${p.Apellidos || ''}</strong>
            <span>Exp: ${p.numero_expediente} · ${p.estado_paciente}</span>
          </div>`).join('')
@ -381,14 +342,12 @@ function buscarAutocompletado(tipo) {
      : [];
    sugerencias.innerHTML = lista.length
      ? lista.map(d => `
          <div class="autocomplete-item"
            onclick="seleccionar('doctor', ${d.idDoctor}, '${d.Nombres || ''} ${d.Apellidos || ''}')">
          <div class="autocomplete-item" onclick="seleccionar('doctor', ${d.idDoctor}, '${d.Nombres || ''} ${d.Apellidos || ''}')">
            <strong>${d.Nombres || ''} ${d.Apellidos || ''}</strong>
            <span>${d.Especialidad}</span>
          </div>`).join('')
      : '<div class="autocomplete-item">Sin resultados</div>';
  }

  sugerencias.style.display = 'block';
}

@ -405,33 +364,26 @@ async function cargarUsuariosDoctores() {
  try {
    const res   = await fetch('/api/usuarios', { headers: H });
    const todos = await res.json();
    listaUsuariosDoctores = Array.isArray(todos)
      ? todos.filter(u => u.idRol === 30002)
      : [];
  } catch { }
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
        <div class="autocomplete-item"
          onclick="seleccionarUsuarioDoctor(${u.idUsuario}, '${u.Nombres || ''} ${u.Apellidos || ''}')">
        <div class="autocomplete-item" onclick="seleccionarUsuarioDoctor(${u.idUsuario}, '${u.Nombres || ''} ${u.Apellidos || ''}')">
          <strong>${u.Nombres || ''} ${u.Apellidos || ''}</strong>
          <span>${u.Email}</span>
        </div>`).join('')
    : '<div class="autocomplete-item">Sin resultados</div>';

  sugerencias.style.display = 'block';
}

@ -445,22 +397,17 @@ document.addEventListener('click', (e) => {
  ['paciente','doctor'].forEach(tipo => {
    const input = document.getElementById(`cita-${tipo}-nombre`);
    const sug   = document.getElementById(`sugerencias-${tipo}`);
    if (input && sug && !input.contains(e.target) && !sug.contains(e.target)) {
    if (input && sug && !input.contains(e.target) && !sug.contains(e.target))
      sug.style.display = 'none';
    }
  });

  const inputMd = document.getElementById('md-usuario-nombre');
  const sugMd   = document.getElementById('sugerencias-usuario-doctor');
  if (inputMd && sugMd && !inputMd.contains(e.target) && !sugMd.contains(e.target)) {
  if (inputMd && sugMd && !inputMd.contains(e.target) && !sugMd.contains(e.target))
    sugMd.style.display = 'none';
  }

  const inputPac = document.getElementById('pac-usuario-nombre');
  const sugPac = document.getElementById('sugerencias-usuario-paciente');
  if (inputPac && sugPac && !inputPac.contains(e.target) && !sugPac.contains(e.target)) {
  const sugPac   = document.getElementById('sugerencias-usuario-paciente');
  if (inputPac && sugPac && !inputPac.contains(e.target) && !sugPac.contains(e.target))
    sugPac.style.display = 'none';
  }
});

// ── MÉDICOS ───────────────────────────────────
@ -486,7 +433,7 @@ function renderMedicos(lista) {
  }
  document.getElementById('tbody-medicos').innerHTML = lista.map(d => {
    const esActivo = d.Estado === 'ACTIVO';
    const horario = (d.hora_inicio && d.hora_fin)
    const horario  = (d.hora_inicio && d.hora_fin)
      ? `<span class="horario-chip">🕐 ${d.hora_inicio.substring(0,5)} – ${d.hora_fin.substring(0,5)}</span>`
      : (d.Horario || '<span style="color:var(--text-soft);font-size:12px;">Sin horario</span>');
    return `
@ -499,11 +446,8 @@ function renderMedicos(lista) {
        <td><span class="badge-estado--${esActivo ? 'activo' : 'inactivo'}">${d.Estado}</span></td>
        <td>
          <div class="action-icons">
            <button class="icon-btn icon-btn--edit" title="Editar"
              onclick='abrirModalEditarMedico(${JSON.stringify(d)})'>✏️</button>
            <button class="icon-btn icon-btn--toggle"
              title="${esActivo ? 'Desactivar' : 'Activar'}"
              onclick="toggleMedico(${d.idDoctor}, ${esActivo})">
            <button class="icon-btn icon-btn--edit" title="Editar" onclick='abrirModalEditarMedico(${JSON.stringify(d)})'>✏️</button>
            <button class="icon-btn icon-btn--toggle" title="${esActivo ? 'Desactivar' : 'Activar'}" onclick="toggleMedico(${d.idDoctor}, ${esActivo})">
              ${esActivo ? '🔴' : '🟢'}
            </button>
          </div>
@ -516,15 +460,13 @@ function setTabMedicos(filtro, btn) {
  tabMedicActual = filtro;
  document.querySelectorAll('#sec-medicos .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const lista = filtro === 'todos' ? todosMedicos
    : todosMedicos.filter(d => d.Estado === filtro);
  const lista = filtro === 'todos' ? todosMedicos : todosMedicos.filter(d => d.Estado === filtro);
  renderMedicos(lista);
}

function filtrarMedicos() {
  const q = document.getElementById('q-medicos').value.toLowerCase();
  const base = tabMedicActual === 'todos' ? todosMedicos
    : todosMedicos.filter(d => d.Estado === tabMedicActual);
  const q    = document.getElementById('q-medicos').value.toLowerCase();
  const base = tabMedicActual === 'todos' ? todosMedicos : todosMedicos.filter(d => d.Estado === tabMedicActual);
  renderMedicos(base.filter(d =>
    (`${d.Nombres || ''} ${d.Apellidos || ''}`).toLowerCase().includes(q) ||
    (d.Especialidad        || '').toLowerCase().includes(q) ||
@ -533,32 +475,32 @@ function filtrarMedicos() {
}

function abrirModalMedico() {
  document.getElementById('modal-medico-titulo').textContent  = 'Nuevo Médico';
  document.getElementById('md-id').value                      = '';
  document.getElementById('md-especialidad').value            = '';
  document.getElementById('md-junta').value                   = '';
  document.getElementById('md-consultorio').value             = '';
  document.getElementById('md-telefono').value                = '';
  document.getElementById('md-hora-inicio').value             = '';
  document.getElementById('md-hora-fin').value                = '';
  document.getElementById('md-estado').value                  = 'ACTIVO';
  document.getElementById('md-usuario').value                 = '';
  document.getElementById('md-usuario-nombre').value          = '';
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
  document.getElementById('modal-medico-titulo').textContent  = 'Editar Médico';
  document.getElementById('md-id').value                      = d.idDoctor;
  document.getElementById('md-especialidad').value            = d.Especialidad        || '';
  document.getElementById('md-junta').value                   = d.numero_junta_medica || '';
  document.getElementById('md-consultorio').value             = d.Consultorio         || '';
  document.getElementById('md-telefono').value                = d.Telefono            || '';
  document.getElementById('md-hora-inicio').value             = d.hora_inicio ? d.hora_inicio.substring(0,5) : '';
  document.getElementById('md-hora-fin').value                = d.hora_fin    ? d.hora_fin.substring(0,5)    : '';
  document.getElementById('md-estado').value                  = d.Estado              || 'ACTIVO';
  document.getElementById('md-usuario').value                 = d.idUsuario           || '';
  document.getElementById('md-usuario-nombre').value          = d.Nombres ? `${d.Nombres} ${d.Apellidos}` : '';
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

@ -567,48 +509,28 @@ function cerrarModalMedico() {
}

async function guardarMedico() {
  const id         = document.getElementById('md-id').value;
  const id        = document.getElementById('md-id').value;
  const horaInicio = document.getElementById('md-hora-inicio').value;
  const horaFin    = document.getElementById('md-hora-fin').value;

  if (!document.getElementById('md-especialidad').value) {
    alert('La especialidad es obligatoria.');
    return;
  }

  if (horaInicio && horaFin && horaInicio >= horaFin) {
    alert('La hora de fin debe ser posterior a la hora de inicio.');
    return;
  }

  const horaFin   = document.getElementById('md-hora-fin').value;
  if (!document.getElementById('md-especialidad').value) { alert('La especialidad es obligatoria.'); return; }
  if (horaInicio && horaFin && horaInicio >= horaFin) { alert('La hora de fin debe ser posterior a la hora de inicio.'); return; }
  const payload = {
    Especialidad:        document.getElementById('md-especialidad').value,
    numero_junta_medica: document.getElementById('md-junta').value       || null,
    Consultorio:         document.getElementById('md-consultorio').value  || null,
    Telefono:            document.getElementById('md-telefono').value     || null,
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
  const res    = await fetch(url, { method, headers: H, body: JSON.stringify(payload) });
  const res    = await fetch(url, { method, headers:H, body:JSON.stringify(payload) });
  const data   = await res.json();

  if (res.status === 409) {
    alert('⚠️ ' + data.error);
    return;
  }

  if (data.message || data.id) {
    cerrarModalMedico();
    cargarMedicos();
    cargarListasAutocompletado();
  } else {
    alert('Error: ' + (data.error?.sqlMessage || data.error || 'Revisa los datos'));
  }
  if (res.status === 409) { alert('⚠️ ' + data.error); return; }
  if (data.message || data.id) { cerrarModalMedico(); cargarMedicos(); cargarListasAutocompletado(); }
  else alert('Error: ' + (data.error?.sqlMessage || data.error || 'Revisa los datos'));
}

async function toggleMedico(id, estaActivo) {
@ -617,18 +539,290 @@ async function toggleMedico(id, estaActivo) {
    ? '¿Desactivar este médico? No aparecerá disponible para agendar citas.'
    : '¿Activar este médico?';
  if (!confirm(mensaje)) return;

  const res  = await fetch(`/api/doctores/${id}/${accion}`, { method: 'PATCH', headers: H });
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

  if (data.message) {
    cargarMedicos();
    cargarListasAutocompletado();
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
    alert('Error: ' + (data.error || ''));
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
@ -640,4 +834,5 @@ function cerrarSesion() {
cargarStats();
iniciarBuscador();
cargarListasAutocompletado();
cargarUsuariosDoctores();
cargarUsuariosDoctores();
preCargarUltimas();

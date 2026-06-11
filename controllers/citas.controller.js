const Cita      = require("../models/citas.model");
const Auditoria = require("../models/auditoria.model");

// ── Helper: formatea fecha legible ───────────────────────────────────────────
function fmtFecha(f) {
  if (!f) return '—';
  const d = f instanceof Date ? f : new Date(f);
  return d.toLocaleDateString('es-SV', { day:'2-digit', month:'2-digit', year:'numeric' });
}

// ── EXISTENTES ────────────────────────────────────────────────────────────────

exports.getCitas = (req, res) => {
  Cita.getAll((err, results) => {
    if (err) { console.error('[citas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
    res.json(results);
  });
};

exports.getCitaById = (req, res) => {
  Cita.getById(req.params.id, (err, result) => {
    if (err) { console.error('[citas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
    res.json(Array.isArray(result) ? result[0] : result);
  });
};

exports.getCitasByPaciente = (req, res) => {
  Cita.getByUsuarioPaciente(req.params.idUsuario, (err, results) => {
    if (err) { console.error('[citas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
    res.json(results);
  });
};

exports.createCita = (req, res) => {
  const { idDoctor, fecha, hora } = req.body;
  if (!idDoctor || !fecha || !hora)
    return res.status(400).json({ error: "Doctor, fecha y hora son obligatorios." });
  Cita.checkDuplicado(idDoctor, fecha, hora, null, (err, existing) => {
    if (err) { console.error('[citas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
    if (existing.length > 0)
      return res.status(409).json({ error: "El médico ya tiene una cita en ese horario. Se requieren al menos 90 minutos entre citas." });
    Cita.create(req.body, (err, result) => {
      if (err) { console.error('[citas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
      const idCita = result.insertId;
      Cita.getById(idCita, (e2, rows) => {
        const c = Array.isArray(rows) ? rows[0] : rows;
        const nombrePac = c ? `${c.NombrePaciente || ''} ${c.ApellidosPaciente || ''}`.trim() : 'Paciente';
        const nombreDoc = c ? `Dr. ${c.NombreDoctor || ''} ${c.ApellidosDoctor || ''}`.trim() : 'Doctor';
        const espec     = c && c.Especialidad ? ` (${c.Especialidad})` : '';
        const horaFmt   = hora.substring(0, 5);
        Auditoria.registrar({
          accion: 'CITA_AGENDADA',
          descripcion: `${nombrePac} agendó una cita con ${nombreDoc}${espec} el ${fmtFecha(fecha)} a las ${horaFmt}`,
          nombreUsuario: nombrePac,
          modulo: 'Citas',
          fecha: new Date(),
        }, (e) => { if (e) console.error('[auditoria]', e.message); });
      });
      res.json({ message: "Cita creada", id: idCita });
    });
  });
};

exports.updateCita = (req, res) => {
  const id = req.params.id;
  const { idDoctor, fecha, hora } = req.body;
  if (idDoctor && fecha && hora) {
    Cita.checkDuplicado(idDoctor, fecha, hora, id, (err, existing) => {
      if (err) { console.error('[citas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
      if (existing.length > 0)
        return res.status(409).json({ error: "El médico ya tiene una cita en ese horario. Se requieren al menos 90 minutos entre citas." });
      Cita.update(id, req.body, (err) => {
        if (err) { console.error('[citas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json({ message: "Cita actualizada" });
      });
    });
  } else {
    Cita.update(id, req.body, (err) => {
      if (err) { console.error('[citas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
      res.json({ message: "Cita actualizada" });
    });
  }
};

exports.deleteCita = (req, res) => {
  Cita.delete(req.params.id, (err) => {
    if (err) { console.error('[citas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
    res.json({ message: "Cita eliminada" });
  });
};

exports.completarCita = (req, res) => {
  const idCita = req.params.id;
  Cita.getById(idCita, (e0, rows0) => {
    const c = Array.isArray(rows0) ? rows0[0] : rows0;
    Cita.completar(idCita, (err) => {
      if (err) { console.error('[citas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
      const nombreDoc = c ? `Dr. ${c.NombreDoctor || ''} ${c.ApellidosDoctor || ''}`.trim() : 'Doctor';
      const nombrePac = c ? `${c.NombrePaciente || ''} ${c.ApellidosPaciente || ''}`.trim() : 'Paciente';
      const espec     = c && c.Especialidad ? ` (${c.Especialidad})` : '';
      Auditoria.registrar({
        accion: 'CITA_COMPLETADA',
        descripcion: `${nombreDoc}${espec} completó la consulta con ${nombrePac}`,
        nombreUsuario: nombreDoc,
        modulo: 'Citas',
        fecha: new Date(),
      }, (e) => { if (e) console.error('[auditoria]', e.message); });
      res.json({ message: "Cita completada" });
    });
  });
};

// HU11
exports.getCitasByIdPaciente = (req, res) => {
  Cita.getByPaciente(req.params.idPaciente, (err, results) => {
    if (err) { console.error('[citas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
    res.json(results);
  });
};

exports.cancelarCita = (req, res) => {
  const idCita     = parseInt(req.params.id);
  const idPaciente = parseInt(req.body.idPaciente);
  if (!idPaciente) return res.status(400).json({ error: "idPaciente requerido" });
  Cita.getById(idCita, (err, rows) => {
    if (err) { console.error('[citas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
    const cita = Array.isArray(rows) ? rows[0] : rows;
    if (!cita) return res.status(404).json({ error: "Cita no encontrada" });
    if (cita.idPaciente !== idPaciente)
      return res.status(403).json({ error: "No tienes permiso para cancelar esta cita" });
    if (cita.estado === "CANCELADA")
      return res.status(409).json({ error: "La cita ya está cancelada" });
    if (cita.estado === "COMPLETADA" || cita.estado === "FINALIZADA")
      return res.status(409).json({ error: "No se puede cancelar una cita ya finalizada" });
    Cita.cancelar(idCita, idPaciente, (err, result) => {
      if (err) { console.error('[citas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
      if (result.affectedRows === 0)
        return res.status(409).json({ error: "No se pudo cancelar." });
      const nombrePac = `${cita.NombrePaciente || ''} ${cita.ApellidosPaciente || ''}`.trim() || 'Paciente';
      const nombreDoc = `Dr. ${cita.NombreDoctor || ''} ${cita.ApellidosDoctor || ''}`.trim();
      Auditoria.registrar({
        accion: 'CITA_CANCELADA',
        descripcion: `${nombrePac} canceló su cita con ${nombreDoc} del ${fmtFecha(cita.fecha)}`,
        nombreUsuario: nombrePac,
        modulo: 'Citas',
        fecha: new Date(),
      }, (e) => { if (e) console.error('[auditoria]', e.message); });
      res.json({ message: "Cita cancelada correctamente" });
    });
  });
};

exports.reprogramarCita = (req, res) => {
  const idCita     = parseInt(req.params.id);
  const { idPaciente, fecha, hora } = req.body;
  if (!idPaciente || !fecha || !hora)
    return res.status(400).json({ error: "idPaciente, fecha y hora son requeridos" });
  Cita.getById(idCita, (err, rows) => {
    if (err) { console.error('[citas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
    const cita = Array.isArray(rows) ? rows[0] : rows;
    if (!cita) return res.status(404).json({ error: "Cita no encontrada" });
    if (cita.idPaciente !== parseInt(idPaciente))
      return res.status(403).json({ error: "No tienes permiso para reprogramar esta cita" });
    if (cita.estado === "CANCELADA")
      return res.status(409).json({ error: "No se puede reprogramar una cita cancelada" });
    if (cita.estado === "COMPLETADA" || cita.estado === "FINALIZADA")
      return res.status(409).json({ error: "No se puede reprogramar una cita ya finalizada" });
    Cita.checkDuplicado(cita.idDoctor, fecha, hora, idCita, (err, dup) => {
      if (err) { console.error('[citas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
      if (dup.length > 0)
        return res.status(409).json({ error: "El médico ya tiene una cita en ese horario. Se requieren al menos 90 minutos entre citas." });
      Cita.reprogramar(idCita, parseInt(idPaciente), fecha, hora, (err, result) => {
        if (err) { console.error('[citas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        if (result.affectedRows === 0)
          return res.status(409).json({ error: "No se pudo reprogramar." });
        const nombrePac = `${cita.NombrePaciente || ''} ${cita.ApellidosPaciente || ''}`.trim() || 'Paciente';
        const nombreDoc = `Dr. ${cita.NombreDoctor || ''} ${cita.ApellidosDoctor || ''}`.trim();
        const horaFmt   = hora.substring(0, 5);
        Auditoria.registrar({
          accion: 'CITA_REPROGRAMADA',
          descripcion: `${nombrePac} reprogramó su cita con ${nombreDoc} para el ${fmtFecha(fecha)} a las ${horaFmt}`,
          nombreUsuario: nombrePac,
          modulo: 'Citas',
          fecha: new Date(),
        }, (e) => { if (e) console.error('[auditoria]', e.message); });
        res.json({ message: "Cita reprogramada correctamente" });
      });
    });
  });
};

// ── NUEVO: citas del doctor logueado ─────────────────────────────────────────
exports.getCitasByDoctor = (req, res) => {
  Cita.getByDoctor(req.params.idDoctor, (err, results) => {
    if (err) { console.error('[citas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
    res.json(results);
  });
};

// ── NUEVO: médicos disponibles para fecha/hora ────────────────────────────────
exports.getDisponibilidad = (req, res) => {
  const { fecha, hora } = req.query;
  if (!fecha || !hora)
    return res.status(400).json({ error: 'fecha y hora son requeridos.' });
  Cita.getDisponibilidad(fecha, hora, (err, results) => {
    if (err) { console.error('[citas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
    res.json(results);
  });
};

// ── FLUJO REASIGNACIÓN: doctor reporta inconveniente ──────────────────────────
exports.reportarInconveniente = (req, res) => {
  const idCita   = parseInt(req.params.id);
  const idDoctor = parseInt(req.body.idDoctor);
  if (!idDoctor) return res.status(400).json({ error: "idDoctor requerido" });
  Cita.getById(idCita, (err, rows) => {
    if (err) { console.error('[citas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
    const cita = Array.isArray(rows) ? rows[0] : rows;
    if (!cita) return res.status(404).json({ error: "Cita no encontrada" });
    if (cita.idDoctor !== idDoctor)
      return res.status(403).json({ error: "Esta cita no pertenece al doctor" });
    if (!['PENDIENTE', 'CONFIRMADA'].includes(cita.estado))
      return res.status(409).json({ error: "Solo se puede reportar inconveniente en citas pendientes o confirmadas" });
    Cita.reportarInconveniente(idCita, idDoctor, (err, result) => {
      if (err) { console.error('[citas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
      if (result.affectedRows === 0)
        return res.status(409).json({ error: "No se pudo reportar el inconveniente" });
      const nombreDoc = `Dr. ${cita.NombreDoctor || ''} ${cita.ApellidosDoctor || ''}`.trim();
      const nombrePac = `${cita.NombrePaciente || ''} ${cita.ApellidosPaciente || ''}`.trim() || 'Paciente';
      Auditoria.registrar({
        accion: 'INCONVENIENTE_REPORTADO',
        descripcion: `${nombreDoc} reportó un inconveniente con la cita de ${nombrePac} del ${fmtFecha(cita.fecha)}`,
        nombreUsuario: nombreDoc,
        modulo: 'Citas',
        fecha: new Date(),
      }, (e) => { if (e) console.error('[auditoria]', e.message); });
      res.json({ message: "Inconveniente reportado. La cita pasó a reasignación." });
    });
  });
};

// ── FLUJO REASIGNACIÓN: recepcionista asigna otro doctor ──────────────────────
exports.reasignarCita = (req, res) => {
  const idCita        = parseInt(req.params.id);
  const nuevoIdDoctor = parseInt(req.body.idDoctor);
  if (!nuevoIdDoctor) return res.status(400).json({ error: "idDoctor (nuevo) requerido" });
  Cita.getById(idCita, (err, rows) => {
    if (err) { console.error('[citas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
    const cita = Array.isArray(rows) ? rows[0] : rows;
    if (!cita) return res.status(404).json({ error: "Cita no encontrada" });
    if (cita.estado !== 'REQUIERE_REASIGNACION')
      return res.status(409).json({ error: "La cita no está en estado de reasignación" });
    if (nuevoIdDoctor === cita.idDoctor)
      return res.status(409).json({ error: "Debes elegir un doctor distinto al original" });

    const fechaStr  = cita.fecha instanceof Date
      ? cita.fecha.toISOString().split('T')[0]
      : String(cita.fecha).split('T')[0];
    const fechaHora = new Date(`${fechaStr}T${cita.hora}`);
    const limite    = new Date(Date.now() + 60 * 60 * 1000);
    if (isNaN(fechaHora.getTime()) || fechaHora < limite)
      return res.status(409).json({ error: "La reasignación requiere al menos 1 hora de anticipación antes de la cita." });

    Cita.checkDuplicado(nuevoIdDoctor, fechaStr, cita.hora, idCita, (err, dup) => {
      if (err) { console.error('[citas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
      if (dup.length > 0)
        return res.status(409).json({ error: "El nuevo médico ya tiene una cita en ese horario." });
      Cita.reasignar(idCita, nuevoIdDoctor, (err, result) => {
        if (err) { console.error('[citas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        if (result.affectedRows === 0)
          return res.status(409).json({ error: "No se pudo reasignar la cita" });
        const nombrePac = `${cita.NombrePaciente || ''} ${cita.ApellidosPaciente || ''}`.trim() || 'Paciente';
        const usuario   = req.user || {};
        Auditoria.registrar({
          accion: 'CITA_REASIGNADA',
          descripcion: `Recepcionista reasignó la cita de ${nombrePac} a un nuevo médico (doctor ID ${nuevoIdDoctor})`,
          nombreUsuario: usuario.nombre || 'Recepcionista',
          modulo: 'Citas',
          fecha: new Date(),
        }, (e) => { if (e) console.error('[auditoria]', e.message); });
        res.json({ message: "Cita reasignada y confirmada con el nuevo médico." });
      });
    });
  });
};

// ── FLUJO REASIGNACIÓN: recepcionista cancela por falta de doctores ───────────
exports.cancelarPorRecepcion = (req, res) => {
  const idCita = parseInt(req.params.id);
  const motivo = (req.body.motivo || 'Cancelada por recepción: sin doctores disponibles').trim();
  Cita.getById(idCita, (err, rows) => {
    if (err) { console.error('[citas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
    const cita = Array.isArray(rows) ? rows[0] : rows;
    if (!cita) return res.status(404).json({ error: "Cita no encontrada" });
    if (['CANCELADA', 'FINALIZADA'].includes(cita.estado))
      return res.status(409).json({ error: "La cita ya está cerrada" });
    Cita.cancelarPorRecepcion(idCita, motivo, (err, result) => {
      if (err) { console.error('[citas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
      if (result.affectedRows === 0)
        return res.status(409).json({ error: "No se pudo cancelar la cita" });
      const nombrePac = `${cita.NombrePaciente || ''} ${cita.ApellidosPaciente || ''}`.trim() || 'Paciente';
      const usuario   = req.user || {};
      Auditoria.registrar({
        accion: 'CITA_CANCELADA_RECEPCION',
        descripcion: `Recepcionista canceló la cita de ${nombrePac} del ${fmtFecha(cita.fecha)}. Motivo: ${motivo}`,
        nombreUsuario: usuario.nombre || 'Recepcionista',
        modulo: 'Citas',
        fecha: new Date(),
      }, (e) => { if (e) console.error('[auditoria]', e.message); });
      res.json({ message: "Cita cancelada." });
    });
  });
};
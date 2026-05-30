const Cita = require("../models/citas.model");

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
    res.json(result);
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
      res.json({ message: "Cita creada", id: result.insertId });
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
  Cita.completar(req.params.id, (err) => {
    if (err) { console.error('[citas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
    res.json({ message: "Cita completada" });
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
    if (cita.estado === "COMPLETADA")
      return res.status(409).json({ error: "No se puede cancelar una cita completada" });
    Cita.cancelar(idCita, idPaciente, (err, result) => {
      if (err) { console.error('[citas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
      if (result.affectedRows === 0)
        return res.status(409).json({ error: "No se pudo cancelar." });
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
    if (cita.estado === "COMPLETADA")
      return res.status(409).json({ error: "No se puede reprogramar una cita completada" });
    Cita.checkDuplicado(cita.idDoctor, fecha, hora, idCita, (err, dup) => {
      if (err) { console.error('[citas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
      if (dup.length > 0)
        return res.status(409).json({ error: "El médico ya tiene una cita en ese horario. Se requieren al menos 90 minutos entre citas." });
      Cita.reprogramar(idCita, parseInt(idPaciente), fecha, hora, (err, result) => {
        if (err) { console.error('[citas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        if (result.affectedRows === 0)
          return res.status(409).json({ error: "No se pudo reprogramar." });
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
const Cita = require("../models/citas.model");

exports.getCitas = (req, res) => {
  Cita.getAll((err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
};

exports.getCitaById = (req, res) => {
  Cita.getById(req.params.id, (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json(result);
  });
};

exports.createCita = (req, res) => {
  const { idDoctor, fecha, hora } = req.body;

  if (!idDoctor || !fecha || !hora) {
    return res.status(400).json({ error: "Doctor, fecha y hora son obligatorios." });
  }

  Cita.checkDuplicado(idDoctor, fecha, hora, null, (err, existing) => {
    if (err) return res.status(500).json({ error: err });
    if (existing.length > 0) {
      return res.status(409).json({
        error: "El médico ya tiene una cita programada en esa fecha y hora."
      });
    }

    Cita.create(req.body, (err, result) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: "Cita creada", id: result.insertId });
    });
  });
};

exports.updateCita = (req, res) => {
  const id = req.params.id;
  const { idDoctor, fecha, hora } = req.body;
  if (idDoctor && fecha && hora) {
    Cita.checkDuplicado(idDoctor, fecha, hora, id, (err, existing) => {
      if (err) return res.status(500).json({ error: err });
      if (existing.length > 0) {
        return res.status(409).json({
          error: "El médico ya tiene una cita programada en esa fecha y hora."
        });
      }

      Cita.update(id, req.body, (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Cita actualizada" });
      });
    });
  } else {
    Cita.update(id, req.body, (err) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: "Cita actualizada" });
    });
  }
};

exports.deleteCita = (req, res) => {
  Cita.delete(req.params.id, (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: "Cita eliminada" });
  });
};
const Doctor = require("../models/doctores.model");

exports.getDoctores = (req, res) => {
  Doctor.getAll((err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
};

exports.getDoctoresActivos = (req, res) => {
  Doctor.getAllActivos((err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
};

exports.getDoctorById = (req, res) => {
  Doctor.getById(req.params.id, (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json(result[0] || null);
  });
};

exports.createDoctor = (req, res) => {
  const { idUsuario } = req.body;

  if (!idUsuario) {
    return res.status(400).json({ error: "El idUsuario es obligatorio." });
  }

  Doctor.getByUsuario(idUsuario, null, (err, existing) => {
    if (err) return res.status(500).json({ error: err });
    if (existing.length > 0) {
      return res.status(409).json({
        error: "Ya existe un médico registrado con ese usuario.",
      });
    }

    Doctor.create(req.body, (err, result) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: "Doctor creado", id: result.insertId });
    });
  });
};

exports.updateDoctor = (req, res) => {
  const id = req.params.id;
  const { idUsuario } = req.body;

  if (idUsuario) {
    Doctor.getByUsuario(idUsuario, id, (err, existing) => {
      if (err) return res.status(500).json({ error: err });
      if (existing.length > 0) {
        return res.status(409).json({
          error: "Ya existe otro médico vinculado a ese usuario.",
        });
      }
      Doctor.update(id, req.body, (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Doctor actualizado" });
      });
    });
  } else {
    Doctor.update(id, req.body, (err) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: "Doctor actualizado" });
    });
  }
};

exports.desactivarDoctor = (req, res) => {
  Doctor.desactivar(req.params.id, (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: "Doctor desactivado" });
  });
};

exports.activarDoctor = (req, res) => {
  Doctor.activar(req.params.id, (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: "Doctor activado" });
  });
};

exports.deleteDoctor = (req, res) => {
  Doctor.delete(req.params.id, (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: "Doctor eliminado" });
  });
};
const Doctor = require("../models/doctores.model");

// GET todos los doctores — para admin y recepcionista
exports.getDoctores = (req, res) => {
  Doctor.getAll((err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
};

// GET solo activos — criterio 4: médico desactivado no aparece para agendar citas
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

// POST crear doctor
// Criterio 1: registrar médico con datos y especialidad
// Criterio 3: no permitir dos médicos con el mismo número de junta médica
exports.createDoctor = (req, res) => {
  const { idUsuario, numero_junta_medica, hora_inicio, hora_fin } = req.body;

  // Validar que se envíe un usuario
  if (!idUsuario) {
    return res.status(400).json({ error: "El idUsuario es obligatorio." });
  }

  // Criterio 2: validar que hora_fin sea posterior a hora_inicio
  if (hora_inicio && hora_fin && hora_inicio >= hora_fin) {
    return res.status(400).json({ error: "La hora de fin debe ser posterior a la hora de inicio." });
  }

  // Criterio 3: verificar que el número de junta médica no esté duplicado
  if (numero_junta_medica) {
    Doctor.getByJunta(numero_junta_medica, null, (err, existing) => {
      if (err) return res.status(500).json({ error: err });
      if (existing.length > 0) {
        return res.status(409).json({
          error: "Ya existe un médico registrado con ese número de junta médica.",
        });
      }
      // Verificar que el usuario no esté ya registrado como doctor
      Doctor.getByUsuario(idUsuario, null, (err, existingUser) => {
        if (err) return res.status(500).json({ error: err });
        if (existingUser.length > 0) {
          return res.status(409).json({
            error: "Ya existe un médico registrado con ese usuario.",
          });
        }
        Doctor.create(req.body, (err, result) => {
          if (err) return res.status(500).json({ error: err });
          res.json({ message: "Doctor creado", id: result.insertId });
        });
      });
    });
  } else {
    // Sin número de junta médica, solo verificar usuario
    Doctor.getByUsuario(idUsuario, null, (err, existingUser) => {
      if (err) return res.status(500).json({ error: err });
      if (existingUser.length > 0) {
        return res.status(409).json({
          error: "Ya existe un médico registrado con ese usuario.",
        });
      }
      Doctor.create(req.body, (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Doctor creado", id: result.insertId });
      });
    });
  }
};

// PUT actualizar doctor
// Criterio 1: editar datos y especialidad
// Criterio 2: actualizar horarios
// Criterio 3: verificar junta médica única al editar
exports.updateDoctor = (req, res) => {
  const id = req.params.id;
  const { idUsuario, numero_junta_medica, hora_inicio, hora_fin } = req.body;

  // Criterio 2: validar horario
  if (hora_inicio && hora_fin && hora_inicio >= hora_fin) {
    return res.status(400).json({ error: "La hora de fin debe ser posterior a la hora de inicio." });
  }

  // Criterio 3: verificar junta médica única excluyendo al doctor actual
  if (numero_junta_medica) {
    Doctor.getByJunta(numero_junta_medica, id, (err, existing) => {
      if (err) return res.status(500).json({ error: err });
      if (existing.length > 0) {
        return res.status(409).json({
          error: "Ya existe otro médico con ese número de junta médica.",
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

// PATCH desactivar — criterio 1 y 4
exports.desactivarDoctor = (req, res) => {
  Doctor.desactivar(req.params.id, (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: "Doctor desactivado" });
  });
};

// PATCH activar — criterio 1
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
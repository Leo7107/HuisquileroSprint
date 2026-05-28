const Paciente = require("../models/pacientes.model");

exports.getPacientes = (req, res) => {
    Paciente.getAll((err, results) => {
        if (err) { console.error('[pacientes]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json(results);
    });
};

exports.getPacienteById = (req, res) => {
    Paciente.getById(req.params.id, (err, result) => {
        if (err) { console.error('[pacientes]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json(result);
    });
};

exports.createPaciente = (req, res) => {
    Paciente.create(req.body, (err, result) => {
        if (err) { console.error('[pacientes]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json({ message: "Paciente creado", id: result.insertId });
    });
};

exports.updatePaciente = (req, res) => {
    Paciente.update(req.params.id, req.body, (err) => {
        if (err) { console.error('[pacientes]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json({ message: "Paciente actualizado" });
    });
};

exports.deletePaciente = (req, res) => {
    Paciente.delete(req.params.id, (err) => {
        if (err) { console.error('[pacientes]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json({ message: "Paciente eliminado" });
    });
};

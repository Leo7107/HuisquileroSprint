const Paciente = require("../models/pacientes.model");

exports.getPacientes = (req, res) => {
    Paciente.getAll((err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
};

exports.getPacienteById = (req, res) => {
    Paciente.getById(req.params.id, (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json(result);
    });
};

exports.createPaciente = (req, res) => {
    Paciente.create(req.body, (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Paciente creado", id: result.insertId });
    });
};

exports.updatePaciente = (req, res) => {
    Paciente.update(req.params.id, req.body, (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Paciente actualizado" });
    });
};

exports.deletePaciente = (req, res) => {
    Paciente.delete(req.params.id, (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Paciente eliminado" });
    });
};

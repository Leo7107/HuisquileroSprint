const Diagnostico = require("../models/diagnosticos.model");

exports.getDiagnosticos = (req, res) => {
    Diagnostico.getAll((err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
};

exports.getDiagnosticoById = (req, res) => {
    Diagnostico.getById(req.params.id, (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json(result);
    });
};

exports.createDiagnostico = (req, res) => {
    Diagnostico.create(req.body, (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Diagnóstico creado", id: result.insertId });
    });
};

exports.updateDiagnostico = (req, res) => {
    Diagnostico.update(req.params.id, req.body, (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Diagnóstico actualizado" });
    });
};

exports.deleteDiagnostico = (req, res) => {
    Diagnostico.delete(req.params.id, (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Diagnóstico eliminado" });
    });
};

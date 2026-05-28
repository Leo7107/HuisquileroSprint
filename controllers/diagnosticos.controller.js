const Diagnostico = require("../models/diagnosticos.model");

exports.getDiagnosticos = (req, res) => {
    Diagnostico.getAll((err, results) => {
        if (err) { console.error('[diagnosticos]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json(results);
    });
};

exports.getDiagnosticoById = (req, res) => {
    Diagnostico.getById(req.params.id, (err, result) => {
        if (err) { console.error('[diagnosticos]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json(result);
    });
};

exports.createDiagnostico = (req, res) => {
    Diagnostico.create(req.body, (err, result) => {
        if (err) { console.error('[diagnosticos]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json({ message: "Diagnóstico creado", id: result.insertId });
    });
};

exports.updateDiagnostico = (req, res) => {
    Diagnostico.update(req.params.id, req.body, (err) => {
        if (err) { console.error('[diagnosticos]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json({ message: "Diagnóstico actualizado" });
    });
};

exports.deleteDiagnostico = (req, res) => {
    Diagnostico.delete(req.params.id, (err) => {
        if (err) { console.error('[diagnosticos]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json({ message: "Diagnóstico eliminado" });
    });
};

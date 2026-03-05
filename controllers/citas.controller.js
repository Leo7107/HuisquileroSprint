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
    Cita.create(req.body, (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Cita creada", id: result.insertId });
    });
};

exports.updateCita = (req, res) => {
    Cita.update(req.params.id, req.body, (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Cita actualizada" });
    });
};

exports.deleteCita = (req, res) => {
    Cita.delete(req.params.id, (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Cita eliminada" });
    });
};

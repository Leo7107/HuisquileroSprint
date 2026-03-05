const Consulta = require("../models/consultas.model");

exports.getConsultas = (req, res) => {
    Consulta.getAll((err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
};

exports.getConsultaById = (req, res) => {
    Consulta.getById(req.params.id, (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json(result);
    });
};

exports.createConsulta = (req, res) => {
    Consulta.create(req.body, (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Consulta creada", id: result.insertId });
    });
};

exports.updateConsulta = (req, res) => {
    Consulta.update(req.params.id, req.body, (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Consulta actualizada" });
    });
};

exports.deleteConsulta = (req, res) => {
    Consulta.delete(req.params.id, (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Consulta eliminada" });
    });
};

const Consulta = require("../models/consultas.model");

exports.getRecientesConsultas = (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 6, 50);
    Consulta.getRecientes(limit, (err, results) => {
        if (err) { console.error('[consultas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json(results);
    });
};

exports.getConsultaByCita = (req, res) => {
    Consulta.getByCita(req.params.idCita, (err, result) => {
        if (err) { console.error('[consultas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json(result[0] || null);
    });
};

exports.getConsultas = (req, res) => {
    Consulta.getAll((err, results) => {
        if (err) { console.error('[consultas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json(results);
    });
};

exports.getConsultaById = (req, res) => {
    Consulta.getById(req.params.id, (err, result) => {
        if (err) { console.error('[consultas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json(result);
    });
};

exports.createConsulta = (req, res) => {
    Consulta.create(req.body, (err, result) => {
        if (err) { console.error('[consultas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json({ message: "Consulta creada", id: result.insertId });
    });
};

exports.updateConsulta = (req, res) => {
    Consulta.update(req.params.id, req.body, (err) => {
        if (err) { console.error('[consultas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json({ message: "Consulta actualizada" });
    });
};

exports.deleteConsulta = (req, res) => {
    Consulta.delete(req.params.id, (err) => {
        if (err) { console.error('[consultas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json({ message: "Consulta eliminada" });
    });
};

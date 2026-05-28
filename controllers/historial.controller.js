const Historial = require("../models/historial.model");

exports.getHistoriales = (req, res) => {
    Historial.getAll((err, results) => {
        if (err) { console.error('[historial]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json(results);
    });
};

exports.getHistorialById = (req, res) => {
    Historial.getById(req.params.id, (err, result) => {
        if (err) { console.error('[historial]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json(result);
    });
};

exports.createHistorial = (req, res) => {
    Historial.create(req.body, (err, result) => {
        if (err) { console.error('[historial]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json({ message: "Historial clÃ­nico creado", id: result.insertId });
    });
};

exports.updateHistorial = (req, res) => {
    Historial.update(req.params.id, req.body, (err) => {
        if (err) { console.error('[historial]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json({ message: "Historial clÃ­nico actualizado" });
    });
};

exports.deleteHistorial = (req, res) => {
    Historial.delete(req.params.id, (err) => {
        if (err) { console.error('[historial]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json({ message: "Historial clÃ­nico eliminado" });
    });
};

exports.getHistorialByPaciente = (req, res) => {
    const Historial = require('../models/historial.model');
    Historial.getByPaciente(req.query.idPaciente, (err, result) => {
        if (err) { console.error('[historial]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json(result);
    });
};



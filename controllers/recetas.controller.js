const Receta = require("../models/recetas.model");

exports.getRecetas = (req, res) => {
    Receta.getAll((err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
};

exports.getRecetaById = (req, res) => {
    Receta.getById(req.params.id, (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json(result);
    });
};

exports.createReceta = (req, res) => {
    Receta.create(req.body, (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Receta creada", id: result.insertId });
    });
};

exports.updateReceta = (req, res) => {
    Receta.update(req.params.id, req.body, (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Receta actualizada" });
    });
};

exports.deleteReceta = (req, res) => {
    Receta.delete(req.params.id, (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Receta eliminada" });
    });
};

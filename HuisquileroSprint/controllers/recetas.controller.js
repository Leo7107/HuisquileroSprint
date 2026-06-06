const Receta = require("../models/recetas.model");

exports.getRecetas = (req, res) => {
    Receta.getAll((err, results) => {
        if (err) { console.error('[recetas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json(results);
    });
};

exports.getRecetaById = (req, res) => {
    Receta.getById(req.params.id, (err, result) => {
        if (err) { console.error('[recetas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json(result);
    });
};

exports.createReceta = (req, res) => {
    Receta.create(req.body, (err, result) => {
        if (err) { console.error('[recetas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json({ message: "Receta creada", id: result.insertId });
    });
};

exports.updateReceta = (req, res) => {
    Receta.update(req.params.id, req.body, (err) => {
        if (err) { console.error('[recetas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json({ message: "Receta actualizada" });
    });
};

exports.deleteReceta = (req, res) => {
    Receta.delete(req.params.id, (err) => {
        if (err) { console.error('[recetas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json({ message: "Receta eliminada" });
    });
};

exports.getRecetasByPaciente = (req, res) => {
    Receta.getByPaciente(req.params.idPaciente, (err, results) => {
        if (err) { console.error('[recetas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json(results);
    });
};

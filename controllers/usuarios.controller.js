const Usuario = require("../models/usuarios.model");

exports.getUsuarios = (req, res) => {
    Usuario.getAll((err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
};

exports.getUsuarioById = (req, res) => {
    Usuario.getById(req.params.id, (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json(result);
    });
};

exports.createUsuario = (req, res) => {
    Usuario.create(req.body, (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Usuario creado", id: result.insertId });
    });
};

exports.updateUsuario = (req, res) => {
    Usuario.update(req.params.id, req.body, (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Usuario actualizado" });
    });
};

exports.deleteUsuario = (req, res) => {
    Usuario.delete(req.params.id, (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Usuario eliminado" });
    });
};

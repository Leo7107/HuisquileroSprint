const Usuario = require("../models/usuarios.model");
const bcrypt = require("bcrypt");  // ← estaba mal, apuntaba al modelo
const jwt = require('jsonwebtoken');

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
    const data = req.body;
    console.log("datos recibidos", data);

    bcrypt.hash(data.Password_hash, 10, (err, hash) => {
        if (err) return res.status(500).json({ error: err });
        
        console.log("Hash generado:", hash);
        data.Password_hash = hash;

        Usuario.create(data, (err, result) => {
            if (err) {
                console.log("Error BD:", err); // ← agrega esto
                return res.status(500).json({ error: err });
            }
            res.json({ message: "Usuario creado", id: result.insertId });
        });
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

exports.login = (req, res) => {
    const { Email, Password_hash } = req.body;

    Usuario.getByEmail(Email, (err, results) => {
        if (err) return res.status(500).json({ error: err });
        if (results.length === 0) return res.status(401).json({ message: "Usuario no encontrado" });

        const usuario = results[0];

        bcrypt.compare(Password_hash, usuario.Password_hash, (err, coincide) => {
            if (err) return res.status(500).json({ error: err });
            if (!coincide) return res.status(401).json({ message: "Contraseña incorrecta" });

            const token = jwt.sign(
                { id: usuario.idUsuario, rol: usuario.idRol },
                process.env.JWT_SECRET,
                { expiresIn: "8h" }
            );

            res.json({ token, usuario: { id: usuario.idUsuario, nombre: usuario.Nombres, rol: usuario.idRol } });
        });
    });
};
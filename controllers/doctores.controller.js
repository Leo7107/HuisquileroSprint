const Doctor = require("../models/doctores.model");

exports.getDoctores = (req, res) => {
    Doctor.getAll((err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
};

exports.getDoctorById = (req, res) => {
    Doctor.getById(req.params.id, (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json(result);
    });
};

exports.createDoctor = (req, res) => {
    Doctor.create(req.body, (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Doctor creado", id: result.insertId });
    });
};

exports.updateDoctor = (req, res) => {
    Doctor.update(req.params.id, req.body, (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Doctor actualizado" });
    });
};

exports.deleteDoctor = (req, res) => {
    Doctor.delete(req.params.id, (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Doctor eliminado" });
    });
};

const Factura = require("../models/facturas.model");

exports.getFacturas = (req, res) => {
    Factura.getAll((err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
};

exports.getFacturaById = (req, res) => {
    Factura.getById(req.params.id, (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json(result);
    });
};

exports.createFactura = (req, res) => {
    Factura.create(req.body, (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Factura creada", id: result.insertId });
    });
};

exports.updateFactura = (req, res) => {
    Factura.update(req.params.id, req.body, (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Factura actualizada" });
    });
};

exports.deleteFactura = (req, res) => {
    Factura.delete(req.params.id, (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Factura eliminada" });
    });
};

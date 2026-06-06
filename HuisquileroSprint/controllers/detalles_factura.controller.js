const DetalleFactura = require("../models/detalles_factura.model");

exports.getDetallesFactura = (req, res) => {
    DetalleFactura.getAll((err, results) => {
        if (err) { console.error('[detalles_factura]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json(results);
    });
};

exports.getDetalleFacturaById = (req, res) => {
    DetalleFactura.getById(req.params.id, (err, result) => {
        if (err) { console.error('[detalles_factura]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json(result);
    });
};

exports.createDetalleFactura = (req, res) => {
    DetalleFactura.create(req.body, (err, result) => {
        if (err) { console.error('[detalles_factura]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json({ message: "Detalle de factura creado", id: result.insertId });
    });
};

exports.updateDetalleFactura = (req, res) => {
    DetalleFactura.update(req.params.id, req.body, (err) => {
        if (err) { console.error('[detalles_factura]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json({ message: "Detalle de factura actualizado" });
    });
};

exports.deleteDetalleFactura = (req, res) => {
    DetalleFactura.delete(req.params.id, (err) => {
        if (err) { console.error('[detalles_factura]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json({ message: "Detalle de factura eliminado" });
    });
};

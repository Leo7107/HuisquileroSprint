const db = require("../config/db");

const DetalleFactura = {
    getAll: (cb) => db.query("SELECT * FROM tbl_detalles_factura", cb),
    getById: (id, cb) => db.query("SELECT * FROM tbl_detalles_factura WHERE iddetalle = ?", [id], cb),
    create: (data, cb) => db.query("INSERT INTO tbl_detalles_factura SET ?", data, cb),
    update: (id, data, cb) => db.query("UPDATE tbl_detalles_factura SET ? WHERE iddetalle = ?", [data, id], cb),
    delete: (id, cb) => db.query("DELETE FROM tbl_detalles_factura WHERE iddetalle = ?", [id], cb)
};

module.exports = DetalleFactura;

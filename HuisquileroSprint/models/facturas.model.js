const db = require("../config/db");

const Factura = {
    getAll: (cb) => db.query("SELECT * FROM tbl_facturas", cb),
    getById: (id, cb) => db.query("SELECT * FROM tbl_facturas WHERE idfactura = ?", [id], cb),
    create: (data, cb) => db.query("INSERT INTO tbl_facturas SET ?", data, cb),
    update: (id, data, cb) => db.query("UPDATE tbl_facturas SET ? WHERE idfactura = ?", [data, id], cb),
    delete: (id, cb) => db.query("DELETE FROM tbl_facturas WHERE idfactura = ?", [id], cb)
};

module.exports = Factura;

const db = require("../config/db");

const Cita = {
    getAll: (cb) => db.query("SELECT * FROM tbl_citas", cb),
    getById: (id, cb) => db.query("SELECT * FROM tbl_citas WHERE idcita = ?", [id], cb),
    create: (data, cb) => db.query("INSERT INTO tbl_citas SET ?", data, cb),
    update: (id, data, cb) => db.query("UPDATE tbl_citas SET ? WHERE idcita = ?", [data, id], cb),
    delete: (id, cb) => db.query("DELETE FROM tbl_citas WHERE idcita = ?", [id], cb)
};

module.exports = Cita;

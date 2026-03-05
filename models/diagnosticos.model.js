const db = require("../config/db");

const Diagnostico = {
    getAll: (cb) => db.query("SELECT * FROM tbl_diagnosticos", cb),
    getById: (id, cb) => db.query("SELECT * FROM tbl_diagnosticos WHERE iddiagnostico = ?", [id], cb),
    create: (data, cb) => db.query("INSERT INTO tbl_diagnosticos SET ?", data, cb),
    update: (id, data, cb) => db.query("UPDATE tbl_diagnosticos SET ? WHERE iddiagnostico = ?", [data, id], cb),
    delete: (id, cb) => db.query("DELETE FROM tbl_diagnosticos WHERE iddiagnostico = ?", [id], cb)
};

module.exports = Diagnostico;

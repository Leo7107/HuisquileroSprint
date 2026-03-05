const db = require("../config/db");

const Historial = {
    getAll: (cb) => db.query("SELECT * FROM tbl_historial_clinico", cb),
    getById: (id, cb) => db.query("SELECT * FROM tbl_historial_clinico WHERE idhistorial = ?", [id], cb),
    create: (data, cb) => db.query("INSERT INTO tbl_historial_clinico SET ?", data, cb),
    update: (id, data, cb) => db.query("UPDATE tbl_historial_clinico SET ? WHERE idhistorial = ?", [data, id], cb),
    delete: (id, cb) => db.query("DELETE FROM tbl_historial_clinico WHERE idhistorial = ?", [id], cb)
};

module.exports = Historial;

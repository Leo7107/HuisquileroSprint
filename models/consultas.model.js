const db = require("../config/db");

const Consulta = {
    getAll: (cb) => db.query("SELECT * FROM tbl_consultas", cb),
    getById: (id, cb) => db.query("SELECT * FROM tbl_consultas WHERE idconsulta = ?", [id], cb),
    create: (data, cb) => db.query("INSERT INTO tbl_consultas SET ?", data, cb),
    update: (id, data, cb) => db.query("UPDATE tbl_consultas SET ? WHERE idconsulta = ?", [data, id], cb),
    delete: (id, cb) => db.query("DELETE FROM tbl_consultas WHERE idconsulta = ?", [id], cb)
};

module.exports = Consulta;

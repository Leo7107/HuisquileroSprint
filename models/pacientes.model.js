const db = require("../config/db");

const Paciente = {
    getAll: (cb) => db.query("SELECT * FROM tbl_paciente", cb),
    getById: (id, cb) => db.query("SELECT * FROM tbl_paciente WHERE idpaciente = ?", [id], cb),
    create: (data, cb) => db.query("INSERT INTO tbl_paciente SET ?", data, cb),
    update: (id, data, cb) => db.query("UPDATE tbl_paciente SET ? WHERE idpaciente = ?", [data, id], cb),
    delete: (id, cb) => db.query("DELETE FROM tbl_paciente WHERE idpaciente = ?", [id], cb)
};

module.exports = Paciente;

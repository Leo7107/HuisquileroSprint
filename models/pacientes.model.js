const db = require("../config/db");

const Paciente = {
    getAll: (cb) => db.query("SELECT * FROM tbl_pacientes", cb),
    getById: (id, cb) => db.query("SELECT * FROM tbl_pacientes WHERE idpaciente = ?", [id], cb),
    create: (data, cb) => db.query("INSERT INTO tbl_pacientes SET ?", data, cb),
    update: (id, data, cb) => db.query("UPDATE tbl_pacientes SET ? WHERE idpaciente = ?", [data, id], cb),
    delete: (id, cb) => db.query("DELETE FROM tbl_pacientes WHERE idpaciente = ?", [id], cb)
};

module.exports = Paciente;

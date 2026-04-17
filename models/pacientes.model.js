const db = require("../config/db");

const Paciente = {
  getAll: (cb) => db.query(`
    SELECT p.*, u.Nombres, u.Apellidos, u.Email
    FROM tbl_paciente p
    LEFT JOIN tbl_usuarios u ON p.idUsuario = u.idUsuario
  `, cb),

  getById: (id, cb) => db.query(`
    SELECT p.*, u.Nombres, u.Apellidos, u.Email
    FROM tbl_paciente p
    LEFT JOIN tbl_usuarios u ON p.idUsuario = u.idUsuario
    WHERE p.idpaciente = ?
  `, [id], cb),

  create: (data, cb) => db.query("INSERT INTO tbl_paciente SET ?", data, cb),
  update: (id, data, cb) => db.query("UPDATE tbl_paciente SET ? WHERE idpaciente = ?", [data, id], cb),
  delete: (id, cb) => db.query("DELETE FROM tbl_paciente WHERE idpaciente = ?", [id], cb),
};

module.exports = Paciente;
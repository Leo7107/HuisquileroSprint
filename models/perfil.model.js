const db = require("../config/db");

const Perfil = {
  getPerfil: (idUsuario, cb) => {
    const sql = `
      SELECT 
        u.idUsuario, u.Nombres, u.Apellidos, u.Sexo, u.Fecha_nacimiento,
        u.Telefono, u.Direccion, u.Email,
        p.idPaciente, p.numero_expediente, p.fecha_registro, p.tipo_sangre,
        p.contacto_emergencia, p.parentesco_emergencia, p.telefono_emergencia,
        p.observaciones_generales AS obs_paciente,
        h.idHistorial, h.antecedentes_familiares, h.antecedentes_personales,
        h.alergias, h.padecimientos_cronicos, h.cirugias_previas,
        h.observaciones_generales AS obs_historial
      FROM tbl_usuarios u
      LEFT JOIN tbl_paciente p ON u.idUsuario = p.idUsuario
      LEFT JOIN tbl_historial_clinico h ON p.idPaciente = h.idPaciente
      WHERE u.idUsuario = ?
    `;
    db.query(sql, [idUsuario], cb);
  },
  updateUsuario: (idUsuario, data, cb) =>
    db.query("UPDATE tbl_usuarios SET ? WHERE idUsuario = ?", [data, idUsuario], cb),
  updatePaciente: (idPaciente, data, cb) =>
    db.query("UPDATE tbl_paciente SET ? WHERE idPaciente = ?", [data, idPaciente], cb),
  getHistorialByPaciente: (idPaciente, cb) =>
    db.query("SELECT idHistorial FROM tbl_historial_clinico WHERE idPaciente = ?", [idPaciente], cb),
  createHistorial: (data, cb) =>
    db.query("INSERT INTO tbl_historial_clinico SET ?", data, cb),
  updateHistorial: (idHistorial, data, cb) =>
    db.query("UPDATE tbl_historial_clinico SET ? WHERE idHistorial = ?", [data, idHistorial], cb)
};

module.exports = Perfil;

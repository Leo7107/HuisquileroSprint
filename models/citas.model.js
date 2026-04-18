const db = require("../config/db");

const Cita = {
    getAll: (cb) => db.query(`
    SELECT c.*,
      u_pac.Nombres AS NombrePaciente, u_pac.Apellidos AS ApellidosPaciente,
      u_doc.Nombres AS NombreDoctor,   u_doc.Apellidos AS ApellidosDoctor
    FROM tbl_citas c
    LEFT JOIN tbl_paciente   p     ON c.idPaciente = p.idPaciente
    LEFT JOIN tbl_usuarios   u_pac ON p.idUsuario  = u_pac.idUsuario
    LEFT JOIN tbl_doctores   d     ON c.idDoctor   = d.idDoctor
    LEFT JOIN tbl_usuarios   u_doc ON d.idUsuario  = u_doc.idUsuario
  `, cb),
    getById: (id, cb) => db.query(`
    SELECT c.*,
      u_pac.Nombres AS NombrePaciente, u_pac.Apellidos AS ApellidosPaciente,
      u_doc.Nombres AS NombreDoctor,   u_doc.Apellidos AS ApellidosDoctor
    FROM tbl_citas c
    LEFT JOIN tbl_paciente   p     ON c.idPaciente = p.idPaciente
    LEFT JOIN tbl_usuarios   u_pac ON p.idUsuario  = u_pac.idUsuario
    LEFT JOIN tbl_doctores   d     ON c.idDoctor   = d.idDoctor
    LEFT JOIN tbl_usuarios   u_doc ON d.idUsuario  = u_doc.idUsuario
    WHERE c.idcita = ?
  `, [id], cb),

    checkDuplicado: (idDoctor, fecha, hora, excludeId = null, cb) => {
        if (excludeId) {
            db.query(
                `SELECT idCita FROM tbl_citas 
                 WHERE idDoctor = ? AND fecha = ? AND hora = ? 
                 AND estado <> 'CANCELADA' AND idCita <> ?`,
                [idDoctor, fecha, hora, excludeId], cb
            );
        } else {
            db.query(
                `SELECT idCita FROM tbl_citas 
                 WHERE idDoctor = ? AND fecha = ? AND hora = ? 
                 AND estado <> 'CANCELADA'`,
                [idDoctor, fecha, hora], cb
            );
        }
    },

    create: (data, cb) => db.query("INSERT INTO tbl_citas SET ?", data, cb),
    update: (id, data, cb) => db.query("UPDATE tbl_citas SET ? WHERE idcita = ?", [data, id], cb),
    delete: (id, cb) => db.query("DELETE FROM tbl_citas WHERE idcita = ?", [id], cb),
    completar: (id, cb) => db.query("UPDATE tbl_citas SET estado = 'COMPLETADA' WHERE idCita = ?", [id], cb)
};

module.exports = Cita;

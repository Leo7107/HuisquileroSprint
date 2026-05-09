const db = require("../config/db");

const Cita = {

  // ── EXISTENTES ────────────────────────────────────────────────────────────

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
      u_doc.Nombres AS NombreDoctor,   u_doc.Apellidos AS ApellidosDoctor,
      doc.Especialidad
    FROM tbl_citas c
    LEFT JOIN tbl_paciente   p     ON c.idPaciente = p.idPaciente
    LEFT JOIN tbl_usuarios   u_pac ON p.idUsuario  = u_pac.idUsuario
    LEFT JOIN tbl_doctores   d     ON c.idDoctor   = d.idDoctor
    LEFT JOIN tbl_usuarios   u_doc ON d.idUsuario  = u_doc.idUsuario
    LEFT JOIN tbl_doctores   doc   ON c.idDoctor   = doc.idDoctor
    WHERE c.idcita = ?
  `, [id], cb),

  getByUsuarioPaciente: (idUsuario, cb) => db.query(`
    SELECT c.*,
      u_pac.Nombres AS NombrePaciente, u_pac.Apellidos AS ApellidosPaciente,
      u_doc.Nombres AS NombreDoctor,   u_doc.Apellidos AS ApellidosDoctor
    FROM tbl_citas c
    LEFT JOIN tbl_paciente   p     ON c.idPaciente = p.idPaciente
    LEFT JOIN tbl_usuarios   u_pac ON p.idUsuario  = u_pac.idUsuario
    LEFT JOIN tbl_doctores   d     ON c.idDoctor   = d.idDoctor
    LEFT JOIN tbl_usuarios   u_doc ON d.idUsuario  = u_doc.idUsuario
    WHERE p.idUsuario = ?
    ORDER BY c.fecha DESC, c.hora DESC
  `, [idUsuario], cb),

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

  create:    (data, cb) => db.query("INSERT INTO tbl_citas SET ?", data, cb),
  update:    (id, data, cb) => db.query("UPDATE tbl_citas SET ? WHERE idcita = ?", [data, id], cb),
  delete:    (id, cb) => db.query("DELETE FROM tbl_citas WHERE idcita = ?", [id], cb),
  completar: (id, cb) => db.query("UPDATE tbl_citas SET estado = 'COMPLETADA' WHERE idCita = ?", [id], cb),

  // HU11
  getByPaciente: (idPaciente, cb) => db.query(`
    SELECT c.*,
      u_doc.Nombres   AS NombreDoctor,
      u_doc.Apellidos AS ApellidosDoctor,
      doc.Especialidad
    FROM tbl_citas c
    LEFT JOIN tbl_doctores   d     ON c.idDoctor  = d.idDoctor
    LEFT JOIN tbl_usuarios   u_doc ON d.idUsuario = u_doc.idUsuario
    LEFT JOIN tbl_doctores   doc   ON c.idDoctor  = doc.idDoctor
    WHERE c.idPaciente = ?
    ORDER BY c.fecha DESC, c.hora DESC
  `, [idPaciente], cb),

  cancelar: (idCita, idPaciente, cb) => db.query(`
    UPDATE tbl_citas SET estado = 'CANCELADA'
    WHERE idCita = ? AND idPaciente = ?
      AND estado IN ('PENDIENTE', 'CONFIRMADA')`,
    [idCita, idPaciente], cb),

  reprogramar: (idCita, idPaciente, fecha, hora, cb) => db.query(`
    UPDATE tbl_citas SET fecha = ?, hora = ?, estado = 'PENDIENTE'
    WHERE idCita = ? AND idPaciente = ?
      AND estado IN ('PENDIENTE', 'CONFIRMADA')`,
    [fecha, hora, idCita, idPaciente], cb),

  // ── NUEVO: citas filtradas por idDoctor (para Mi Horario) ─────────────────
  getByDoctor: (idDoctor, cb) => db.query(`
    SELECT c.*,
      u_pac.Nombres   AS NombrePaciente,
      u_pac.Apellidos AS ApellidosPaciente
    FROM tbl_citas c
    LEFT JOIN tbl_paciente   p     ON c.idPaciente = p.idPaciente
    LEFT JOIN tbl_usuarios   u_pac ON p.idUsuario  = u_pac.idUsuario
    WHERE c.idDoctor = ?
    ORDER BY c.fecha DESC, c.hora ASC
  `, [idDoctor], cb),

};

module.exports = Cita;
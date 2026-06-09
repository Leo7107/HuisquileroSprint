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
    LEFT JOIN tbl_doctores   doc   ON c.idDoctor   = doc.idDoctor
    LEFT JOIN tbl_usuarios   u_doc ON doc.idUsuario = u_doc.idUsuario
    WHERE c.idCita = ?
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
    const base = `
      SELECT idCita FROM tbl_citas
      WHERE idDoctor = ?
        AND DATE(fecha) = DATE(?)
        AND estado NOT IN ('CANCELADA','COMPLETADA','FINALIZADA')
        AND ABS(TIME_TO_SEC(TIMEDIFF(hora, ?))) < 5400`;
    if (excludeId) {
      db.query(base + ` AND idCita <> ?`, [idDoctor, fecha, hora, excludeId], cb);
    } else {
      db.query(base, [idDoctor, fecha, hora], cb);
    }
  },

  getDisponibilidad: (fecha, hora, cb) => db.query(
    `SELECT d.idDoctor, u.Nombres, u.Apellidos, d.Especialidad,
            d.Consultorio, d.hora_inicio, d.hora_fin
     FROM tbl_doctores d
     JOIN tbl_usuarios u ON d.idUsuario = u.idUsuario
     WHERE d.Estado = 'ACTIVO'
       AND ? >= d.hora_inicio
       AND ? <= d.hora_fin
       AND d.idDoctor NOT IN (
         SELECT idDoctor FROM tbl_citas
         WHERE DATE(fecha) = ?
           AND estado NOT IN ('CANCELADA','COMPLETADA','FINALIZADA')
           AND ABS(TIME_TO_SEC(TIMEDIFF(hora, ?))) < 5400
       )
     ORDER BY u.Apellidos, u.Nombres`,
    [hora, hora, fecha, hora], cb
  ),

  create:    (data, cb) => db.query("INSERT INTO tbl_citas SET ?", data, cb),
  update:    (id, data, cb) => db.query("UPDATE tbl_citas SET ? WHERE idCita = ?", [data, id], cb),
  delete:    (id, cb) => db.query("DELETE FROM tbl_citas WHERE idCita = ?", [id], cb),
  completar: (id, cb) => db.query("UPDATE tbl_citas SET estado = 'FINALIZADA' WHERE idCita = ?", [id], cb),

  // HU11
  getByPaciente: (idPaciente, cb) => db.query(`
    SELECT c.*,
      u_doc.Nombres   AS NombreDoctor,
      u_doc.Apellidos AS ApellidosDoctor,
      doc.Especialidad
    FROM tbl_citas c
    LEFT JOIN tbl_doctores   doc   ON c.idDoctor  = doc.idDoctor
    LEFT JOIN tbl_usuarios   u_doc ON doc.idUsuario = u_doc.idUsuario
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

  // ── FLUJO REASIGNACIÓN: el doctor reporta un inconveniente ────────────────
  // Marca la cita como REQUIERE_REASIGNACION solo si pertenece a ese doctor
  // y todavía no fue atendida ni cancelada.
  reportarInconveniente: (idCita, idDoctor, cb) => db.query(`
    UPDATE tbl_citas SET estado = 'REQUIERE_REASIGNACION'
    WHERE idCita = ? AND idDoctor = ?
      AND estado IN ('PENDIENTE', 'CONFIRMADA')`,
    [idCita, idDoctor], cb),

  // ── FLUJO REASIGNACIÓN: la recepcionista asigna otro doctor ───────────────
  // Cambia el doctor y deja la cita CONFIRMADA para continuar el flujo normal.
  reasignar: (idCita, nuevoIdDoctor, cb) => db.query(`
    UPDATE tbl_citas SET idDoctor = ?, estado = 'CONFIRMADA'
    WHERE idCita = ? AND estado = 'REQUIERE_REASIGNACION'`,
    [nuevoIdDoctor, idCita], cb),

  // ── FLUJO REASIGNACIÓN: cancelar por falta de doctores disponibles ────────
  cancelarPorRecepcion: (idCita, motivo, cb) => db.query(`
    UPDATE tbl_citas SET estado = 'CANCELADA', motivo = ?
    WHERE idCita = ?
      AND estado IN ('PENDIENTE', 'CONFIRMADA', 'REQUIERE_REASIGNACION')`,
    [motivo, idCita], cb),

};

module.exports = Cita;
const db = require("../config/db");

const Doctor = {
  // Trae todos los doctores con datos al usuario vinculado
  getAll: (cb) =>
    db.query(
      `SELECT d.idDoctor, d.Especialidad, d.Consultorio, d.Horario,
              d.hora_inicio, d.hora_fin, d.numero_junta_medica,
              d.Telefono, d.idUsuario, d.Estado,
              u.Nombres, u.Apellidos, u.Email
      FROM tbl_doctores d
      LEFT JOIN tbl_usuarios u ON d.idUsuario = u.idUsuario
      ORDER BY d.idDoctor DESC`,
      cb
    ),

   // Solo doctores ACTIVOS para agendar citas
  getAllActivos: (cb) =>
    db.query(
      `SELECT d.idDoctor, d.Especialidad, d.Consultorio, d.Horario,
              d.hora_inicio, d.hora_fin, d.numero_junta_medica,
              d.Telefono, d.idUsuario, d.Estado,
              u.Nombres, u.Apellidos, u.Email
       FROM tbl_doctores d
       LEFT JOIN tbl_usuarios u ON d.idUsuario = u.idUsuario
       WHERE d.Estado = 'ACTIVO'
       ORDER BY u.Nombres ASC`,
      cb
    ),

    getById: (id, cb) =>
    db.query(
      `SELECT d.idDoctor, d.Especialidad, d.Consultorio, d.Horario,
              d.hora_inicio, d.hora_fin, d.numero_junta_medica,
              d.Telefono, d.idUsuario, d.Estado,
              u.Nombres, u.Apellidos, u.Email
       FROM tbl_doctores d
       LEFT JOIN tbl_usuarios u ON d.idUsuario = u.idUsuario
       WHERE d.idDoctor = ?`,
      [id],
      cb
    ),

    // Criterio 3: verificar duplicado de número de junta médica
  getByJunta: (numero_junta_medica, excludeId = null, cb) => {
    if (excludeId) {
      db.query(
        "SELECT idDoctor FROM tbl_doctores WHERE numero_junta_medica = ? AND idDoctor != ?",
        [numero_junta_medica, excludeId],
        cb
      );
    } else {
      db.query(
        "SELECT idDoctor FROM tbl_doctores WHERE numero_junta_medica = ?",
        [numero_junta_medica],
        cb
      );
    }
  },

  // Verificar duplicado de idUsuario
  getByUsuario: (idUsuario, excludeId = null, cb) => {
    if (excludeId) {
      db.query(
        "SELECT idDoctor FROM tbl_doctores WHERE idUsuario = ? AND idDoctor != ?",
        [idUsuario, excludeId],
        cb
      );
    } else {
      db.query(
        "SELECT idDoctor FROM tbl_doctores WHERE idUsuario = ?",
        [idUsuario],
        cb
      );
    }
  },

   create: (data, cb) => db.query("INSERT INTO tbl_doctores SET ?", data, cb),

  update: (id, data, cb) =>
    db.query("UPDATE tbl_doctores SET ? WHERE idDoctor = ?", [data, id], cb),

  desactivar: (id, cb) =>
    db.query(
      "UPDATE tbl_doctores SET Estado = 'INACTIVO' WHERE idDoctor = ?",
      [id],
      cb
    ),

  activar: (id, cb) =>
    db.query(
      "UPDATE tbl_doctores SET Estado = 'ACTIVO' WHERE idDoctor = ?",
      [id],
      cb
    ),

  delete: (id, cb) =>
    db.query("DELETE FROM tbl_doctores WHERE idDoctor = ?", [id], cb),

};

module.exports = Doctor;
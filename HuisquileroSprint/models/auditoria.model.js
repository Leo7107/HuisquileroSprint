const db = require('../config/db');

const AuditoriaModel = {

  // Últimas 10 acciones
  getRecientes: (cb) => db.query(
    `SELECT idAuditoria, accion, descripcion, nombreUsuario, modulo, fecha
     FROM tbl_auditoria
     ORDER BY fecha DESC
     LIMIT 10`,
    cb
  ),

  // Registrar una acción (llamar desde otros controladores)
  registrar: (data, cb) => db.query(
    `INSERT INTO tbl_auditoria SET ?`,
    data,
    cb
  ),
};

module.exports = AuditoriaModel;
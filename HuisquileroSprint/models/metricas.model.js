const db = require('../config/db');

const MetricasModel = {

  // Total pacientes registrados
  totalPacientes: (cb) => db.query(
    `SELECT COUNT(*) AS total FROM tbl_paciente`,
    cb
  ),

  // Citas de hoy por estado
  citasHoy: (cb) => db.query(
    `SELECT estado, COUNT(*) AS total
     FROM tbl_citas
     WHERE DATE(fecha) = CURDATE()
     GROUP BY estado`,
    cb
  ),

  // Médicos activos
  medicosActivos: (cb) => db.query(
    `SELECT COUNT(*) AS total FROM tbl_doctores WHERE Estado = 'ACTIVO'`,
    cb
  ),

  // Medicamentos en stock crítico (stock_actual <= stock_minimo)
  alertasInventario: (cb) => db.query(
    `SELECT idMedicamento, nombre, stock_actual, stock_minimo, unidad_medida
     FROM tbl_medicamentos
     WHERE stock_actual <= stock_minimo AND estado = 'ACTIVO'
     ORDER BY stock_actual ASC`,
    cb
  ),

  // Resumen completo en una sola llamada
  resumenGeneral: (cb) => db.query(
    `SELECT
       (SELECT COUNT(*) FROM tbl_paciente)                              AS totalPacientes,
       (SELECT COUNT(*) FROM tbl_doctores WHERE Estado = 'ACTIVO')     AS medicosActivos,
       (SELECT COUNT(*) FROM tbl_usuarios WHERE estado = 'ACTIVO')     AS usuariosActivos,
       (SELECT COUNT(*) FROM tbl_medicamentos
        WHERE stock_actual <= stock_minimo AND estado = 'ACTIVO')      AS alertasInventario,
       (SELECT COUNT(*) FROM tbl_citas WHERE DATE(fecha) = CURDATE())  AS citasHoy,
       (SELECT COUNT(*) FROM tbl_citas
        WHERE DATE(fecha) = CURDATE() AND estado = 'COMPLETADA')       AS citasCompletadas,
       (SELECT COUNT(*) FROM tbl_citas
        WHERE DATE(fecha) = CURDATE() AND estado = 'CANCELADA')        AS citasCanceladas`,
    cb
  ),
};

module.exports = MetricasModel;
// models/reportes.model.js — HU12
// Compatible con TiDB only_full_group_by
const db = require('../config/db');

const ReportesModel = {

  // ── KPIs globales de citas (sin GROUP BY — solo agregados) ─────────────────
  getCitasKPIs: ({ fechaInicio, fechaFin, idDoctor, especialidad }, cb) => {
    let sql = `
      SELECT
        COUNT(c.idCita)                                              AS total,
        SUM(c.estado IN ('FINALIZADA','COMPLETADA'))                 AS atendidas,
        SUM(c.estado = 'CANCELADA')                                  AS canceladas,
        SUM(c.estado = 'PENDIENTE')                                  AS pendientes,
        COUNT(DISTINCT c.idPaciente)                                 AS pacientesAtendidos
      FROM tbl_citas c
      INNER JOIN tbl_doctores d ON c.idDoctor = d.idDoctor
      WHERE c.fecha BETWEEN ? AND ?
    `;
    const p = [fechaInicio, fechaFin];
    if (idDoctor)     { sql += ' AND d.idDoctor = ?';     p.push(idDoctor); }
    if (especialidad) { sql += ' AND d.Especialidad = ?'; p.push(especialidad); }
    db.query(sql, p, cb);
  },

  // ── Detalle por médico — GROUP BY con todas las columnas no-agregadas ──────
  getCitasPorMedico: ({ fechaInicio, fechaFin, idDoctor, especialidad }, cb) => {
    let sql = `
      SELECT
        d.idDoctor,
        u.Nombres,
        u.Apellidos,
        CONCAT(u.Nombres, ' ', u.Apellidos) AS nombreDoctor,
        d.Especialidad,
        COUNT(c.idCita)                                             AS total,
        SUM(c.estado IN ('FINALIZADA','COMPLETADA'))                AS atendidas,
        SUM(c.estado = 'CANCELADA')                                 AS canceladas,
        SUM(c.estado = 'PENDIENTE')                                 AS pendientes,
        ROUND(
          SUM(c.estado IN ('FINALIZADA','COMPLETADA')) * 100.0 / NULLIF(COUNT(c.idCita), 0), 1
        ) AS pctAtendidas
      FROM tbl_citas c
      INNER JOIN tbl_doctores d ON c.idDoctor  = d.idDoctor
      INNER JOIN tbl_usuarios u ON d.idUsuario = u.idUsuario
      WHERE c.fecha BETWEEN ? AND ?
    `;
    const p = [fechaInicio, fechaFin];
    if (idDoctor)     { sql += ' AND d.idDoctor = ?';     p.push(idDoctor); }
    if (especialidad) { sql += ' AND d.Especialidad = ?'; p.push(especialidad); }
    sql += `
      GROUP BY d.idDoctor, u.Nombres, u.Apellidos, d.Especialidad
      ORDER BY total DESC
    `;
    db.query(sql, p, cb);
  },

  // ── KPIs del médico (solo agregados — sin GROUP BY) ────────────────────────
  getConsultasKPIsMedico: (idDoctor, { fechaInicio, fechaFin }, cb) => {
    const sql = `
      SELECT
        COUNT(DISTINCT co.idConsulta)    AS totalConsultas,
        COUNT(DISTINCT r.idReceta)       AS totalRecetas,
        COUNT(DISTINCT di.idDiagnostico) AS totalDiagnosticos,
        COUNT(DISTINCT ci.idPaciente)    AS pacientesAtendidos
      FROM tbl_citas ci
      INNER JOIN tbl_consultas    co ON co.idCita        = ci.idCita
      LEFT  JOIN tbl_diagnosticos di ON di.idConsulta    = co.idConsulta
      LEFT  JOIN tbl_recetas      r  ON r.idDiagnostico  = di.idDiagnostico
      WHERE ci.idDoctor = ?
        AND ci.fecha >= ? AND ci.fecha < DATE_ADD(?, INTERVAL 1 DAY)
    `;
    db.query(sql, [idDoctor, fechaInicio, fechaFin, fechaFin], cb);
  },

  // ── Top 5 diagnósticos — GROUP BY columna seleccionada ────────────────────
  getDiagnosticosFrecuentes: (idDoctor, { fechaInicio, fechaFin }, cb) => {
    const sql = `
      SELECT
        di.descripcion,
        COUNT(*) AS frecuencia
      FROM tbl_diagnosticos di
      INNER JOIN tbl_consultas co ON di.idConsulta = co.idConsulta
      INNER JOIN tbl_citas     ci ON co.idCita     = ci.idCita
      WHERE ci.idDoctor = ?
        AND ci.fecha >= ? AND ci.fecha < DATE_ADD(?, INTERVAL 1 DAY)
      GROUP BY di.descripcion
      ORDER BY frecuencia DESC
      LIMIT 5
    `;
    db.query(sql, [idDoctor, fechaInicio, fechaFin, fechaFin], cb);
  },

  // ── Últimas 10 recetas — sin GROUP BY, solo ORDER BY ──────────────────────
  getRecetasMedico: (idDoctor, { fechaInicio, fechaFin }, cb) => {
    const sql = `
      SELECT
        r.idReceta,
        COALESCE(m.nombre, r.medicamento)        AS medicamento,
        r.dosis,
        r.frecuencia,
        NULLIF(r.duracion, '')                   AS duracion,
        ci.fecha,
        CONCAT(up.Nombres, ' ', up.Apellidos)    AS paciente
      FROM tbl_recetas       r
      INNER JOIN tbl_diagnosticos di ON r.idDiagnostico = di.idDiagnostico
      INNER JOIN tbl_consultas    co ON di.idConsulta   = co.idConsulta
      INNER JOIN tbl_citas        ci ON co.idCita       = ci.idCita
      INNER JOIN tbl_paciente     pa ON ci.idPaciente   = pa.idPaciente
      INNER JOIN tbl_usuarios     up ON pa.idUsuario    = up.idUsuario
      LEFT  JOIN tbl_medicamentos m  ON r.idMedicamento = m.idMedicamento
      WHERE ci.idDoctor = ?
        AND ci.fecha >= ? AND ci.fecha < DATE_ADD(?, INTERVAL 1 DAY)
      ORDER BY ci.fecha DESC
      LIMIT 10
    `;
    db.query(sql, [idDoctor, fechaInicio, fechaFin, fechaFin], cb);
  },

  // ── KPIs inventario (solo agregados — sin GROUP BY) ───────────────────────
  getInventarioKPIs: (cb) => {
    db.query(`
      SELECT
        COUNT(*)                                               AS totalMedicamentos,
        SUM(stock_actual > stock_minimo)                       AS enStock,
        SUM(stock_actual > 0 AND stock_actual <= stock_minimo) AS enAlerta,
        SUM(stock_actual = 0)                                  AS agotados,
        ROUND(SUM(stock_actual * precio_unitario), 2)          AS valorTotal
      FROM tbl_medicamentos
      WHERE estado = 'ACTIVO'
    `, cb);
  },

  // ── Detalle inventario — CASE en ORDER BY sin alias ───────────────────────
  getInventarioDetalle: (cb) => {
    db.query(`
      SELECT
        idMedicamento,
        nombre,
        stock_actual,
        stock_minimo,
        unidad_medida,
        precio_unitario,
        estado,
        CASE
          WHEN stock_actual = 0             THEN 'agotado'
          WHEN stock_actual <= stock_minimo THEN 'alerta'
          ELSE                                   'normal'
        END AS nivelStock
      FROM tbl_medicamentos
      ORDER BY
        CASE
          WHEN stock_actual = 0             THEN 0
          WHEN stock_actual <= stock_minimo THEN 1
          ELSE                                   2
        END ASC,
        nombre ASC
    `, cb);
  },

  // ── Helpers filtros ────────────────────────────────────────────────────────
  getDoctoresActivos: (cb) => {
    db.query(`
      SELECT
        d.idDoctor,
        u.Nombres,
        u.Apellidos,
        CONCAT(u.Nombres, ' ', u.Apellidos) AS nombre,
        d.Especialidad
      FROM tbl_doctores d
      INNER JOIN tbl_usuarios u ON d.idUsuario = u.idUsuario
      WHERE d.Estado = 'ACTIVO'
      ORDER BY u.Nombres ASC, u.Apellidos ASC
    `, cb);
  },

  getEspecialidades: (cb) => {
    db.query(`
      SELECT DISTINCT Especialidad
      FROM tbl_doctores
      WHERE Estado = 'ACTIVO'
      ORDER BY Especialidad
    `, cb);
  },
};

module.exports = ReportesModel;
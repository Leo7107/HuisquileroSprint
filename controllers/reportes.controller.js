// controllers/reportes.controller.js — HU12
const Reportes = require('../models/reportes.model');
const db       = require('../config/db');

function parseFiltros(query) {
  const hoy    = new Date().toISOString().split('T')[0];
  const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  return {
    fechaInicio:  query.fechaInicio  || hace30,
    fechaFin:     query.fechaFin     || hoy,
    idDoctor:     query.idDoctor     || null,
    especialidad: query.especialidad || null,
  };
}

// GET /api/reportes/filtros — Admin
exports.getFiltros = (req, res) => {
  if (req.user.rol !== 1)
    return res.status(403).json({ error: 'Solo administradores.' });

  Reportes.getDoctoresActivos((err, doctores) => {
    if (err) return res.status(500).json({ error: err });
    Reportes.getEspecialidades((err2, rows) => {
      if (err2) return res.status(500).json({ error: err2 });
      res.json({ doctores, especialidades: rows.map(r => r.Especialidad) });
    });
  });
};

// GET /api/reportes/citas — Admin
exports.getReporteCitas = (req, res) => {
  if (req.user.rol !== 1)
    return res.status(403).json({ error: 'Solo administradores.' });

  const filtros = parseFiltros(req.query);

  Reportes.getCitasKPIs(filtros, (err, rows) => {
    if (err) return res.status(500).json({ error: err });
    const kpis = rows[0];
    Reportes.getCitasPorMedico(filtros, (err2, detalle) => {
      if (err2) return res.status(500).json({ error: err2 });
      res.json({ kpis, detalle, filtros });
    });
  });
};

// GET /api/reportes/consultas-medico — Doctor
exports.getReporteConsultasMedico = (req, res) => {
  if (req.user.rol !== 30002)
    return res.status(403).json({ error: 'Solo médicos.' });

  const filtros   = parseFiltros(req.query);
  const idUsuario = req.user.id;

  db.query('SELECT idDoctor FROM tbl_doctores WHERE idUsuario = ?', [idUsuario], (err, rows) => {
    if (err)          return res.status(500).json({ error: err });
    if (!rows.length) return res.status(404).json({ error: 'Médico no encontrado.' });

    const idDoctor = rows[0].idDoctor;

    Reportes.getConsultasKPIsMedico(idDoctor, filtros, (e1, kpiRows) => {
      if (e1) return res.status(500).json({ error: e1 });
      Reportes.getDiagnosticosFrecuentes(idDoctor, filtros, (e2, diagnosticos) => {
        if (e2) return res.status(500).json({ error: e2 });
        Reportes.getRecetasMedico(idDoctor, filtros, (e3, recetas) => {
          if (e3) return res.status(500).json({ error: e3 });
          res.json({ resumen: kpiRows[0], diagnosticos, recetas, filtros });
        });
      });
    });
  });
};

// GET /api/reportes/inventario — Admin
exports.getReporteInventario = (req, res) => {
  if (req.user.rol !== 1)
    return res.status(403).json({ error: 'Solo administradores.' });

  Reportes.getInventarioKPIs((err, rows) => {
    if (err) return res.status(500).json({ error: err });
    const kpis = rows[0];
    Reportes.getInventarioDetalle((err2, medicamentos) => {
      if (err2) return res.status(500).json({ error: err2 });
      res.json({ kpis, medicamentos });
    });
  });
};
// controllers/reportes.controller.js — HU12
const Reportes = require('../models/reportes.model');
const db       = require('../config/db');
const PDFDocument = require('pdfkit'); // Requisito para exportar en formato PDF

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

// GET /api/reportes/inventario — Admin y Médico (Actualizado con los 3 criterios)
exports.getReporteInventario = (req, res) => {
  // CRITERIO 3: Los reportes son accesibles solo para roles autorizados (admin=1 y médico=30002)
  if (req.user.rol !== 1 && req.user.rol !== 30002) {
    return res.status(403).json({ error: 'Acceso denegado. Solo administradores y médicos.' });
  }

  // 1. Obtener los KPIs del Inventario desde tu modelo existente
  Reportes.getInventarioKPIs((err, rows) => {
    if (err) return res.status(500).json({ error: err });
    const kpis = rows[0];

    // 2. Obtener el detalle de los medicamentos en stock, alerta y agotados
    Reportes.getInventarioDetalle((err2, medicamentos) => {
      if (err2) return res.status(500).json({ error: err2 });

      // Si el cliente pide explícitamente el PDF (ej: /api/reportes/inventario?format=pdf)
      if (req.query.format === 'pdf') {
        try {
          // CRITERIO 1: Los reportes se pueden exportar en PDF.
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', 'attachment; filename=reporte-inventario.pdf');

          const doc = new PDFDocument({ margin: 50 });
          doc.pipe(res);

          // Encabezado del PDF
          doc.fontSize(18).text('REPORTE DE ESTADO DE INVENTARIO', { align: 'center' });
          doc.moveDown();
          doc.fontSize(10).text(`Generado por ID Usuario: ${req.user.id} | Rol: ${req.user.rol === 1 ? 'Administrador' : 'Médico'}`);
          doc.text(`Fecha y Hora: ${new Date().toLocaleString()}`);
          doc.moveDown();

          // Resumen de KPIs
          doc.fontSize(12).text('Resumen de Inventario:', { underline: true });
          doc.fontSize(10).text(`Total Medicamentos registrados: ${kpis?.total_medicamentos || 0}`);
          doc.text(`Medicamentos en Alerta de Stock: ${kpis?.en_alerta || 0}`);
          doc.text(`Medicamentos Agotados: ${kpis?.agotados || 0}`);
          doc.moveDown();

          // Tabla / Listado de Medicamentos
          doc.fontSize(12).text('Detalle de Stock:', { underline: true });
          doc.moveDown(0.5);

          if (medicamentos && medicamentos.length > 0) {
            medicamentos.forEach((med, i) => {
              doc.fontSize(10).text(`${i + 1}. ${med.Nombre || med.nombre} — Stock: ${med.Stock || med.stock} unidades [Estado: ${med.Estado || med.estado || 'OK'}]`);
            });
          } else {
            doc.fontSize(10).text('No hay medicamentos registrados en el inventario.');
          }

          doc.end(); // Finaliza y envía el archivo al navegador

          // CRITERIO 2: El sistema registra en el log de auditoría cada generación con usuario y fecha.
          const queryLog = `
            INSERT INTO tbl_log_auditoria (idUsuario, accion, fecha) 
            VALUES (?, ?, NOW())
          `;
          const accionDetalle = `Exportó reporte de inventario a PDF (Total: ${kpis?.total_medicamentos || 0} meds)`;
          
          db.query(queryLog, [req.user.id, accionDetalle], (errLog) => {
            if (errLog) console.error('Error guardando el log de auditoría:', errLog);
          });

        } catch (pdfError) {
          console.error('Error generando el PDF:', pdfError);
          if (!res.headersSent) res.status(500).json({ error: 'Error al generar el PDF.' });
        }

      } else {
        // Si no pide PDF, sigue respondiendo con el JSON original para no romper el Frontend actual
        res.json({ kpis, medicamentos });
      }
    });
  });
};

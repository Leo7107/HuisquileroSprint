const PDFDocument = require('pdfkit'); // Asegúrate de agregar este require al inicio de tu archivo si no está

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
          doc.fontSize(10).text(`Total Medicamentos registrados: ${kpis.total_medicamentos || 0}`);
          doc.text(`Medicamentos en Alerta de Stock: ${kpis.en_alerta || 0}`);
          doc.text(`Medicamentos Agotados: ${kpis.agotados || 0}`);
          doc.moveDown();

          // Tabla / Listado de Medicamentos
          doc.fontSize(12).text('Detalle de Stock:', { underline: true });
          doc.moveDown(0.5);

          medicamentos.forEach((med, i) => {
            // Ajusta med.nombre, med.stock, med.estado según las columnas reales de tu base de datos
            doc.fontSize(10).text(`${i + 1}. ${med.Nombre || med.nombre} — Stock: ${med.Stock || med.stock} unidades [Estado: ${med.Estado || med.estado || 'OK'}]`);
          });

          doc.end(); // Finaliza y envía el archivo al navegador

          // CRITERIO 2: El sistema registra en el log de auditoría cada generación con usuario y fecha.
          // Insertamos directamente en tu tabla de auditoría usando la conexión de 'db'
          const queryLog = `
            INSERT INTO tbl_log_auditoria (idUsuario, accion, fecha) 
            VALUES (?, ?, NOW())
          `;
          const accionDetalle = `Exportó reporte de inventario a PDF (Total: ${kpis.total_medicamentos} meds)`;
          
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

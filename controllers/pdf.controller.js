/**
 * pdf.controller.js  —  HU11: Generación de documentos PDF
 *
 * Rutas:
 *   GET /api/pdf/receta/:idReceta          → PDF de una receta
 *   GET /api/pdf/historial/:idPaciente     → PDF historial clínico completo
 *   GET /api/pdf/diagnosticos/:idPaciente  → PDF diagnósticos del paciente
 *
 * Dependencia: pdfkit  (npm install pdfkit)
 */

const PDFDocument = require('pdfkit');
const db          = require('../config/db');

// ─── Paleta de colores (misma que dashboard.css) ─────────────────────────────
const C = {
  deep:      '#1a2e2a',
  teal:      '#2a6b5e',
  tealLight: '#3d8c7c',
  gold:      '#c9a84c',
  cream:     '#f5f0e8',
  textSoft:  '#5a7069',
  white:     '#ffffff',
  danger:    '#c03030',
};

// ─── Helpers de dibujo ───────────────────────────────────────────────────────

function headerDoc(doc, titulo, subtitulo = '') {
  doc.rect(0, 0, doc.page.width, 90).fill(C.deep);
  doc.rect(0, 86, doc.page.width, 4).fill(C.gold);
  doc.fontSize(20).fillColor(C.white).font('Helvetica-Bold')
     .text('Medisync', 40, 22);
  doc.fontSize(9).fillColor(C.gold).font('Helvetica')
     .text('Sistema de Gestion Clinica', 40, 46);
  doc.fontSize(13).fillColor(C.white).font('Helvetica-Bold')
     .text(titulo, 0, 22, { align: 'right', width: doc.page.width - 40 });
  if (subtitulo) {
    doc.fontSize(9).fillColor(C.gold).font('Helvetica')
       .text(subtitulo, 0, 44, { align: 'right', width: doc.page.width - 40 });
  }
  doc.moveDown(0.5);
}

// ── FIX emojis ────────────────────────────────────────────────────────────────
// Helvetica no soporta emojis — se limpian antes de renderizar.
// ─────────────────────────────────────────────────────────────────────────────
function sectionTitle(doc, texto) {
  const textoLimpio = texto.replace(/[\u{1F000}-\u{1FFFF}]/gu, '').replace(/[\u2600-\u27BF]/g, '').trim();
  const y = doc.y + 10;
  doc.rect(40, y, doc.page.width - 80, 24).fill(C.teal);
  doc.fontSize(10).fillColor(C.white).font('Helvetica-Bold')
     .text(textoLimpio.toUpperCase(), 52, y + 7);
  doc.y = y + 32;
}

function fieldRow(doc, label, value, x = 40, width = 240) {
  const safeVal = value && String(value).trim() ? String(value) : '—';
  doc.fontSize(8.5).fillColor(C.textSoft).font('Helvetica-Bold').text(label, x, doc.y);
  doc.fontSize(9.5).fillColor(C.deep).font('Helvetica').text(safeVal, x, doc.y + 11);
  return doc.y + 26;
}

function twoCol(doc, items) {
  const half  = Math.ceil(items.length / 2);
  const left  = items.slice(0, half);
  const right = items.slice(half);
  const startY = doc.y;

  doc.y = startY;
  left.forEach(([l, v]) => { doc.y = fieldRow(doc, l, v, 40, 240); });
  const leftEnd = doc.y;

  doc.y = startY;
  right.forEach(([l, v]) => { doc.y = fieldRow(doc, l, v, 310, 240); });
  const rightEnd = doc.y;

  doc.y = Math.max(leftEnd, rightEnd);
}

function footerDoc(doc) {
  const bottom = doc.page.height - 40;
  // Anular el margen inferior evita que pdfkit agregue una página en blanco
  // al escribir texto dentro de la zona de margen.
  doc.page.margins.bottom = 0;
  doc.rect(0, bottom - 6, doc.page.width, 1).fill(C.gold);
  doc.fontSize(7.5).fillColor(C.textSoft).font('Helvetica')
     .text(
       `Generado el ${new Date().toLocaleDateString('es-SV', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' })}  •  Medisync — Documento oficial`,
       40, bottom + 2, { align: 'center', width: doc.page.width - 80, lineBreak: false }
     );
}

function addPageIfNeeded(doc, spaceNeeded = 80) {
  if (doc.y + spaceNeeded > doc.page.height - 60) {
    doc.addPage();
    doc.y = 40;
  }
}

// ─── Promisify db.query ──────────────────────────────────────────────────────
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// ─── Helpers específicos de receta ───────────────────────────────────────────
function fmtFecha(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function calcEdad(nac) {
  if (!nac) return null;
  const d = new Date(nac);
  if (isNaN(d.getTime())) return null;
  const e = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
  return (e >= 0 && e < 130) ? e : null;
}

// Dibuja un "chip" redondeado (etiqueta: valor) y devuelve el siguiente X.
function chip(doc, x, y, label, value) {
  const txt = `${label}: ${value}`;
  doc.font('Helvetica-Bold').fontSize(8.5);
  const w = doc.widthOfString(txt) + 16;
  doc.roundedRect(x, y, w, 18, 5).fill('#eaf3f0');
  doc.fillColor(C.teal).font('Helvetica-Bold').fontSize(8.5)
     .text(txt, x + 8, y + 5, { lineBreak: false });
  return x + w + 6;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PDF DE RECETA (agrupa todos los medicamentos de la misma consulta)
// GET /api/pdf/receta/:idReceta
// ─────────────────────────────────────────────────────────────────────────────
exports.pdfReceta = async (req, res) => {
  const idReceta = parseInt(req.params.idReceta);

  try {
    // 1) Resolver la consulta a la que pertenece la receta clickeada.
    const linkRows = await query(`
      SELECT diag.idConsulta
      FROM tbl_recetas r
      LEFT JOIN tbl_diagnosticos diag ON r.idDiagnostico = diag.idDiagnostico
      WHERE r.idReceta = ?`, [idReceta]);

    if (!linkRows.length) return res.status(404).json({ error: 'Receta no encontrada' });
    const idConsulta = linkRows[0].idConsulta;

    // 2) Traer TODOS los medicamentos de esa consulta (o solo la receta si no
    //    tiene consulta asociada).
    const baseSelect = `
      SELECT r.idReceta, r.medicamento, r.dosis, r.frecuencia, r.duracion,
             r.indicaciones, r.cantidad,
             u_pac.Nombres   AS NombrePaciente,
             u_pac.Apellidos AS ApellidosPaciente,
             u_pac.Sexo      AS SexoPaciente,
             u_pac.Fecha_nacimiento AS NacPaciente,
             p.numero_expediente    AS Expediente,
             u_doc.Nombres   AS NombreDoctor,
             u_doc.Apellidos AS ApellidosDoctor,
             doc.Especialidad,
             doc.numero_junta_medica AS JuntaMedica,
             doc.Consultorio,
             c.fecha          AS FechaCita,
             con.fecha_consulta AS FechaConsulta,
             diag.descripcion AS Diagnostico,
             m.nombre         AS NombreMedicamento,
             m.unidad_medida  AS UnidadMed
      FROM tbl_recetas r
      LEFT JOIN tbl_diagnosticos diag ON r.idDiagnostico = diag.idDiagnostico
      LEFT JOIN tbl_consultas    con  ON diag.idConsulta  = con.idConsulta
      LEFT JOIN tbl_citas        c    ON con.idCita        = c.idCita
      LEFT JOIN tbl_paciente     p    ON c.idPaciente      = p.idPaciente
      LEFT JOIN tbl_usuarios     u_pac ON p.idUsuario       = u_pac.idUsuario
      LEFT JOIN tbl_doctores     doc   ON c.idDoctor        = doc.idDoctor
      LEFT JOIN tbl_usuarios     u_doc ON doc.idUsuario     = u_doc.idUsuario
      LEFT JOIN tbl_medicamentos m     ON r.idMedicamento   = m.idMedicamento`;

    const rows = idConsulta
      ? await query(baseSelect + ` WHERE diag.idConsulta = ? ORDER BY r.idReceta`, [idConsulta])
      : await query(baseSelect + ` WHERE r.idReceta = ?`, [idReceta]);

    if (!rows.length) return res.status(404).json({ error: 'Receta no encontrada' });

    const r    = rows[0];                 // datos compartidos (paciente, doctor)
    const meds = rows;                    // lista de medicamentos
    const W    = 595.28;                  // ancho A4 en pt
    const LM   = 40, RM = 40;             // márgenes laterales
    const innerW = W - LM - RM;

    const doc = new PDFDocument({ size: 'A4', margins: { top: 100, bottom: 60, left: LM, right: RM } });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receta-${idReceta}.pdf"`);
    doc.pipe(res);

    const fechaDoc = r.FechaConsulta || r.FechaCita;
    headerDoc(doc, 'RECETA MEDICA', `Folio No. ${idReceta}  •  ${fmtFecha(fechaDoc)}`);

    // ── Tarjeta del paciente ──────────────────────────────────────────────────
    let y = 110;
    const cardH = 58;
    doc.roundedRect(LM, y, innerW, cardH, 8).fill(C.cream);
    doc.roundedRect(LM, y, 4, cardH, 2).fill(C.teal);

    doc.fillColor(C.deep).font('Helvetica-Bold').fontSize(13)
       .text(`${r.NombrePaciente || ''} ${r.ApellidosPaciente || ''}`.trim() || 'Paciente', LM + 16, y + 12);

    const edad = calcEdad(r.NacPaciente);
    const metaPac = [
      r.Expediente ? `Exp. ${r.Expediente}` : null,
      r.SexoPaciente ? (r.SexoPaciente === 'F' ? 'Femenino' : r.SexoPaciente === 'M' ? 'Masculino' : r.SexoPaciente) : null,
      edad != null ? `${edad} años` : null,
      `Fecha: ${fmtFecha(fechaDoc)}`,
    ].filter(Boolean).join('   •   ');
    doc.fillColor(C.textSoft).font('Helvetica').fontSize(9)
       .text(metaPac, LM + 16, y + 34);

    y += cardH + 14;

    // ── Diagnóstico (si existe) ───────────────────────────────────────────────
    if (r.Diagnostico) {
      doc.fillColor(C.textSoft).font('Helvetica-Bold').fontSize(8.5)
         .text('DIAGNOSTICO', LM, y);
      doc.fillColor(C.deep).font('Helvetica').fontSize(10)
         .text(r.Diagnostico, LM, y + 12, { width: innerW, lineGap: 2 });
      y = doc.y + 12;
    }

    // ── Encabezado de la zona de prescripción ─────────────────────────────────
    doc.roundedRect(LM, y, innerW, 26, 6).fill(C.teal);
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(15)
       .text('Rp.', LM + 14, y + 5);
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(10)
       .text(`PRESCRIPCION  (${meds.length} medicamento${meds.length !== 1 ? 's' : ''})`, LM + 50, y + 8);
    y = y + 26 + 14;

    // ── Tarjetas de medicamento ───────────────────────────────────────────────
    meds.forEach((med, i) => {
      // salto de página si no hay espacio
      if (y + 90 > doc.page.height - 70) { doc.addPage(); y = 50; }

      // número
      doc.circle(LM + 12, y + 10, 10).fill(C.teal);
      doc.fillColor(C.white).font('Helvetica-Bold').fontSize(10)
         .text(String(i + 1), LM + 7, y + 5, { width: 10, align: 'center', lineBreak: false });

      // nombre del medicamento
      doc.fillColor(C.deep).font('Helvetica-Bold').fontSize(13)
         .text(med.NombreMedicamento || med.medicamento || '—', LM + 32, y + 2, { width: innerW - 32 });
      let chipY = doc.y + 6;

      // chips: dosis, frecuencia, duración, cantidad
      let cx = LM + 32;
      const datos = [
        ['Dosis',      med.dosis      || '—'],
        ['Frecuencia', med.frecuencia || '—'],
        ['Duracion',   med.duracion   || '—'],
        ['Cantidad',   med.cantidad ? `${med.cantidad} ${med.UnidadMed || ''}`.trim() : '—'],
      ];
      datos.forEach(([l, v]) => {
        doc.font('Helvetica-Bold').fontSize(8.5);
        const wChip = doc.widthOfString(`${l}: ${v}`) + 16;
        if (cx + wChip > W - RM) { cx = LM + 32; chipY += 24; }
        cx = chip(doc, cx, chipY, l, v);
      });
      let endY = chipY + 24;

      // indicaciones (Sig.)
      if (med.indicaciones) {
        doc.fillColor(C.textSoft).font('Helvetica-Oblique').fontSize(9)
           .text(`Sig.: ${med.indicaciones}`, LM + 32, endY, { width: innerW - 40, lineGap: 2 });
        endY = doc.y + 6;
      }

      // separador
      if (i < meds.length - 1) {
        doc.moveTo(LM, endY + 4).lineTo(W - RM, endY + 4)
           .strokeColor('#e2ece9').lineWidth(0.5).stroke();
      }
      y = endY + 14;
    });

    // ── Firma ─────────────────────────────────────────────────────────────────
    if (y + 80 > doc.page.height - 70) { doc.addPage(); y = 60; }
    y += 24;
    const cx2 = W / 2;
    doc.moveTo(cx2 - 90, y).lineTo(cx2 + 90, y)
       .strokeColor(C.deep).lineWidth(0.6).stroke();
    doc.fillColor(C.deep).font('Helvetica-Bold').fontSize(9.5)
       .text(`Dr/Dra. ${r.NombreDoctor || ''} ${r.ApellidosDoctor || ''}`.trim(), cx2 - 150, y + 6, { width: 300, align: 'center' });
    doc.fillColor(C.textSoft).font('Helvetica').fontSize(8)
       .text(
         [r.Especialidad || 'Medico', r.JuntaMedica ? `Junta Medica No. ${r.JuntaMedica}` : null].filter(Boolean).join('  •  '),
         cx2 - 150, y + 20, { width: 300, align: 'center' }
       );

    footerDoc(doc);
    doc.end();

  } catch (err) {
    console.error('[PDF Receta]', err);
    if (!res.headersSent) res.status(500).json({ error: 'Error generando PDF de receta' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. PDF DE DIAGNÓSTICOS DEL PACIENTE
// GET /api/pdf/diagnosticos/:idPaciente
// ─────────────────────────────────────────────────────────────────────────────
exports.pdfDiagnosticos = async (req, res) => {
  const idPaciente = parseInt(req.params.idPaciente);

  try {
    const pacRows = await query(`
      SELECT u.Nombres, u.Apellidos, u.Email,
             p.numero_expediente, p.tipo_sangre
      FROM tbl_paciente p
      LEFT JOIN tbl_usuarios u ON p.idUsuario = u.idUsuario
      WHERE p.idPaciente = ?`, [idPaciente]);

    if (!pacRows.length) return res.status(404).json({ error: 'Paciente no encontrado' });

    const pac = pacRows[0];

    // ── FIX campos inexistentes ───────────────────────────────────────────────
    // ANTES: pedía d.codigo_cie, d.tipo, d.notas — no existen en tbl_diagnosticos.
    // CAMBIO: solo campos reales del schema.
    // ─────────────────────────────────────────────────────────────────────────
    const diagRows = await query(`
      SELECT d.idDiagnostico,
             d.descripcion,
             d.fecha_diagnostico,
             con.fecha_consulta,
             u_doc.Nombres    AS NombreDoctor,
             u_doc.Apellidos  AS ApellidosDoctor,
             doc.Especialidad,
             c.motivo         AS MotivoCita
      FROM tbl_diagnosticos d
      LEFT JOIN tbl_consultas  con   ON d.idConsulta  = con.idConsulta
      LEFT JOIN tbl_citas      c     ON con.idCita     = c.idCita
      LEFT JOIN tbl_doctores   doc   ON c.idDoctor     = doc.idDoctor
      LEFT JOIN tbl_usuarios   u_doc ON doc.idUsuario  = u_doc.idUsuario
      WHERE c.idPaciente = ?
      ORDER BY d.fecha_diagnostico DESC`, [idPaciente]);

    const doc = new PDFDocument({ size: 'A4', margins: { top: 100, bottom: 60, left: 40, right: 40 } });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="diagnosticos-paciente-${idPaciente}.pdf"`);
    doc.pipe(res);

    headerDoc(doc, 'DIAGNOSTICOS', `Expediente No. ${pac.numero_expediente || idPaciente}`);
    doc.y = 110;

    sectionTitle(doc, 'Datos del Paciente');
    twoCol(doc, [
      ['Paciente',      `${pac.Nombres} ${pac.Apellidos}`],
      ['Correo',         pac.Email            || '—'],
      ['Tipo de Sangre', pac.tipo_sangre       || '—'],
      ['N Expediente',   pac.numero_expediente || '—'],
    ]);
    doc.moveDown(0.5);

    if (!diagRows.length) {
      sectionTitle(doc, 'Sin diagnosticos registrados');
    } else {
      sectionTitle(doc, `Diagnosticos (${diagRows.length})`);

      diagRows.forEach((d, i) => {
        addPageIfNeeded(doc, 100);

        const diagY = doc.y;
        doc.rect(40, diagY, doc.page.width - 80, 20)
           .fill(i % 2 === 0 ? '#e8f4f1' : C.cream);
        doc.fontSize(9).fillColor(C.deep).font('Helvetica-Bold')
           .text(`${i + 1}. ${d.descripcion || '—'}`, 50, diagY + 5);
        doc.y = diagY + 26;

        twoCol(doc, [
          ['Fecha diagnostico', d.fecha_diagnostico
              ? new Date(d.fecha_diagnostico).toLocaleDateString('es-SV') : '—'],
          ['Fecha consulta',    d.fecha_consulta
              ? new Date(d.fecha_consulta).toLocaleDateString('es-SV') : '—'],
          ['Doctor',            d.NombreDoctor
              ? `Dr/Dra. ${d.NombreDoctor} ${d.ApellidosDoctor}` : '—'],
          ['Especialidad',      d.Especialidad || '—'],
          ['Motivo Cita',       d.MotivoCita   || '—'],
        ]);

        doc.moveDown(0.5);
        doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y)
           .strokeColor('#dde8e5').lineWidth(0.5).stroke();
        doc.moveDown(0.5);
      });
    }

    footerDoc(doc);
    doc.end();

  } catch (err) {
    console.error('[PDF Diagnosticos]', err);
    if (!res.headersSent) res.status(500).json({ error: 'Error generando PDF de diagnosticos' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. PDF DE HISTORIAL CLÍNICO COMPLETO
// GET /api/pdf/historial/:idPaciente
// ─────────────────────────────────────────────────────────────────────────────
exports.pdfHistorial = async (req, res) => {
  const idPaciente = parseInt(req.params.idPaciente);

  try {
    // ── FIX campos tbl_paciente vs tbl_usuarios ───────────────────────────────
    // tbl_paciente real: idPaciente, numero_expediente, fecha_registro,
    //   tipo_sangre, contacto_emergencia, parentesco_emergencia,
    //   telefono_emergencia, observaciones_generales, estado_paciente, idUsuario
    //
    // tbl_usuarios real: idUsuario, Nombres, Apellidos, Sexo, Fecha_nacimiento,
    //   Telefono, Direccion, Email, Password_hash, Estado, idRol
    //
    // ANTES: pedía p.Telefono, p.Direccion, p.Sexo, p.fecha_nacimiento —
    //        todos en tbl_usuarios, no en tbl_paciente. Causaban 500.
    // CAMBIO: movidos a u.Telefono, u.Direccion, u.Sexo, u.Fecha_nacimiento.
    // ─────────────────────────────────────────────────────────────────────────
    const pacRows = await query(`
      SELECT u.Nombres, u.Apellidos, u.Email,
             u.Fecha_nacimiento, u.Telefono, u.Direccion, u.Sexo,
             p.idPaciente, p.numero_expediente, p.tipo_sangre,
             p.contacto_emergencia, p.parentesco_emergencia, p.telefono_emergencia,
             h.alergias, h.antecedentes_familiares, h.antecedentes_personales,
             h.padecimientos_cronicos, h.cirugias_previas,
             h.observaciones_generales AS obs_historial
      FROM tbl_paciente p
      LEFT JOIN tbl_usuarios          u ON p.idUsuario  = u.idUsuario
      LEFT JOIN tbl_historial_clinico h ON h.idPaciente = p.idPaciente
      WHERE p.idPaciente = ?
      LIMIT 1`, [idPaciente]);

    if (!pacRows.length) return res.status(404).json({ error: 'Paciente no encontrado' });

    const pac = pacRows[0];

    const consultaRows = await query(`
      SELECT c.idCita, c.fecha, c.hora, c.motivo, c.estado,
             u_doc.Nombres   AS NombreDoctor,
             u_doc.Apellidos AS ApellidosDoctor,
             doc.Especialidad,
             con.observaciones AS obs_consulta,
             con.fecha_consulta
      FROM tbl_citas c
      LEFT JOIN tbl_doctores  doc   ON c.idDoctor   = doc.idDoctor
      LEFT JOIN tbl_usuarios  u_doc ON doc.idUsuario = u_doc.idUsuario
      LEFT JOIN tbl_consultas con   ON con.idCita    = c.idCita
      WHERE c.idPaciente = ? AND c.estado = 'COMPLETADA'
      ORDER BY c.fecha DESC`, [idPaciente]);

    // ── FIX JOIN recetas ──────────────────────────────────────────────────────
    // ANTES: JOIN por r.idConsulta — no existe en tbl_recetas.
    // CAMBIO: JOIN por r.idDiagnostico (campo real).
    // ─────────────────────────────────────────────────────────────────────────
    const recetaRows = await query(`
      SELECT r.idReceta, r.medicamento, r.dosis, r.frecuencia,
             r.duracion, r.indicaciones, r.cantidad,
             m.nombre AS NombreMedicamento, m.unidad_medida,
             c.fecha  AS FechaCita,
             u_doc.Nombres   AS NombreDoctor,
             u_doc.Apellidos AS ApellidosDoctor
      FROM tbl_recetas r
      LEFT JOIN tbl_diagnosticos d     ON r.idDiagnostico  = d.idDiagnostico
      LEFT JOIN tbl_consultas    con   ON d.idConsulta      = con.idConsulta
      LEFT JOIN tbl_citas        c     ON con.idCita         = c.idCita
      LEFT JOIN tbl_doctores     doc   ON c.idDoctor         = doc.idDoctor
      LEFT JOIN tbl_usuarios     u_doc ON doc.idUsuario      = u_doc.idUsuario
      LEFT JOIN tbl_medicamentos m     ON r.idMedicamento    = m.idMedicamento
      WHERE c.idPaciente = ?
      ORDER BY c.fecha DESC`, [idPaciente]);

    // ── FIX campos diagnósticos ───────────────────────────────────────────────
    // ANTES: pedía d.codigo_cie, d.tipo, d.notas — no existen.
    // CAMBIO: solo campos reales.
    // ─────────────────────────────────────────────────────────────────────────
    const diagRows = await query(`
      SELECT d.descripcion,
             d.fecha_diagnostico,
             con.fecha_consulta,
             u_doc.Nombres   AS NombreDoctor,
             u_doc.Apellidos AS ApellidosDoctor
      FROM tbl_diagnosticos d
      LEFT JOIN tbl_consultas  con   ON d.idConsulta = con.idConsulta
      LEFT JOIN tbl_citas      c     ON con.idCita    = c.idCita
      LEFT JOIN tbl_doctores   doc   ON c.idDoctor    = doc.idDoctor
      LEFT JOIN tbl_usuarios   u_doc ON doc.idUsuario = u_doc.idUsuario
      WHERE c.idPaciente = ?
      ORDER BY d.fecha_diagnostico DESC`, [idPaciente]);

    // ── Construir PDF ─────────────────────────────────────────────────────────
    const doc = new PDFDocument({ size: 'A4', margins: { top: 100, bottom: 60, left: 40, right: 40 } });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="historial-${pac.numero_expediente || idPaciente}.pdf"`);
    doc.pipe(res);

    headerDoc(doc, 'HISTORIAL CLINICO', `Expediente No. ${pac.numero_expediente || idPaciente}`);
    doc.y = 110;

    sectionTitle(doc, '1. Datos del Paciente');
    twoCol(doc, [
      ['Nombre completo', `${pac.Nombres} ${pac.Apellidos}`],
      ['Sexo',             pac.Sexo || '—'],
      ['Fecha nacimiento', pac.Fecha_nacimiento
          ? new Date(pac.Fecha_nacimiento).toLocaleDateString('es-SV') : '—'],
      ['Tipo de sangre',   pac.tipo_sangre       || '—'],
      ['Telefono',         pac.Telefono          || '—'],
      ['Correo',           pac.Email             || '—'],
      ['Direccion',        pac.Direccion         || '—'],
      ['N Expediente',     pac.numero_expediente || '—'],
    ]);
    doc.moveDown(0.5);

    sectionTitle(doc, '2. Contacto de Emergencia');
    twoCol(doc, [
      ['Nombre',     pac.contacto_emergencia   || '—'],
      ['Parentesco', pac.parentesco_emergencia || '—'],
      ['Telefono',   pac.telefono_emergencia   || '—'],
    ]);
    doc.moveDown(0.5);

    addPageIfNeeded(doc, 120);
    sectionTitle(doc, '3. Antecedentes Clinicos');

    const antecedentes = [
      ['Alergias',                pac.alergias                || '—'],
      ['Antecedentes familiares',  pac.antecedentes_familiares || '—'],
      ['Antecedentes personales',  pac.antecedentes_personales || '—'],
      ['Padecimientos cronicos',   pac.padecimientos_cronicos  || '—'],
      ['Cirugias previas',         pac.cirugias_previas        || '—'],
    ];

    antecedentes.forEach(([label, val]) => {
      addPageIfNeeded(doc, 50);
      doc.fontSize(8.5).fillColor(C.textSoft).font('Helvetica-Bold').text(label, 40, doc.y);
      doc.fontSize(9.5).fillColor(C.deep).font('Helvetica')
         .text(val, 40, doc.y + 12, { width: doc.page.width - 80, lineGap: 2 });
      doc.y += String(val).length > 80 ? 40 : 30;
    });

    if (pac.obs_historial) {
      doc.fontSize(8.5).fillColor(C.textSoft).font('Helvetica-Bold')
         .text('Observaciones generales', 40, doc.y);
      doc.fontSize(9.5).fillColor(C.deep).font('Helvetica')
         .text(pac.obs_historial, 40, doc.y + 12, { width: doc.page.width - 80, lineGap: 2 });
      doc.moveDown(1);
    }

    addPageIfNeeded(doc, 60);
    sectionTitle(doc, `4. Consultas Medicas (${consultaRows.length})`);

    if (!consultaRows.length) {
      doc.fontSize(9).fillColor(C.textSoft).font('Helvetica')
         .text('Sin consultas registradas.', 40, doc.y);
      doc.moveDown(1);
    } else {
      consultaRows.forEach((c, i) => {
        addPageIfNeeded(doc, 80);
        const rowY = doc.y;
        doc.rect(40, rowY, doc.page.width - 80, 18).fill(i % 2 === 0 ? '#e8f4f1' : C.cream);
        doc.fontSize(8.5).fillColor(C.deep).font('Helvetica-Bold')
           .text(
             `${c.fecha ? new Date(c.fecha).toLocaleDateString('es-SV') : '—'}  ·  Dr/Dra. ${c.NombreDoctor || ''} ${c.ApellidosDoctor || ''}  ·  ${c.Especialidad || ''}`,
             50, rowY + 4
           );
        doc.y = rowY + 24;
        if (c.motivo) {
          doc.fontSize(8.5).fillColor(C.textSoft).font('Helvetica')
             .text(`Motivo: ${c.motivo}`, 50, doc.y, { width: doc.page.width - 100 });
          doc.y += 14;
        }
      });
    }

    addPageIfNeeded(doc, 60);
    sectionTitle(doc, `5. Diagnosticos (${diagRows.length})`);

    if (!diagRows.length) {
      doc.fontSize(9).fillColor(C.textSoft).font('Helvetica')
         .text('Sin diagnosticos registrados.', 40, doc.y);
      doc.moveDown(1);
    } else {
      diagRows.forEach((d, i) => {
        addPageIfNeeded(doc, 60);
        const rowY = doc.y;
        doc.rect(40, rowY, doc.page.width - 80, 18).fill(i % 2 === 0 ? '#e8f4f1' : C.cream);
        doc.fontSize(8.5).fillColor(C.deep).font('Helvetica-Bold')
           .text(
             `${d.fecha_diagnostico ? new Date(d.fecha_diagnostico).toLocaleDateString('es-SV') : '—'}  ·  ${d.descripcion || '—'}`,
             50, rowY + 4
           );
        doc.y = rowY + 24;
      });
    }

    addPageIfNeeded(doc, 60);
    sectionTitle(doc, `6. Recetas Emitidas (${recetaRows.length})`);

    if (!recetaRows.length) {
      doc.fontSize(9).fillColor(C.textSoft).font('Helvetica')
         .text('Sin recetas registradas.', 40, doc.y);
      doc.moveDown(1);
    } else {
      recetaRows.forEach((r, i) => {
        addPageIfNeeded(doc, 70);
        const rowY = doc.y;
        doc.rect(40, rowY, doc.page.width - 80, 18).fill(i % 2 === 0 ? '#e8f4f1' : C.cream);
        const medicNombre = r.NombreMedicamento || r.medicamento || '—';
        doc.fontSize(8.5).fillColor(C.deep).font('Helvetica-Bold')
           .text(
             `${r.FechaCita ? new Date(r.FechaCita).toLocaleDateString('es-SV') : '—'}  ·  ${medicNombre}  ·  Dr/Dra. ${r.NombreDoctor || ''} ${r.ApellidosDoctor || ''}`,
             50, rowY + 4
           );
        doc.y = rowY + 24;
        const detalles = [r.dosis, r.frecuencia, r.duracion].filter(Boolean).join(' | ');
        if (detalles) {
          doc.fontSize(8.5).fillColor(C.textSoft).font('Helvetica')
             .text(detalles, 50, doc.y, { width: doc.page.width - 100 });
          doc.y += 14;
        }
        if (r.indicaciones) {
          doc.fontSize(8.5).fillColor(C.textSoft).font('Helvetica')
             .text(`Indicaciones: ${r.indicaciones}`, 50, doc.y, { width: doc.page.width - 100 });
          doc.y += 14;
        }
      });
    }

    footerDoc(doc);
    doc.end();

  } catch (err) {
    console.error('[PDF Historial]', err);
    if (!res.headersSent) res.status(500).json({ error: 'Error generando historial clinico' });
  }
};
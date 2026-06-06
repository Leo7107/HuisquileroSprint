const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/pdf.controller');
const auth    = require('../middleware/auth');

// GET /api/pdf/receta/:idReceta
router.get('/receta/:idReceta',            auth, ctrl.pdfReceta);

// GET /api/pdf/diagnosticos/:idPaciente
router.get('/diagnosticos/:idPaciente',    auth, ctrl.pdfDiagnosticos);

// GET /api/pdf/historial/:idPaciente
router.get('/historial/:idPaciente',       auth, ctrl.pdfHistorial);

module.exports = router;
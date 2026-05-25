// routes/reportes.routes.js
// HU12 — Reportes Consolidados

const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const ctrl    = require('../controllers/reportes.controller');

// Todas las rutas protegidas con JWT (igual que el resto del proyecto)
router.use(auth);

// Admin
router.get('/filtros',    ctrl.getFiltros);          // médicos + especialidades
router.get('/citas',      ctrl.getReporteCitas);     // reporte citas
router.get('/inventario', ctrl.getReporteInventario);// reporte inventario

// Médico
router.get('/consultas-medico', ctrl.getReporteConsultasMedico);

module.exports = router;
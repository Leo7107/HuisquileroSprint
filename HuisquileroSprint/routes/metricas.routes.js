const express    = require('express');
const router     = express.Router();
const auth       = require('../middleware/auth');
const metricas   = require('../controllers/metricas.controller');

// Todas requieren JWT
router.get('/resumen',           auth, metricas.getResumen);
router.get('/citas-hoy',         auth, metricas.getCitasHoy);
router.get('/alertas-inventario',auth, metricas.getAlertasInventario);
router.get('/actividad-reciente',auth, metricas.getActividadReciente);

module.exports = router;
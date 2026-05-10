const express = require('express');
const router = express.Router();
const historialController = require('../controllers/historial.controller');

router.get('/by-paciente', historialController.getHistorialByPaciente);

router.get('/', historialController.getHistoriales);

router.get('/:id', historialController.getHistorialById);

router.post('/', historialController.createHistorial);

router.put('/:id', historialController.updateHistorial);

router.delete('/:id', historialController.deleteHistorial);

module.exports = router;

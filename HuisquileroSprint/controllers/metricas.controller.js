const MetricasModel = require('../models/metricas.model');
const AuditoriaModel = require('../models/auditoria.model');

exports.getResumen = (req, res) => {
  MetricasModel.resumenGeneral((err, results) => {
    if (err) { console.error('[metricas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
    res.json(results[0]);
  });
};

exports.getCitasHoy = (req, res) => {
  MetricasModel.citasHoy((err, results) => {
    if (err) { console.error('[metricas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
    res.json(results);
  });
};

exports.getAlertasInventario = (req, res) => {
  MetricasModel.alertasInventario((err, results) => {
    if (err) { console.error('[metricas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
    res.json(results);
  });
};

exports.getActividadReciente = (req, res) => {
  AuditoriaModel.getRecientes((err, results) => {
    if (err) { console.error('[metricas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
    res.json(results);
  });
};
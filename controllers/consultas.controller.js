const Consulta  = require("../models/consultas.model");
const Auditoria = require("../models/auditoria.model");

exports.getRecientesConsultas = (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 6, 50);
    Consulta.getRecientes(limit, (err, results) => {
        if (err) { console.error('[consultas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json(results);
    });
};

exports.getConsultaByCita = (req, res) => {
    Consulta.getByCita(req.params.idCita, (err, result) => {
        if (err) { console.error('[consultas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json(result[0] || null);
    });
};

exports.getConsultas = (req, res) => {
    Consulta.getAll((err, results) => {
        if (err) { console.error('[consultas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json(results);
    });
};

exports.getConsultaById = (req, res) => {
    Consulta.getById(req.params.id, (err, result) => {
        if (err) { console.error('[consultas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json(result);
    });
};

exports.createConsulta = (req, res) => {
    Consulta.create(req.body, (err, result) => {
        if (err) { console.error('[consultas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        const idCita = req.body.idCita;
        if (idCita) {
          const Cita = require('../models/citas.model');
          Cita.getById(idCita, (e2, rows) => {
            const c = Array.isArray(rows) ? rows[0] : rows;
            const nombreDoc = c ? `Dr. ${c.NombreDoctor || ''} ${c.ApellidosDoctor || ''}`.trim() : 'Doctor';
            const nombrePac = c ? `${c.NombrePaciente || ''} ${c.ApellidosPaciente || ''}`.trim() : 'Paciente';
            const espec     = c && c.Especialidad ? ` (${c.Especialidad})` : '';
            Auditoria.registrar({
              accion: 'CONSULTA_REGISTRADA',
              descripcion: `${nombreDoc}${espec} registró una consulta para ${nombrePac}`,
              nombreUsuario: nombreDoc,
              modulo: 'Consultas',
              fecha: new Date(),
            }, (e) => { if (e) console.error('[auditoria]', e.message); });
          });
        }
        res.json({ message: "Consulta creada", id: result.insertId });
    });
};

exports.updateConsulta = (req, res) => {
    Consulta.update(req.params.id, req.body, (err) => {
        if (err) { console.error('[consultas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json({ message: "Consulta actualizada" });
    });
};

exports.deleteConsulta = (req, res) => {
    Consulta.delete(req.params.id, (err) => {
        if (err) { console.error('[consultas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json({ message: "Consulta eliminada" });
    });
};

exports.getConsultasByPaciente = (req, res) => {
    Consulta.getByPaciente(req.params.idPaciente, (err, results) => {
        if (err) { console.error('[consultas]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json(results);
    });
};
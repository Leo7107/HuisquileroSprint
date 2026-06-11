
const Paciente  = require("../models/pacientes.model");
const Auditoria = require("../models/auditoria.model");

function log(accion, descripcion, nombreUsuario, modulo) {
  Auditoria.registrar({ accion, descripcion, nombreUsuario, modulo, fecha: new Date() },
    (e) => { if (e) console.error('[auditoria]', e.message); });
}

exports.getPacientes = (req, res) => {
    Paciente.getAll((err, results) => {
        if (err) { console.error('[pacientes]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json(results);
    });
};

exports.getPacienteById = (req, res) => {
    Paciente.getById(req.params.id, (err, result) => {
        if (err) { console.error('[pacientes]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json(result);
    });
};

exports.getPacienteByUsuario = (req, res) => {
    Paciente.getByUsuario(req.params.idUsuario, (err, result) => {
        if (err) { console.error('[pacientes]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        res.json(result[0] || null);
    });
};

exports.createPaciente = (req, res) => {
    Paciente.create(req.body, (err, result) => {
        if (err) { console.error('[pacientes]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        // Buscar nombre del paciente recién creado
        Paciente.getById(result.insertId, (e2, rows) => {
            const p = Array.isArray(rows) ? rows[0] : rows;
            const nombre = p ? `${p.Nombres || ''} ${p.Apellidos || ''}`.trim() : 'Nuevo paciente';
            const admin  = req.user || {};
            log('PACIENTE_REGISTRADO',
                `${nombre} fue registrado como nuevo paciente`,
                admin.nombre || 'Sistema', 'Pacientes');
        });
        res.json({ message: "Paciente creado", id: result.insertId });
    });
};

exports.updatePaciente = (req, res) => {
    Paciente.getById(req.params.id, (e0, rows0) => {
        const p = Array.isArray(rows0) ? rows0[0] : rows0;
        const nombre = p ? `${p.Nombres || ''} ${p.Apellidos || ''}`.trim() : `ID ${req.params.id}`;
        Paciente.update(req.params.id, req.body, (err) => {
            if (err) { console.error('[pacientes]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
            const actor = req.user || {};
            log('PACIENTE_ACTUALIZADO',
                `Perfil de ${nombre} fue actualizado`,
                actor.nombre || nombre, 'Pacientes');
            res.json({ message: "Paciente actualizado" });
        });
    });
};

exports.deletePaciente = (req, res) => {
    Paciente.getById(req.params.id, (e0, rows0) => {
        const p = Array.isArray(rows0) ? rows0[0] : rows0;
        const nombre = p ? `${p.Nombres || ''} ${p.Apellidos || ''}`.trim() : `ID ${req.params.id}`;
        Paciente.delete(req.params.id, (err) => {
            if (err) { console.error('[pacientes]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
            const admin = req.user || {};
            log('PACIENTE_ELIMINADO',
                `El paciente ${nombre} fue eliminado del sistema`,
                admin.nombre || 'Admin', 'Pacientes');
            res.json({ message: "Paciente eliminado" });
        });
    });
};

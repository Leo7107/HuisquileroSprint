const Doctor    = require("../models/doctores.model");
const Auditoria = require("../models/auditoria.model");

function log(accion, descripcion, nombreUsuario, modulo) {
  Auditoria.registrar({ accion, descripcion, nombreUsuario, modulo, fecha: new Date() },
    (e) => { if (e) console.error('[auditoria]', e.message); });
}

exports.getDoctores = (req, res) => {
  Doctor.getAll((err, results) => {
    if (err) { console.error('[doctores]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
    res.json(results);
  });
};

exports.getDoctoresActivos = (req, res) => {
  Doctor.getAllActivos((err, results) => {
    if (err) { console.error('[doctores]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
    res.json(results);
  });
};

exports.getDoctorById = (req, res) => {
  Doctor.getById(req.params.id, (err, result) => {
    if (err) { console.error('[doctores]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
    res.json(result[0] || null);
  });
};

exports.getDoctorByUsuario = (req, res) => {
  Doctor.getFullByUsuario(req.params.idUsuario, (err, result) => {
    if (err) { console.error('[doctores]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
    res.json(result[0] || null);
  });
};

exports.createDoctor = (req, res) => {
  const { idUsuario, numero_junta_medica, hora_inicio, hora_fin } = req.body;
  if (!idUsuario)
    return res.status(400).json({ error: "El idUsuario es obligatorio." });
  if (hora_inicio && hora_fin && hora_inicio >= hora_fin)
    return res.status(400).json({ error: "La hora de fin debe ser posterior a la hora de inicio." });

  const registrar = () => {
    Doctor.create(req.body, (err, result) => {
      if (err) { console.error('[doctores]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
      // Buscar nombre del doctor recién creado para el log
      Doctor.getById(result.insertId, (e2, rows) => {
        const d = Array.isArray(rows) ? rows[0] : rows;
        const nombre = d ? `Dr. ${d.Nombres || ''} ${d.Apellidos || ''}`.trim() : 'Nuevo médico';
        const espec  = d && d.Especialidad ? ` — ${d.Especialidad}` : '';
        const admin  = req.user || {};
        log('MEDICO_REGISTRADO',
          `${nombre}${espec} fue registrado en el sistema`,
          admin.nombre || 'Admin', 'Médicos');
      });
      res.json({ message: "Doctor creado", id: result.insertId });
    });
  };

  if (numero_junta_medica) {
    Doctor.getByJunta(numero_junta_medica, null, (err, existing) => {
      if (err) { console.error('[doctores]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
      if (existing.length > 0)
        return res.status(409).json({ error: "Ya existe un médico registrado con ese número de junta médica." });
      Doctor.getByUsuario(idUsuario, null, (err, existingUser) => {
        if (err) { console.error('[doctores]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        if (existingUser.length > 0)
          return res.status(409).json({ error: "Ya existe un médico registrado con ese usuario." });
        registrar();
      });
    });
  } else {
    Doctor.getByUsuario(idUsuario, null, (err, existingUser) => {
      if (err) { console.error('[doctores]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
      if (existingUser.length > 0)
        return res.status(409).json({ error: "Ya existe un médico registrado con ese usuario." });
      registrar();
    });
  }
};

exports.updateDoctor = (req, res) => {
  const id = req.params.id;
  const { numero_junta_medica, hora_inicio, hora_fin } = req.body;
  if (hora_inicio && hora_fin && hora_inicio >= hora_fin)
    return res.status(400).json({ error: "La hora de fin debe ser posterior a la hora de inicio." });

  const actualizar = () => {
    Doctor.getById(id, (e0, rows0) => {
      const d = Array.isArray(rows0) ? rows0[0] : rows0;
      const nombre = d ? `Dr. ${d.Nombres || ''} ${d.Apellidos || ''}`.trim() : `ID ${id}`;
      Doctor.update(id, req.body, (err) => {
        if (err) { console.error('[doctores]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
        const admin = req.user || {};
        log('MEDICO_ACTUALIZADO',
          `Datos de ${nombre} fueron actualizados`,
          admin.nombre || 'Admin', 'Médicos');
        res.json({ message: "Doctor actualizado" });
      });
    });
  };

  if (numero_junta_medica) {
    Doctor.getByJunta(numero_junta_medica, id, (err, existing) => {
      if (err) { console.error('[doctores]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
      if (existing.length > 0)
        return res.status(409).json({ error: "Ya existe otro médico con ese número de junta médica." });
      actualizar();
    });
  } else {
    actualizar();
  }
};

exports.desactivarDoctor = (req, res) => {
  Doctor.getById(req.params.id, (e0, rows0) => {
    const d = Array.isArray(rows0) ? rows0[0] : rows0;
    const nombre = d ? `Dr. ${d.Nombres || ''} ${d.Apellidos || ''}`.trim() : `ID ${req.params.id}`;
    Doctor.desactivar(req.params.id, (err) => {
      if (err) { console.error('[doctores]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
      const admin = req.user || {};
      log('MEDICO_DESACTIVADO',
        `${nombre} fue desactivado y ya no puede recibir citas`,
        admin.nombre || 'Admin', 'Médicos');
      res.json({ message: "Doctor desactivado" });
    });
  });
};

exports.activarDoctor = (req, res) => {
  Doctor.getById(req.params.id, (e0, rows0) => {
    const d = Array.isArray(rows0) ? rows0[0] : rows0;
    const nombre = d ? `Dr. ${d.Nombres || ''} ${d.Apellidos || ''}`.trim() : `ID ${req.params.id}`;
    Doctor.activar(req.params.id, (err) => {
      if (err) { console.error('[doctores]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
      const admin = req.user || {};
      log('MEDICO_ACTIVADO',
        `${nombre} fue activado y puede recibir citas nuevamente`,
        admin.nombre || 'Admin', 'Médicos');
      res.json({ message: "Doctor activado" });
    });
  });
};

exports.deleteDoctor = (req, res) => {
  Doctor.getById(req.params.id, (e0, rows0) => {
    const d = Array.isArray(rows0) ? rows0[0] : rows0;
    const nombre = d ? `Dr. ${d.Nombres || ''} ${d.Apellidos || ''}`.trim() : `ID ${req.params.id}`;
    Doctor.delete(req.params.id, (err) => {
      if (err) { console.error('[doctores]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
      const admin = req.user || {};
      log('MEDICO_ELIMINADO',
        `${nombre} fue eliminado del sistema`,
        admin.nombre || 'Admin', 'Médicos');
      res.json({ message: "Doctor eliminado" });
    });
  });
};

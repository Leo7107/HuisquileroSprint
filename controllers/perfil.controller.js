const Perfil = require("../models/perfil.model");
exports.getPerfil = (req, res) => {
  Perfil.getPerfil(req.params.idUsuario, (err, result) => {
    if (err) return res.status(500).json({ error: err });
    if (!result.length) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(result[0]);
  });
};
exports.updatePerfil = (req, res) => {
  const idUsuario = req.params.idUsuario;
  const {
    Telefono, Direccion,
    tipo_sangre, contacto_emergencia, parentesco_emergencia, telefono_emergencia,
    antecedentes_familiares, antecedentes_personales, alergias,
    padecimientos_cronicos, cirugias_previas, observaciones_generales
  } = req.body;
  const dataUsuario = {};
  if (Telefono  !== undefined) dataUsuario.Telefono  = Telefono;
  if (Direccion !== undefined) dataUsuario.Direccion = Direccion;
  const procesarPaciente = () => {
    Perfil.getPacienteByUsuario(idUsuario, (err, rows) => {
      if (err) return res.status(500).json({ error: err });
      const dataPac = {
        tipo_sangre:           tipo_sangre           || null,
        contacto_emergencia:   contacto_emergencia   || null,
        parentesco_emergencia: parentesco_emergencia || null,
        telefono_emergencia:   telefono_emergencia   || null
      };
      if (rows.length > 0) {
        const idPaciente = rows[0].idPaciente;
        Perfil.updatePaciente(idPaciente, dataPac, (err) => {
          if (err) return res.status(500).json({ error: err });
          procesarHistorial(idPaciente);
        });
      } else {
        dataPac.idUsuario         = idUsuario;
        dataPac.numero_expediente = 'EXP-' + Date.now();
        dataPac.fecha_registro    = new Date();
        dataPac.estado_paciente   = 'ACTIVO';
        Perfil.createPaciente(dataPac, (err, result) => {
          if (err) return res.status(500).json({ error: err });
          procesarHistorial(result.insertId);
        });
      }
    });
  };
  const procesarHistorial = (idPaciente) => {
    Perfil.getHistorialByPaciente(idPaciente, (err, rows) => {
      if (err) return res.status(500).json({ error: err });
      const dataHist = {
        antecedentes_familiares: antecedentes_familiares || null,
        antecedentes_personales: antecedentes_personales || null,
        alergias:                alergias                || null,
        padecimientos_cronicos:  padecimientos_cronicos  || null,
        cirugias_previas:        cirugias_previas        || null,
        observaciones_generales: observaciones_generales || null
      };
      if (rows.length > 0) {
        Perfil.updateHistorial(rows[0].idHistorial, dataHist, (err) => {
          if (err) return res.status(500).json({ error: err });
          res.json({ message: "Perfil actualizado correctamente" });
        });
      } else {
        dataHist.idPaciente     = idPaciente;
        dataHist.fecha_apertura = new Date();
        Perfil.createHistorial(dataHist, (err) => {
          if (err) return res.status(500).json({ error: err });
          res.json({ message: "Perfil actualizado correctamente" });
        });
      }
    });
  };
  if (Object.keys(dataUsuario).length > 0) {
    Perfil.updateUsuario(idUsuario, dataUsuario, (err) => {
      if (err) return res.status(500).json({ error: err });
      procesarPaciente();
    });
  } else {
    procesarPaciente();
  }
};

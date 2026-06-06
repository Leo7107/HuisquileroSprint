const Perfil = require("../models/perfil.model");

const pq = (fn, ...args) => new Promise((resolve, reject) =>
  fn(...args, (err, r) => err ? reject(err) : resolve(r))
);

exports.getPerfil = (req, res) => {
  Perfil.getPerfil(req.params.idUsuario, (err, result) => {
    if (err) { console.error('[perfil]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
    if (!result.length) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(result[0]);
  });
};

exports.updatePerfil = async (req, res) => {
  const idUsuario = req.params.idUsuario;
  const {
    Telefono, Direccion,
    tipo_sangre, contacto_emergencia, parentesco_emergencia, telefono_emergencia,
    antecedentes_familiares, antecedentes_personales, alergias,
    padecimientos_cronicos, cirugias_previas, observaciones_generales
  } = req.body;

  try {
    const dataUsuario = {};
    if (Telefono  !== undefined) dataUsuario.Telefono  = Telefono;
    if (Direccion !== undefined) dataUsuario.Direccion = Direccion;
    if (Object.keys(dataUsuario).length > 0) {
      await pq(Perfil.updateUsuario.bind(Perfil), idUsuario, dataUsuario);
    }

    const pacRows = await pq(Perfil.getPacienteByUsuario.bind(Perfil), idUsuario);
    const dataPac = {
      tipo_sangre:           tipo_sangre           || null,
      contacto_emergencia:   contacto_emergencia   || null,
      parentesco_emergencia: parentesco_emergencia || null,
      telefono_emergencia:   telefono_emergencia   || null,
    };

    let idPaciente;
    if (pacRows.length > 0) {
      idPaciente = pacRows[0].idPaciente;
      await pq(Perfil.updatePaciente.bind(Perfil), idPaciente, dataPac);
    } else {
      const result = await pq(Perfil.createPaciente.bind(Perfil), {
        ...dataPac,
        idUsuario,
        numero_expediente: 'EXP-' + Date.now(),
        fecha_registro:    new Date(),
        estado_paciente:   'ACTIVO',
      });
      idPaciente = result.insertId;
    }

    const histRows = await pq(Perfil.getHistorialByPaciente.bind(Perfil), idPaciente);
    const dataHist = {
      antecedentes_familiares: antecedentes_familiares || null,
      antecedentes_personales: antecedentes_personales || null,
      alergias:                alergias                || null,
      padecimientos_cronicos:  padecimientos_cronicos  || null,
      cirugias_previas:        cirugias_previas        || null,
      observaciones_generales: observaciones_generales || null,
    };
    if (histRows.length > 0) {
      await pq(Perfil.updateHistorial.bind(Perfil), histRows[0].idHistorial, dataHist);
    } else {
      await pq(Perfil.createHistorial.bind(Perfil), {
        ...dataHist, idPaciente, fecha_apertura: new Date(),
      });
    }

    res.json({ message: "Perfil actualizado correctamente" });
  } catch (err) {
    console.error('[perfil]', err);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

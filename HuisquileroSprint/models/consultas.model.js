const db = require("../config/db");

const Consulta = {
    getAll: (cb) => db.query(`
        SELECT tbl_consultas.*, tbl_usuarios.Nombres AS NombrePaciente, tbl_usuarios.Apellidos AS ApellidosPaciente
        FROM tbl_consultas
        LEFT JOIN tbl_historial_clinico ON tbl_consultas.idHistorial = tbl_historial_clinico.idHistorial
        LEFT JOIN tbl_paciente ON tbl_historial_clinico.idPaciente = tbl_paciente.idPaciente
        LEFT JOIN tbl_usuarios ON tbl_paciente.idUsuario = tbl_usuarios.idUsuario`, cb),

    getById: (id, cb) => db.query("SELECT * FROM tbl_consultas WHERE idConsulta = ?", [id], cb),

    getByCita: (idCita, cb) => db.query(`
        SELECT tbl_consultas.*, tbl_usuarios.Nombres AS NombrePaciente, tbl_usuarios.Apellidos AS ApellidosPaciente
        FROM tbl_consultas
        LEFT JOIN tbl_historial_clinico ON tbl_consultas.idHistorial = tbl_historial_clinico.idHistorial
        LEFT JOIN tbl_paciente ON tbl_historial_clinico.idPaciente = tbl_paciente.idPaciente
        LEFT JOIN tbl_usuarios ON tbl_paciente.idUsuario = tbl_usuarios.idUsuario
        WHERE tbl_consultas.idCita = ? LIMIT 1`, [idCita], cb),

    create: (data, cb) => db.query("INSERT INTO tbl_consultas SET ?", data, cb),
    update: (id, data, cb) => db.query("UPDATE tbl_consultas SET ? WHERE idConsulta = ?", [data, id], cb),
    delete: (id, cb) => db.query("DELETE FROM tbl_consultas WHERE idConsulta = ?", [id], cb)
};

module.exports = Consulta;

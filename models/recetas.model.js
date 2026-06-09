const db = require('../config/db');

const Receta = {
    getAll: (cb) => db.query('SELECT * FROM tbl_recetas', cb),

    getById: (id, cb) => db.query('SELECT * FROM tbl_recetas WHERE idreceta = ?', [id], cb),

    create: (data, cb) => db.query('INSERT INTO tbl_recetas SET ?', data, cb),

    update: (id, data, cb) => db.query('UPDATE tbl_recetas SET ? WHERE idreceta = ?', [data, id], cb),

    delete: (id, cb) => db.query('DELETE FROM tbl_recetas WHERE idreceta = ?', [id], cb),

    // ── FIX getByPaciente ─────────────────────────────────────────────────────
    // ANTES: JOIN iba por tbl_historial_clinico — tbl_recetas no tiene ese campo,
    //        nunca retornaba datos y el dashboard paciente siempre mostraba vacío.
    // CAMBIO: JOIN corregido siguiendo la cadena real del schema:
    //         tbl_recetas.idDiagnostico → tbl_diagnosticos → tbl_consultas → tbl_citas.idPaciente
    // ─────────────────────────────────────────────────────────────────────────
    getByPaciente: (idPaciente, cb) => db.query(
        `SELECT r.*,
                c.idCita, c.fecha AS FechaCita, c.motivo AS MotivoCita,
                u_doc.Nombres   AS NombreDoctor,
                u_doc.Apellidos AS ApellidosDoctor,
                doc.Especialidad,
                d.descripcion   AS Diagnostico,
                m.nombre        AS NombreMedicamento,
                m.unidad_medida AS UnidadMed
         FROM tbl_recetas r
         INNER JOIN tbl_diagnosticos d   ON r.idDiagnostico = d.idDiagnostico
         INNER JOIN tbl_consultas    con ON d.idConsulta     = con.idConsulta
         INNER JOIN tbl_citas        c   ON con.idCita        = c.idCita
         LEFT  JOIN tbl_doctores     doc   ON c.idDoctor      = doc.idDoctor
         LEFT  JOIN tbl_usuarios     u_doc ON doc.idUsuario   = u_doc.idUsuario
         LEFT  JOIN tbl_medicamentos m     ON r.idMedicamento = m.idMedicamento
         WHERE c.idPaciente = ?
         ORDER BY c.fecha DESC, r.idReceta DESC`,
        [idPaciente], cb)
};

module.exports = Receta;
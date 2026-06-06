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
        `SELECT r.*
         FROM tbl_recetas r
         INNER JOIN tbl_diagnosticos d   ON r.idDiagnostico = d.idDiagnostico
         INNER JOIN tbl_consultas    con ON d.idConsulta     = con.idConsulta
         INNER JOIN tbl_citas        c   ON con.idCita        = c.idCita
         WHERE c.idPaciente = ?
         ORDER BY r.idReceta DESC`,
        [idPaciente], cb)
};

module.exports = Receta;
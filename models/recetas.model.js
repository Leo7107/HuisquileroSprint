const db = require('../config/db');
const Receta = {
    getAll: (cb) => db.query('SELECT * FROM tbl_recetas', cb),
    getById: (id, cb) => db.query('SELECT * FROM tbl_recetas WHERE idreceta = ?', [id], cb),
    create: (data, cb) => db.query('INSERT INTO tbl_recetas SET ?', data, cb),
    update: (id, data, cb) => db.query('UPDATE tbl_recetas SET ? WHERE idreceta = ?', [data, id], cb),
    delete: (id, cb) => db.query('DELETE FROM tbl_recetas WHERE idreceta = ?', [id], cb),
    getByPaciente: (idPaciente, cb) => db.query(
        'SELECT r.* FROM tbl_recetas r INNER JOIN tbl_diagnosticos d ON r.idDiagnostico = d.idDiagnostico INNER JOIN tbl_consultas c ON d.idConsulta = c.idConsulta INNER JOIN tbl_historial_clinico h ON c.idHistorial = h.idHistorial WHERE h.idPaciente = ?',
        [idPaciente], cb)
};
module.exports = Receta;

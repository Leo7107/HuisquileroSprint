const db = require('../config/db');

const Usuario = {
    getAll: (callback) => {
        db.query('SELECT * FROM tbl_usuarios', callback);
    },
    getById: (id, callback) => {
        db.query('SELECT * FROM tbl_usuarios WHERE idUsuario = ?', [id], callback);
    },
    getByEmail: (email, callback) => {
        db.query('SELECT * FROM tbl_usuarios WHERE Email = ?', [email], callback);
    },
    // Número de administradores que siguen ACTIVOS (idRol = 1).
    // Se usa para impedir que el sistema quede sin ningún administrador.
    countAdminsActivos: (callback) => {
        db.query("SELECT COUNT(*) AS total FROM tbl_usuarios WHERE idRol = 1 AND Estado = 'ACTIVO'", callback);
    },
    create: (data, callback) => {
        db.query('INSERT INTO tbl_usuarios SET ?', [data], callback);
    },
    update: (id, data, callback) => {
        db.query('UPDATE tbl_usuarios SET ? WHERE idUsuario = ?', [data, id], callback);
    },
    // Eliminación en cascada dentro de una transacción.
    // tbl_usuarios es referenciada por tbl_paciente, tbl_doctores y tbl_facturas
    // (FK con regla NO ACTION/RESTRICT). Un DELETE directo fallaba con error 1451
    // (ER_ROW_IS_REFERENCED_2) cuando el usuario tenía registros asociados, por lo
    // que la mayoría de los usuarios no se podían eliminar. Aquí borramos primero
    // los registros hijos en el orden correcto y luego el usuario.
    delete: (id, callback) => {
        db.getConnection((connErr, conn) => {
            if (connErr) return callback(connErr);

            const q = (sql, params = []) =>
                new Promise((res, rej) => conn.query(sql, params, (e, r) => (e ? rej(e) : res(r))));
            const ids = (rows, key) => rows.map(r => r[key]);

            (async () => {
                await q('START TRANSACTION');

                // Entidades del usuario
                const pIds = ids(await q('SELECT idPaciente FROM tbl_paciente WHERE idUsuario = ?', [id]), 'idPaciente');
                const dIds = ids(await q('SELECT idDoctor   FROM tbl_doctores WHERE idUsuario = ?', [id]), 'idDoctor');
                const fIds = ids(await q('SELECT idFactura  FROM tbl_facturas WHERE idUsuario = ?', [id]), 'idFactura');

                // Historiales del paciente
                let hIds = [];
                if (pIds.length)
                    hIds = ids(await q('SELECT idHistorial FROM tbl_historial_clinico WHERE idPaciente IN (?)', [pIds]), 'idHistorial');

                // Citas del usuario (como paciente o como doctor)
                let cIds = [];
                const citaConds = [], citaParams = [];
                if (pIds.length) { citaConds.push('idPaciente IN (?)'); citaParams.push(pIds); }
                if (dIds.length) { citaConds.push('idDoctor IN (?)');   citaParams.push(dIds); }
                if (citaConds.length)
                    cIds = ids(await q(`SELECT idCita FROM tbl_citas WHERE ${citaConds.join(' OR ')}`, citaParams), 'idCita');

                // Consultas (por cita o por historial)
                let coIds = [];
                const coConds = [], coParams = [];
                if (cIds.length) { coConds.push('idCita IN (?)');      coParams.push(cIds); }
                if (hIds.length) { coConds.push('idHistorial IN (?)'); coParams.push(hIds); }
                if (coConds.length)
                    coIds = ids(await q(`SELECT idConsulta FROM tbl_consultas WHERE ${coConds.join(' OR ')}`, coParams), 'idConsulta');

                // Diagnósticos de esas consultas
                let diIds = [];
                if (coIds.length)
                    diIds = ids(await q('SELECT idDiagnostico FROM tbl_diagnosticos WHERE idConsulta IN (?)', [coIds]), 'idDiagnostico');

                // Borrado de hijos -> padres
                const recConds = [], recParams = [];
                if (diIds.length) { recConds.push('idDiagnostico IN (?)'); recParams.push(diIds); }
                if (fIds.length)  { recConds.push('idFactura IN (?)');     recParams.push(fIds); }
                if (recConds.length) await q(`DELETE FROM tbl_recetas WHERE ${recConds.join(' OR ')}`, recParams);

                if (fIds.length)  await q('DELETE FROM tbl_detalle_factura WHERE idFactura IN (?)', [fIds]);
                if (diIds.length) await q('DELETE FROM tbl_diagnosticos WHERE idDiagnostico IN (?)', [diIds]);
                if (coIds.length) await q('DELETE FROM tbl_consultas WHERE idConsulta IN (?)', [coIds]);
                if (cIds.length)  await q('DELETE FROM tbl_citas WHERE idCita IN (?)', [cIds]);
                if (hIds.length)  await q('DELETE FROM tbl_historial_clinico WHERE idHistorial IN (?)', [hIds]);
                if (fIds.length)  await q('DELETE FROM tbl_facturas WHERE idUsuario = ?', [id]);
                if (dIds.length)  await q('DELETE FROM tbl_doctores WHERE idUsuario = ?', [id]);
                if (pIds.length)  await q('DELETE FROM tbl_paciente WHERE idUsuario = ?', [id]);

                const result = await q('DELETE FROM tbl_usuarios WHERE idUsuario = ?', [id]);

                await q('COMMIT');
                conn.release();
                callback(null, result);
            })().catch((e) => {
                conn.rollback(() => { conn.release(); callback(e); });
            });
        });
    },
    saveResetToken: (email, token, expiry, callback) => {
        db.query('UPDATE tbl_usuarios SET reset_token = ?, reset_token_expiry = ? WHERE Email = ?', [token, expiry, email], callback);
    },
    getByResetToken: (token, callback) => {
        db.query(
            'SELECT * FROM tbl_usuarios WHERE reset_token = ? AND reset_token_expiry > NOW()',
            [token], callback
        );
    },
    updatePassword: (id, hash, callback) => {
        db.query('UPDATE tbl_usuarios SET Password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE idUsuario = ?', [hash, id], callback);
    }
};

module.exports = Usuario;


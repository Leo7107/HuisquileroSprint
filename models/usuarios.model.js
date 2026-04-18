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
    create: (data, callback) => {
        db.query('INSERT INTO tbl_usuarios SET ?', [data], callback);
    },
    update: (id, data, callback) => {
        db.query('UPDATE tbl_usuarios SET ? WHERE idUsuario = ?', [data, id], callback);
    },
    delete: (id, callback) => {
        db.query('DELETE FROM tbl_usuarios WHERE idUsuario = ?', [id], callback);
    },
    saveResetToken: (email, token, expiry, callback) => {
        db.query('UPDATE tbl_usuarios SET reset_token = ?, reset_token_expiry = ? WHERE Email = ?', [token, expiry, email], callback);
    },
    getByResetToken: (token, callback) => {
        db.query('SELECT * FROM tbl_usuarios WHERE reset_token = ?', [token], callback);
    },
    updatePassword: (id, hash, callback) => {
        db.query('UPDATE tbl_usuarios SET Password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE idUsuario = ?', [hash, id], callback);
    }
};

module.exports = Usuario;


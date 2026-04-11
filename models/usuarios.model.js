const db = require("../config/db");

const Usuario = {
    getAll: (cb) => db.query("SELECT * FROM tbl_usuarios", cb),
    getById: (id, cb) => db.query("SELECT * FROM tbl_usuarios WHERE idusuario = ?", [id], cb),
    getByEmail: (email, cb) => db.query("SELECT * FROM tbl_usuarios WHERE Email = ?", [email], cb),
    create: (data, cb) => db.query("INSERT INTO tbl_usuarios SET ?", data, cb),
    update: (id, data, cb) => db.query("UPDATE tbl_usuarios SET ? WHERE idusuario = ?", [data, id], cb),
    delete: (id, cb) => db.query("DELETE FROM tbl_usuarios WHERE idusuario = ?", [id], cb),

    // Recuperación de contraseña
    saveResetToken: (Email, token, expiry, cb) => db.query(
        "UPDATE tbl_usuarios SET reset_token = ?, reset_token_expiry = ? WHERE Email = ?",
        [token, expiry, Email], cb
    ),
    getByResetToken: (token, cb) => db.query(
        "SELECT idUsuario, Nombres, Apellidos, Email, idRol FROM tbl_usuarios WHERE reset_token = ? AND reset_token_expiry > NOW()",
        [token], cb
    ),
    updatePassword: (idUsuario, hashedPassword, cb) => db.query(
        "UPDATE tbl_usuarios SET Password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE idUsuario = ?",
        [hashedPassword, idUsuario], cb
    ),
};

module.exports = Usuario;

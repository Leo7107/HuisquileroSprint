const db = require("../config/db");

const Usuario = {
    getAll: (cb) => db.query("SELECT * FROM tbl_usuarios", cb),
    getById: (id, cb) => db.query("SELECT * FROM tbl_usuarios WHERE idusuario = ?", [id], cb),
    create: (data, cb) => db.query("INSERT INTO tbl_usuarios SET ?", data, cb),
    update: (id, data, cb) => db.query("UPDATE tbl_usuarios SET ? WHERE idusuario = ?", [data, id], cb),
    delete: (id, cb) => db.query("DELETE FROM tbl_usuarios WHERE idusuario = ?", [id], cb)
};

module.exports = Usuario;

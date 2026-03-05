const db = require("../config/db");

const Doctor = {
    getAll: (cb) => db.query("SELECT * FROM tbl_doctores", cb),
    getById: (id, cb) => db.query("SELECT * FROM tbl_doctores WHERE iddoctor = ?", [id], cb),
    create: (data, cb) => db.query("INSERT INTO tbl_doctores SET ?", data, cb),
    update: (id, data, cb) => db.query("UPDATE tbl_doctores SET ? WHERE iddoctor = ?", [data, id], cb),
    delete: (id, cb) => db.query("DELETE FROM tbl_doctores WHERE iddoctor = ?", [id], cb)
};

module.exports = Doctor;

const db = require("../config/db");

const Medicamento = {

  getAll: (cb) => db.query(`
    SELECT * FROM tbl_medicamentos ORDER BY nombre ASC
  `, cb),

  getActivos: (cb) => db.query(`
    SELECT * FROM tbl_medicamentos
    WHERE estado = 'ACTIVO' AND stock_actual > 0
    ORDER BY nombre ASC
  `, cb),

  getById: (id, cb) => db.query(`
    SELECT * FROM tbl_medicamentos WHERE idMedicamento = ?
  `, [id], cb),

  create: (data, cb) => db.query(
    "INSERT INTO tbl_medicamentos SET ?", data, cb
  ),

  update: (id, data, cb) => db.query(
    "UPDATE tbl_medicamentos SET ? WHERE idMedicamento = ?", [data, id], cb
  ),

  toggleEstado: (id, estado, cb) => db.query(
    "UPDATE tbl_medicamentos SET estado = ? WHERE idMedicamento = ?", [estado, id], cb
  ),

  descontarStock: (id, cantidad, idReceta, idUsuario, cb) => {
    db.query("SELECT stock_actual FROM tbl_medicamentos WHERE idMedicamento = ?", [id], (err, rows) => {
      if (err) return cb(err);
      const stockAnterior = rows[0]?.stock_actual ?? 0;
      const stockNuevo    = Math.max(0, stockAnterior - cantidad);

      db.query(
        "UPDATE tbl_medicamentos SET stock_actual = ? WHERE idMedicamento = ?",
        [stockNuevo, id],
        (err2) => {
          if (err2) return cb(err2);
          // Registrar movimiento de salida
          db.query(
            `INSERT INTO tbl_movimientos_inventario
             (idMedicamento, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, idUsuario, idReceta)
             VALUES (?, 'SALIDA', ?, ?, ?, 'Receta médica', ?, ?)`,
            [id, cantidad, stockAnterior, stockNuevo, idUsuario, idReceta],
            cb
          );
        }
      );
    });
  },

  registrarEntrada: (id, cantidad, proveedor, idUsuario, cb) => {
    db.query("SELECT stock_actual FROM tbl_medicamentos WHERE idMedicamento = ?", [id], (err, rows) => {
      if (err) return cb(err);
      const stockAnterior = rows[0]?.stock_actual ?? 0;
      const stockNuevo    = stockAnterior + cantidad;

      db.query(
        "UPDATE tbl_medicamentos SET stock_actual = ? WHERE idMedicamento = ?",
        [stockNuevo, id],
        (err2) => {
          if (err2) return cb(err2);
          db.query(
            `INSERT INTO tbl_movimientos_inventario
             (idMedicamento, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, proveedor, idUsuario)
             VALUES (?, 'ENTRADA', ?, ?, ?, 'Entrada de stock', ?, ?)`,
            [id, cantidad, stockAnterior, stockNuevo, proveedor, idUsuario],
            cb
          );
        }
      );
    });
  },

  ajustarStock: (id, cantidadNueva, motivo, idUsuario, cb) => {
    db.query("SELECT stock_actual FROM tbl_medicamentos WHERE idMedicamento = ?", [id], (err, rows) => {
      if (err) return cb(err);
      const stockAnterior = rows[0]?.stock_actual ?? 0;

      db.query(
        "UPDATE tbl_medicamentos SET stock_actual = ? WHERE idMedicamento = ?",
        [cantidadNueva, id],
        (err2) => {
          if (err2) return cb(err2);
          db.query(
            `INSERT INTO tbl_movimientos_inventario
             (idMedicamento, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, idUsuario)
             VALUES (?, 'AJUSTE', ?, ?, ?, ?, ?)`,
            [id, Math.abs(cantidadNueva - stockAnterior), stockAnterior, cantidadNueva, motivo, idUsuario],
            cb
          );
        }
      );
    });
  },

  getMovimientos: (cb) => db.query(`
    SELECT m.*, med.nombre AS nombreMedicamento,
           u.Nombres AS nombreUsuario, u.Apellidos AS apellidosUsuario
    FROM tbl_movimientos_inventario m
    LEFT JOIN tbl_medicamentos med ON m.idMedicamento = med.idMedicamento
    LEFT JOIN tbl_usuarios u ON m.idUsuario = u.idUsuario
    ORDER BY m.fecha_movimiento DESC
    LIMIT 100
  `, cb),

  getMovimientosByMedicamento: (id, cb) => db.query(`
    SELECT m.*, u.Nombres AS nombreUsuario, u.Apellidos AS apellidosUsuario
    FROM tbl_movimientos_inventario m
    LEFT JOIN tbl_usuarios u ON m.idUsuario = u.idUsuario
    WHERE m.idMedicamento = ?
    ORDER BY m.fecha_movimiento DESC
  `, [id], cb),

  getBajoStock: (cb) => db.query(`
    SELECT * FROM tbl_medicamentos
    WHERE stock_actual <= stock_minimo AND estado = 'ACTIVO'
    ORDER BY stock_actual ASC
  `, cb),
};

module.exports = Medicamento;
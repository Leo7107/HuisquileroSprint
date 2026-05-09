const Medicamento = require("../models/medicamentos.model");

exports.getAll = (req, res) => {
  Medicamento.getAll((err, rows) => {
    if (err) return res.status(500).json({ error: err });
    res.json(rows);
  });
};

exports.getActivos = (req, res) => {
  Medicamento.getActivos((err, rows) => {
    if (err) return res.status(500).json({ error: err });
    res.json(rows);
  });
};

exports.getBajoStock = (req, res) => {
  Medicamento.getBajoStock((err, rows) => {
    if (err) return res.status(500).json({ error: err });
    res.json(rows);
  });
};

exports.getById = (req, res) => {
  Medicamento.getById(req.params.id, (err, rows) => {
    if (err) return res.status(500).json({ error: err });
    res.json(rows[0] || {});
  });
};

exports.create = (req, res) => {
  const { nombre, descripcion, stock_actual, stock_minimo, unidad_medida, precio_unitario } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });
  const data = { nombre, descripcion, stock_actual: stock_actual || 0, stock_minimo: stock_minimo || 5, unidad_medida: unidad_medida || 'unidad', precio_unitario: precio_unitario || 0 };
  Medicamento.create(data, (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.status(201).json({ id: result.insertId, message: 'Medicamento creado' });
  });
};

exports.update = (req, res) => {
  const { nombre, descripcion, stock_actual, stock_minimo, unidad_medida, precio_unitario } = req.body;
  const data = { nombre, descripcion, stock_actual, stock_minimo, unidad_medida, precio_unitario };
  Medicamento.update(req.params.id, data, (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Medicamento actualizado' });
  });
};

exports.toggleEstado = (req, res) => {
  const { estado } = req.body;
  Medicamento.toggleEstado(req.params.id, estado, (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: `Medicamento ${estado}` });
  });
};

exports.registrarEntrada = (req, res) => {
  const { cantidad, proveedor } = req.body;
  const idUsuario = req.usuario?.id || null;
  if (!cantidad || cantidad <= 0) return res.status(400).json({ error: 'Cantidad inválida' });
  Medicamento.registrarEntrada(req.params.id, parseInt(cantidad), proveedor || null, idUsuario, (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Entrada registrada correctamente' });
  });
};

exports.ajustarStock = (req, res) => {
  const { cantidad_nueva, motivo } = req.body;
  const idUsuario = req.usuario?.id || null;
  if (cantidad_nueva === undefined) return res.status(400).json({ error: 'cantidad_nueva requerida' });
  Medicamento.ajustarStock(req.params.id, parseInt(cantidad_nueva), motivo || 'Ajuste manual', idUsuario, (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Stock ajustado correctamente' });
  });
};

exports.descontarStock = (req, res) => {
  const { cantidad, idReceta } = req.body;
  const idUsuario = req.usuario?.id || null;
  if (!cantidad || cantidad <= 0) return res.status(400).json({ error: 'Cantidad inválida' });
  Medicamento.descontarStock(req.params.id, parseInt(cantidad), idReceta || null, idUsuario, (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Stock descontado correctamente' });
  });
};

exports.getMovimientos = (req, res) => {
  Medicamento.getMovimientos((err, rows) => {
    if (err) return res.status(500).json({ error: err });
    res.json(rows);
  });
};

exports.getMovimientosByMedicamento = (req, res) => {
  Medicamento.getMovimientosByMedicamento(req.params.id, (err, rows) => {
    if (err) return res.status(500).json({ error: err });
    res.json(rows);
  });
};
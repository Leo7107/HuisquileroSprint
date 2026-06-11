const Medicamento = require("../models/medicamentos.model");
const Auditoria   = require("../models/auditoria.model");

function log(accion, descripcion, nombreUsuario, modulo) {
  Auditoria.registrar({ accion, descripcion, nombreUsuario, modulo, fecha: new Date() },
    (e) => { if (e) console.error('[auditoria]', e.message); });
}

exports.getAll = (req, res) => {
  Medicamento.getAll((err, rows) => {
    if (err) { console.error('[medicamentos]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
    res.json(rows);
  });
};

exports.getActivos = (req, res) => {
  Medicamento.getActivos((err, rows) => {
    if (err) { console.error('[medicamentos]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
    res.json(rows);
  });
};

exports.getBajoStock = (req, res) => {
  Medicamento.getBajoStock((err, rows) => {
    if (err) { console.error('[medicamentos]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
    res.json(rows);
  });
};

exports.getById = (req, res) => {
  Medicamento.getById(req.params.id, (err, rows) => {
    if (err) { console.error('[medicamentos]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
    res.json(rows[0] || {});
  });
};

exports.create = (req, res) => {
  const { nombre, descripcion, stock_actual, stock_minimo, unidad_medida, precio_unitario } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });
  const data = { nombre, descripcion, stock_actual: stock_actual || 0, stock_minimo: stock_minimo || 5,
                 unidad_medida: unidad_medida || 'unidad', precio_unitario: precio_unitario || 0 };
  Medicamento.create(data, (err, result) => {
    if (err) { console.error('[medicamentos]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
    const actor = req.user || {};
    log('MEDICAMENTO_CREADO',
      `Se agregó "${nombre}" al inventario con stock inicial de ${stock_actual || 0} ${unidad_medida || 'unidades'}`,
      actor.nombre || 'Admin', 'Inventario');
    res.status(201).json({ id: result.insertId, message: 'Medicamento creado' });
  });
};

exports.update = (req, res) => {
  const { nombre, descripcion, stock_actual, stock_minimo, unidad_medida, precio_unitario } = req.body;
  Medicamento.getById(req.params.id, (e0, rows0) => {
    const m = Array.isArray(rows0) ? rows0[0] : rows0;
    const nombreMed = m ? m.nombre : `ID ${req.params.id}`;
    const data = { nombre, descripcion, stock_actual, stock_minimo, unidad_medida, precio_unitario };
    Medicamento.update(req.params.id, data, (err) => {
      if (err) { console.error('[medicamentos]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
      const actor = req.user || {};
      log('MEDICAMENTO_ACTUALIZADO',
        `Se actualizaron los datos de "${nombreMed || nombre}"`,
        actor.nombre || 'Admin', 'Inventario');
      res.json({ message: 'Medicamento actualizado' });
    });
  });
};

exports.toggleEstado = (req, res) => {
  const { estado } = req.body;
  Medicamento.getById(req.params.id, (e0, rows0) => {
    const m = Array.isArray(rows0) ? rows0[0] : rows0;
    const nombreMed = m ? m.nombre : `ID ${req.params.id}`;
    Medicamento.toggleEstado(req.params.id, estado, (err) => {
      if (err) { console.error('[medicamentos]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
      const actor = req.user || {};
      log('MEDICAMENTO_ESTADO',
        `"${nombreMed}" fue ${estado === 'ACTIVO' ? 'activado' : 'desactivado'} en el inventario`,
        actor.nombre || 'Admin', 'Inventario');
      res.json({ message: `Medicamento ${estado}` });
    });
  });
};

exports.registrarEntrada = (req, res) => {
  const { cantidad, proveedor } = req.body;
  const idUsuario = req.user?.id || null;
  if (!cantidad || cantidad <= 0) return res.status(400).json({ error: 'Cantidad inválida' });
  Medicamento.getById(req.params.id, (e0, rows0) => {
    const m = Array.isArray(rows0) ? rows0[0] : rows0;
    const nombreMed = m ? m.nombre : `ID ${req.params.id}`;
    Medicamento.registrarEntrada(req.params.id, parseInt(cantidad), proveedor || null, idUsuario, (err) => {
      if (err) { console.error('[medicamentos]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
      const actor = req.user || {};
      const provTxt = proveedor ? ` — proveedor: ${proveedor}` : '';
      log('INVENTARIO_ENTRADA',
        `Entrada de ${cantidad} unidades de "${nombreMed}"${provTxt}`,
        actor.nombre || 'Admin', 'Inventario');
      res.json({ message: 'Entrada registrada correctamente' });
    });
  });
};

exports.ajustarStock = (req, res) => {
  const { cantidad_nueva, motivo } = req.body;
  const idUsuario = req.user?.id || null;
  if (cantidad_nueva === undefined) return res.status(400).json({ error: 'cantidad_nueva requerida' });
  Medicamento.getById(req.params.id, (e0, rows0) => {
    const m = Array.isArray(rows0) ? rows0[0] : rows0;
    const nombreMed  = m ? m.nombre : `ID ${req.params.id}`;
    const stockAntes = m ? m.stock_actual : '?';
    Medicamento.ajustarStock(req.params.id, parseInt(cantidad_nueva), motivo || 'Ajuste manual', idUsuario, (err) => {
      if (err) { console.error('[medicamentos]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
      const actor = req.user || {};
      log('INVENTARIO_AJUSTE',
        `Stock de "${nombreMed}" ajustado de ${stockAntes} → ${cantidad_nueva} unidades. Motivo: ${motivo || 'Ajuste manual'}`,
        actor.nombre || 'Admin', 'Inventario');
      res.json({ message: 'Stock ajustado correctamente' });
    });
  });
};

exports.descontarStock = (req, res) => {
  const { cantidad, idReceta } = req.body;
  const idUsuario = req.user?.id || null;
  if (!cantidad || cantidad <= 0) return res.status(400).json({ error: 'Cantidad inválida' });
  Medicamento.getById(req.params.id, (e0, rows0) => {
    const m = Array.isArray(rows0) ? rows0[0] : rows0;
    const nombreMed = m ? m.nombre : `ID ${req.params.id}`;
    Medicamento.descontarStock(req.params.id, parseInt(cantidad), idReceta || null, idUsuario, (err) => {
      if (err) { console.error('[medicamentos]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
      const actor  = req.user || {};
      const receta = idReceta ? ` (receta #${idReceta})` : '';
      log('INVENTARIO_DESCUENTO',
        `Se descontaron ${cantidad} unidades de "${nombreMed}"${receta}`,
        actor.nombre || 'Doctor', 'Inventario');
      res.json({ message: 'Stock descontado correctamente' });
    });
  });
};

exports.getMovimientos = (req, res) => {
  Medicamento.getMovimientos((err, rows) => {
    if (err) { console.error('[medicamentos]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
    res.json(rows);
  });
};

exports.getMovimientosByMedicamento = (req, res) => {
  Medicamento.getMovimientosByMedicamento(req.params.id, (err, rows) => {
    if (err) { console.error('[medicamentos]', err); return res.status(500).json({ message: 'Error interno del servidor.' }); }
    res.json(rows);
  });
};
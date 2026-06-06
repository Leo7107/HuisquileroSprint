const express    = require("express");
const router     = express.Router();
const ctrl       = require("../controllers/medicamentos.controller");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

// Consultas generales
router.get("/",              ctrl.getAll);
router.get("/activos",       ctrl.getActivos);
router.get("/bajo-stock",    ctrl.getBajoStock);
router.get("/movimientos",   ctrl.getMovimientos);
router.get("/:id",           ctrl.getById);
router.get("/:id/movimientos", ctrl.getMovimientosByMedicamento);

// CRUD
router.post("/",             ctrl.create);
router.put("/:id",           ctrl.update);
router.patch("/:id/toggle",  ctrl.toggleEstado);

// Movimientos de stock
router.post("/:id/entrada",  ctrl.registrarEntrada);
router.post("/:id/ajuste",   ctrl.ajustarStock);
router.post("/:id/descontar",ctrl.descontarStock);

module.exports = router;
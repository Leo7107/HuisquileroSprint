const express = require("express");
const router = express.Router();
const detallesFacturaController = require("../controllers/detalles_factura.controller");

router.get("/", detallesFacturaController.getDetallesFactura);
router.get("/:id", detallesFacturaController.getDetalleFacturaById);
router.post("/", detallesFacturaController.createDetalleFactura);
router.put("/:id", detallesFacturaController.updateDetalleFactura);
router.delete("/:id", detallesFacturaController.deleteDetalleFactura);

module.exports = router;

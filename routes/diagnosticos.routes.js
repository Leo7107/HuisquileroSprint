const express = require("express");
const router = express.Router();
const diagnosticosController = require("../controllers/diagnosticos.controller");

router.get("/", diagnosticosController.getDiagnosticos);
router.get("/:id", diagnosticosController.getDiagnosticoById);
router.post("/", diagnosticosController.createDiagnostico);
router.put("/:id", diagnosticosController.updateDiagnostico);
router.delete("/:id", diagnosticosController.deleteDiagnostico);

module.exports = router;

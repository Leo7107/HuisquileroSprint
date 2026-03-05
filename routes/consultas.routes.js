const express = require("express");
const router = express.Router();
const consultasController = require("../controllers/consultas.controller");

router.get("/", consultasController.getConsultas);
router.get("/:id", consultasController.getConsultaById);
router.post("/", consultasController.createConsulta);
router.put("/:id", consultasController.updateConsulta);
router.delete("/:id", consultasController.deleteConsulta);

module.exports = router;

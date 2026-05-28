const express = require("express");
const router = express.Router();
const pacientesController = require("../controllers/pacientes.controller");
const auth = require("../middleware/auth");

router.use(auth);

router.get("/", pacientesController.getPacientes);
router.get("/:id", pacientesController.getPacienteById);
router.post("/", pacientesController.createPaciente);
router.put("/:id", pacientesController.updatePaciente);
router.delete("/:id", pacientesController.deletePaciente);

module.exports = router;

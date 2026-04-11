const express = require("express");
const router = express.Router();
const doctoresController = require("../controllers/doctores.controller");

// GET todos (admin)
router.get("/", doctoresController.getDoctores);

// GET solo activos (recepcionista — para agendar citas)
router.get("/activos", doctoresController.getDoctoresActivos);

// GET por id
router.get("/:id", doctoresController.getDoctorById);

// POST crear
router.post("/", doctoresController.createDoctor);

// PUT actualizar datos
router.put("/:id", doctoresController.updateDoctor);

// PATCH activar / desactivar (Criterio 1 y 4)
router.patch("/:id/desactivar", doctoresController.desactivarDoctor);
router.patch("/:id/activar",    doctoresController.activarDoctor);

// DELETE eliminar físico (solo si se necesita)
router.delete("/:id", doctoresController.deleteDoctor);

module.exports = router;
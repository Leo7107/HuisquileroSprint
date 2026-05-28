const express = require("express");
const router = express.Router();
const doctoresController = require("../controllers/doctores.controller");
const auth = require("../middleware/auth");

router.use(auth);

// GET todos — admin y recepcionista
router.get("/", doctoresController.getDoctores);

// GET solo activos — criterio 4: para agendar citas
// IMPORTANTE: rutas estáticas antes de /:id para que Express no las confunda con un ID
router.get("/activos", doctoresController.getDoctoresActivos);
router.get("/by-usuario/:idUsuario", doctoresController.getDoctorByUsuario);

// GET por id
router.get("/:id", doctoresController.getDoctorById);

// POST crear — criterios 1 y 3
router.post("/", doctoresController.createDoctor);

// PUT actualizar — criterios 1, 2 y 3
router.put("/:id", doctoresController.updateDoctor);

// PATCH activar / desactivar — criterios 1 y 4
router.patch("/:id/desactivar", doctoresController.desactivarDoctor);
router.patch("/:id/activar",    doctoresController.activarDoctor);

// DELETE eliminar físico
router.delete("/:id", doctoresController.deleteDoctor);

module.exports = router;
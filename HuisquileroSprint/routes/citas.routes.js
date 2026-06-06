const express = require("express");
const router  = express.Router();
const citasController = require("../controllers/citas.controller");
const auth    = require("../middleware/auth");

// ── EXISTENTES ────────────────────────────────────────────────────────────────
router.get("/",                        auth, citasController.getCitas);
router.get("/paciente/:idUsuario",     auth, citasController.getCitasByPaciente);
router.get("/porpaciente/:idPaciente", auth, citasController.getCitasByIdPaciente);
router.get("/doctor/:idDoctor",        auth, citasController.getCitasByDoctor);   // ← NUEVO
router.get("/:id",                     auth, citasController.getCitaById);
router.post("/",                       auth, citasController.createCita);
router.put("/:id",                     auth, citasController.updateCita);
router.delete("/:id",                  auth, citasController.deleteCita);
router.patch("/:id/completar",         auth, citasController.completarCita);
router.patch("/:id/cancelar",          auth, citasController.cancelarCita);
router.put("/:id/reprogramar",         auth, citasController.reprogramarCita);

module.exports = router;
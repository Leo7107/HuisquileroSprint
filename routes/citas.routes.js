const express = require("express");
const router  = express.Router();
const citasController = require("../controllers/citas.controller");
const auth    = require("../middleware/auth");

// ── EXISTENTES ────────────────────────────────────────────────────────────────
router.get("/",                        auth, citasController.getCitas);
router.get("/disponibilidad",          auth, citasController.getDisponibilidad);
router.get("/paciente/:idUsuario",     auth, citasController.getCitasByPaciente);
router.get("/porpaciente/:idPaciente", auth, citasController.getCitasByIdPaciente);
router.get("/doctor/:idDoctor",        auth, citasController.getCitasByDoctor);
router.get("/:id",                     auth, citasController.getCitaById);
router.post("/",                       auth, citasController.createCita);
router.put("/:id",                     auth, citasController.updateCita);
router.delete("/:id",                  auth, citasController.deleteCita);
router.patch("/:id/completar",         auth, citasController.completarCita);
router.patch("/:id/cancelar",          auth, citasController.cancelarCita);
router.put("/:id/reprogramar",         auth, citasController.reprogramarCita);
router.patch("/:id/inconveniente",     auth, citasController.reportarInconveniente);
router.patch("/:id/reasignar",         auth, citasController.reasignarCita);
router.patch("/:id/cancelar-recepcion",auth, citasController.cancelarPorRecepcion);

module.exports = router;
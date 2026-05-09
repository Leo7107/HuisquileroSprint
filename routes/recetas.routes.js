const express = require("express");
const router = express.Router();
const recetasController = require("../controllers/recetas.controller");

// ── FIX orden de rutas ────────────────────────────────────────────────────────
// ANTES: /paciente/:idPaciente estaba DESPUÉS de /:id — Express interpretaba
//        la palabra "paciente" como un id numérico y nunca llegaba al controlador
//        correcto, por eso las recetas nunca aparecían en el dashboard del paciente.
// CAMBIO: /paciente/:idPaciente se mueve ARRIBA de /:id (las rutas específicas
//         siempre deben declararse antes que las rutas con parámetro genérico).
// ─────────────────────────────────────────────────────────────────────────────
router.get('/paciente/:idPaciente', recetasController.getRecetasByPaciente);

router.get("/", recetasController.getRecetas);
router.get("/:id", recetasController.getRecetaById);
router.post("/", recetasController.createReceta);
router.put("/:id", recetasController.updateReceta);
router.delete("/:id", recetasController.deleteReceta);

module.exports = router;
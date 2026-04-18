const express = require("express");
const router = express.Router();
const perfilController = require("../controllers/perfil.controller");

router.get("/:idUsuario", perfilController.getPerfil);
router.put("/:idUsuario", perfilController.updatePerfil);

module.exports = router;

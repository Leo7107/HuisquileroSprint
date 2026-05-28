const express = require("express");
const router = express.Router();
const perfilController = require("../controllers/perfil.controller");
const auth = require("../middleware/auth");

router.use(auth);

router.get("/:idUsuario", perfilController.getPerfil);
router.put("/:idUsuario", perfilController.updatePerfil);

module.exports = router;

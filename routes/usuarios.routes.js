const express = require("express");
const router = express.Router();
const usuariosController = require("../controllers/usuarios.controller");

router.post("/login", usuariosController.login);
router.post("/forgot-password", usuariosController.forgotPassword);  // ← NUEVA
router.post("/reset-password", usuariosController.resetPassword);    // ← NUEVA

router.get("/", usuariosController.getUsuarios);
router.get("/:id", usuariosController.getUsuarioById);
router.post("/", usuariosController.createUsuario);
router.put("/:id", usuariosController.updateUsuario);
router.delete("/:id", usuariosController.deleteUsuario);

module.exports = router;

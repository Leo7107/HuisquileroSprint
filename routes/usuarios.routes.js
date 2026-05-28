const express = require("express");
const router = express.Router();
const usuariosController = require("../controllers/usuarios.controller");
const auth = require("../middleware/auth");

// Rutas públicas (no requieren token)
router.post("/login", usuariosController.login);
router.post("/forgot-password", usuariosController.forgotPassword);
router.post("/reset-password", usuariosController.resetPassword);
router.post("/", usuariosController.createUsuario); // registro público

// Rutas protegidas con JWT
router.use(auth);

router.get("/", usuariosController.getUsuarios);
router.get("/:id", usuariosController.getUsuarioById);
router.put("/:id", usuariosController.updateUsuario);
router.delete("/:id", usuariosController.deleteUsuario);

module.exports = router;

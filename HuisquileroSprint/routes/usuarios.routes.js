const express    = require("express");
const router     = express.Router();
const rateLimit  = require("express-rate-limit");
const usuariosController = require("../controllers/usuarios.controller");
const auth = require("../middleware/auth");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: 'Demasiadas solicitudes de recuperación. Intenta en 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rutas públicas (no requieren token)
router.post("/login", loginLimiter, usuariosController.login);
router.post("/forgot-password", forgotLimiter, usuariosController.forgotPassword);
router.post("/reset-password", forgotLimiter, usuariosController.resetPassword);
router.post("/", usuariosController.createUsuario); // registro público

// Rutas protegidas con JWT
router.use(auth);

router.get("/", usuariosController.getUsuarios);
router.get("/:id", usuariosController.getUsuarioById);
router.put("/:id", usuariosController.updateUsuario);
router.delete("/:id", usuariosController.deleteUsuario);

module.exports = router;

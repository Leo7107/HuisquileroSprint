const jwt = require("jsonwebtoken");
require("dotenv").config();

// Tu función original intacta
function authMiddleware(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; 

    if (!token) {
        return res.status(401).json({ message: "Acceso denegado. Token requerido." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Aquí se guarda el usuario, incluyendo su rol (ej: req.user.id_rol o req.user.rol)
        next();
    } catch (err) {
        return res.status(403).json({ message: "Token inválido o expirado." });
    }
}

// NUEVA FUNCIÓN: Validar si el rol del usuario tiene permiso (Criterio 3)
function verificarRol(rolesPermitidos) {
    return (req, res, next) => {
        // Ajusta 'req.user.rol' si en tu token guardas el rol con otro nombre (ej. id_rol)
        if (!req.user || !rolesPermitidos.includes(req.user.rol)) {
            return res.status(403).json({ 
                message: "Acceso denegado. No tienes los permisos requeridos para acceder a este reporte." 
            });
        }
        next();
    };
}

// Exportamos ambas funciones
module.exports = {
    authMiddleware,
    verificarRol
};

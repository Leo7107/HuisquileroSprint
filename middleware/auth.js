const jwt = require("jsonwebtoken");
require("dotenv").config();

function authMiddleware(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; 

    if (!token) {
        return res.status(401).json({ message: "Acceso denegado. Token requerido." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; 
        next();
    } catch (err) {
        return res.status(403).json({ message: "Token inválido o expirado." });
    }
}

function verificarRol(rolesPermitidos) {
    return (req, res, next) => {
        if (!req.user || !rolesPermitidos.includes(req.user.rol)) {
            return res.status(403).json({ 
                message: "Acceso denegado. No tienes los permisos requeridos para acceder a este reporte." 
            });
        }
        next();
    };
}

// Exportación híbrida: Funciona como función directa y también contiene sub-propiedades
module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.verificarRol = verificarRol;

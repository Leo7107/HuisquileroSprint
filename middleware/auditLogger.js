const Auditoria = require('../models/auditoria.model');

function logFailedAuth(email, ip, motivo) {
  Auditoria.registrar({
    accion: 'LOGIN_FALLIDO',
    descripcion: `Intento fallido: ${motivo} | Email: ${email} | IP: ${ip}`,
    nombreUsuario: email || 'desconocido',
    modulo: 'Autenticación',
    fecha: new Date(),
  }, (err) => { if (err) console.error('[auditLogger]', err.message); });
}

function logSuccessAuth(usuario, ip) {
  Auditoria.registrar({
    accion: 'LOGIN_EXITOSO',
    descripcion: `Login exitoso | ID: ${usuario.id} | IP: ${ip}`,
    nombreUsuario: usuario.nombre || 'usuario',
    modulo: 'Autenticación',
    fecha: new Date(),
  }, (err) => { if (err) console.error('[auditLogger]', err.message); });
}

module.exports = { logFailedAuth, logSuccessAuth };
const Usuario  = require("../models/usuarios.model");
const bcrypt   = require("bcrypt");
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const nodemailer = require('nodemailer');
const { logFailedAuth, logSuccessAuth } = require('../middleware/auditLogger');
const Auditoria = require('../models/auditoria.model');

const BCRYPT_ROUNDS = 10;
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ROLES = { ADMIN: 1, PACIENTE: 30001, DOCTOR: 30002, RECEPCIONISTA: 30003 };
const NOMBRE_ROL = { 1: 'Administrador', 30001: 'Paciente', 30002: 'Doctor', 30003: 'Recepcionista' };

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

function log(accion, descripcion, nombreUsuario, modulo) {
  Auditoria.registrar({ accion, descripcion, nombreUsuario, modulo, fecha: new Date() },
    (e) => { if (e) console.error('[auditoria]', e.message); });
}

exports.getUsuarios = (req, res) => {
  Usuario.getAll((err, results) => {
    if (err) { console.error('[getUsuarios]', err); return res.status(500).json({ message: 'Error interno.' }); }
    res.json(results);
  });
};

exports.getUsuarioById = (req, res) => {
  Usuario.getById(req.params.id, (err, result) => {
    if (err) { console.error('[getUsuarioById]', err); return res.status(500).json({ message: 'Error interno.' }); }
    res.json(result);
  });
};

exports.createUsuario = (req, res) => {
  const { Nombres, Apellidos, Sexo, Fecha_nacimiento, Telefono, Direccion, Email, Password_hash } = req.body;
  if (!Email || !Password_hash || !Nombres)
    return res.status(400).json({ message: 'Campos requeridos: Nombres, Email, Password_hash.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(Email))
    return res.status(400).json({ message: 'Formato de email inválido.' });
  if (Password_hash.length < 8)
    return res.status(400).json({ message: 'Contraseña mínimo 8 caracteres.' });

  bcrypt.hash(Password_hash, BCRYPT_ROUNDS, (err, hash) => {
    if (err) return res.status(500).json({ message: 'Error interno.' });
    Usuario.create({ Nombres, Apellidos, Sexo, Fecha_nacimiento, Telefono, Direccion,
                     Email, Password_hash: hash, Estado: 'ACTIVO', idRol: 30001 }, (err, result) => {
      if (err) return res.status(500).json({ message: 'Error interno.' });
      const admin = req.user || {};
      log('USUARIO_CREADO',
        `Se registró el nuevo usuario ${Nombres} ${Apellidos || ''} (${Email}) con rol Paciente`,
        admin.nombre || 'Admin', 'Usuarios');
      res.json({ message: "Usuario creado", id: result.insertId });
    });
  });
};

exports.updateUsuario = (req, res) => {
  const { Nombres, Apellidos, Sexo, Fecha_nacimiento, Telefono, Direccion, Email, Estado, idRol } = req.body;
  const data = { Nombres, Apellidos, Sexo, Fecha_nacimiento, Telefono, Direccion, Email, Estado, idRol };
  Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);

  const admin   = req.user || {};
  const esMismo = admin.id != null && String(admin.id) === String(req.params.id);

  // Buscar el registro actual para validaciones y log
  Usuario.getById(req.params.id, (e0, rows) => {
    if (e0) { console.error('[updateUsuario:getById]', e0); return res.status(500).json({ message: 'Error interno.' }); }
    const u = Array.isArray(rows) ? rows[0] : rows;
    if (!u) return res.status(404).json({ message: 'Usuario no encontrado.' });
    const nombreU = `${u.Nombres} ${u.Apellidos || ''}`.trim() || `ID ${req.params.id}`;

    // 1) Auto-protección: el admin no puede desactivarse ni degradarse a sí mismo
    if (esMismo && Estado && Estado !== 'ACTIVO')
      return res.status(400).json({ message: 'No puedes desactivar tu propia cuenta.' });
    if (esMismo && idRol !== undefined && Number(idRol) !== ROLES.ADMIN)
      return res.status(400).json({ message: 'No puedes quitarte a ti mismo el rol de administrador.' });

    // 2) Protección del "último administrador": ningún cambio puede dejar al
    //    sistema sin administradores activos.
    const esAdminActivo = Number(u.idRol) === ROLES.ADMIN && u.Estado === 'ACTIVO';
    const pierdeAdmin   = (Estado && Estado !== 'ACTIVO') ||
                          (idRol !== undefined && Number(idRol) !== ROLES.ADMIN);

    const aplicar = () => {
      Usuario.update(req.params.id, data, (err) => {
        if (err) { console.error('[updateUsuario]', err); return res.status(500).json({ message: 'Error interno.' }); }
        let detalle = '';
        if (Estado)  detalle += ` estado → ${Estado}`;
        if (idRol)   detalle += ` rol → ${NOMBRE_ROL[idRol] || idRol}`;
        log('USUARIO_ACTUALIZADO',
          `Datos de ${nombreU} actualizados${detalle}`,
          admin.nombre || 'Admin', 'Usuarios');
        res.json({ message: "Usuario actualizado" });
      });
    };

    if (esAdminActivo && pierdeAdmin) {
      Usuario.countAdminsActivos((eC, rc) => {
        if (eC) { console.error('[updateUsuario:countAdmins]', eC); return res.status(500).json({ message: 'Error interno.' }); }
        const total = (rc && rc[0] && rc[0].total) || 0;
        if (total <= 1)
          return res.status(409).json({ message: 'Debe existir al menos un administrador activo. Asigna otro administrador antes de hacer este cambio.' });
        aplicar();
      });
    } else {
      aplicar();
    }
  });
};

exports.deleteUsuario = (req, res) => {
  const admin = req.user || {};

  // Evitar que el administrador elimine su propia cuenta (riesgo de quedar bloqueado)
  if (admin.id != null && String(admin.id) === String(req.params.id))
    return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta.' });

  Usuario.getById(req.params.id, (e0, rows) => {
    if (e0) { console.error('[deleteUsuario:getById]', e0); return res.status(500).json({ message: 'Error interno.' }); }
    const u = Array.isArray(rows) ? rows[0] : rows;
    if (!u) return res.status(404).json({ message: 'Usuario no encontrado.' });

    const nombreU = `${u.Nombres} ${u.Apellidos || ''}`.trim() || `ID ${req.params.id}`;

    const ejecutarBorrado = () => {
      Usuario.delete(req.params.id, (err) => {
        if (err) {
          console.error('[deleteUsuario]', err.code || '', err.sqlMessage || err.message);
          // Si aún quedara alguna dependencia no contemplada, informar con claridad
          if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451)
            return res.status(409).json({ message: 'No se puede eliminar: el usuario tiene registros asociados.' });
          return res.status(500).json({ message: 'Error interno.' });
        }
        log('USUARIO_ELIMINADO',
          `El usuario ${nombreU} fue eliminado del sistema`,
          admin.nombre || 'Admin', 'Usuarios');
        res.json({ message: "Usuario eliminado" });
      });
    };

    // Protección del "último administrador": no permitir eliminar al único admin activo
    if (Number(u.idRol) === ROLES.ADMIN && u.Estado === 'ACTIVO') {
      Usuario.countAdminsActivos((eC, rc) => {
        if (eC) { console.error('[deleteUsuario:countAdmins]', eC); return res.status(500).json({ message: 'Error interno.' }); }
        const total = (rc && rc[0] && rc[0].total) || 0;
        if (total <= 1)
          return res.status(409).json({ message: 'No puedes eliminar al único administrador activo del sistema.' });
        ejecutarBorrado();
      });
    } else {
      ejecutarBorrado();
    }
  });
};

exports.login = (req, res) => {
  const { Email, Password_hash } = req.body;
  const ip = req.ip || req.headers['x-forwarded-for'] || 'desconocida';
  if (!Email || !Password_hash)
    return res.status(400).json({ message: 'Email y contraseña requeridos.' });

  Usuario.getByEmail(Email, (err, results) => {
    if (err) return res.status(500).json({ message: 'Error interno.' });
    if (results.length === 0) {
      logFailedAuth(Email, ip, 'Usuario no encontrado');
      return res.status(401).json({ message: "Credenciales inválidas." });
    }
    const usuario = results[0];
    bcrypt.compare(Password_hash, usuario.Password_hash, (err, coincide) => {
      if (err) return res.status(500).json({ message: 'Error interno.' });
      if (!coincide) {
        logFailedAuth(Email, ip, 'Contraseña incorrecta');
        return res.status(401).json({ message: "Credenciales inválidas." });
      }
      // Bloquear el acceso de cuentas desactivadas (sin eliminar su información).
      // Se valida después de la contraseña para no revelar el estado de la cuenta
      // a quien no posee las credenciales correctas.
      if (usuario.Estado && usuario.Estado !== 'ACTIVO') {
        logFailedAuth(Email, ip, 'Cuenta desactivada');
        return res.status(403).json({ message: "Tu cuenta está desactivada. Contacta al administrador." });
      }
      const token = jwt.sign(
        { id: usuario.idUsuario, rol: usuario.idRol, nombre: usuario.Nombres },
        process.env.JWT_SECRET,
        { expiresIn: "8h" }
      );
      logSuccessAuth({ id: usuario.idUsuario, nombre: usuario.Nombres }, ip);
      res.json({ token, usuario: { id: usuario.idUsuario, nombre: usuario.Nombres, rol: usuario.idRol } });
    });
  });
};

exports.forgotPassword = (req, res) => {
  const { Email } = req.body;
  if (!Email || !/\S+@\S+\.\S+/.test(Email))
    return res.status(400).json({ message: "Correo inválido." });

  Usuario.getByEmail(Email, (err, results) => {
    if (err) return res.status(500).json({ message: 'Error interno.' });
    if (results.length === 0)
      return res.status(200).json({ message: "Si el correo existe, recibirás un enlace." });

    const usuario = results[0];
    const token  = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 15 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");

    Usuario.saveResetToken(Email, token, expiry, (err) => {
      if (err) return res.status(500).json({ message: 'Error interno.' });
      const resetLink = `${BASE_URL}/html/forgot-password.html?token=${token}`;
      const rolTexto  = usuario.idRol === ROLES.DOCTOR ? "Dr(a)." : "";
      transporter.sendMail({
        from: `"Clínica" <${process.env.SMTP_USER}>`,
        to: usuario.Email,
        subject: 'Restablecer tu contraseña',
        html: `<p>Hola <strong>${rolTexto} ${usuario.Nombres}</strong>.</p>
               <p>Enlace válido por 15 minutos: <a href="${resetLink}">Restablecer contraseña</a></p>`,
      }, (err) => {
        if (err) { console.error("[forgotPassword]", err.message); return res.status(500).json({ message: "No se pudo enviar el correo." }); }
        log('CONTRASENA_RESET_SOLICITADA',
          `${usuario.Nombres} solicitó restablecer su contraseña`,
          usuario.Nombres, 'Usuarios');
        res.status(200).json({ message: "Si el correo existe, recibirás un enlace." });
      });
    });
  });
};

exports.resetPassword = (req, res) => {
  const { token, password } = req.body;
  if (!token || !password)
    return res.status(400).json({ message: "Datos incompletos." });
  if (password.length < 8)
    return res.status(400).json({ message: "Contraseña mínimo 8 caracteres." });

  Usuario.getByResetToken(token, (err, results) => {
    if (err) return res.status(500).json({ message: 'Error interno.' });
    if (results.length === 0)
      return res.status(400).json({ message: "Enlace inválido o expirado." });

    bcrypt.hash(password, BCRYPT_ROUNDS, (err, hash) => {
      if (err) return res.status(500).json({ message: 'Error interno.' });
      Usuario.updatePassword(results[0].idUsuario, hash, (err) => {
        if (err) return res.status(500).json({ message: 'Error interno.' });
        log('CONTRASENA_ACTUALIZADA',
          `${results[0].Nombres || 'Usuario'} actualizó su contraseña`,
          results[0].Nombres || 'Usuario', 'Usuarios');
        res.json({ message: "Contraseña actualizada correctamente." });
      });
    });
  });
};
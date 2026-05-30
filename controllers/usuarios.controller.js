const Usuario = require("../models/usuarios.model");
const bcrypt  = require("bcrypt");
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const nodemailer = require('nodemailer');
const { logFailedAuth, logSuccessAuth } = require('../middleware/auditLogger');

const BCRYPT_ROUNDS = 10;
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ROLES = { ADMIN: 1, PACIENTE: 30001, DOCTOR: 30002, RECEPCIONISTA: 30003 };

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

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
      res.json({ message: "Usuario creado", id: result.insertId });
    });
  });
};

exports.updateUsuario = (req, res) => {
  const { Nombres, Apellidos, Sexo, Fecha_nacimiento, Telefono, Direccion, Email, Estado } = req.body;
  const data = { Nombres, Apellidos, Sexo, Fecha_nacimiento, Telefono, Direccion, Email, Estado };
  Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);
  Usuario.update(req.params.id, data, (err) => {
    if (err) return res.status(500).json({ message: 'Error interno.' });
    res.json({ message: "Usuario actualizado" });
  });
};

exports.deleteUsuario = (req, res) => {
  Usuario.delete(req.params.id, (err) => {
    if (err) return res.status(500).json({ message: 'Error interno.' });
    res.json({ message: "Usuario eliminado" });
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
      const token = jwt.sign(
        { id: usuario.idUsuario, rol: usuario.idRol },
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
        res.json({ message: "Contraseña actualizada correctamente." });
      });
    });
  });
};
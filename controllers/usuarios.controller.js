const Usuario = require("../models/usuarios.model");
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ROLES = { ADMIN: 1, PACIENTE: 30001, DOCTOR: 30003 };

exports.getUsuarios = (req, res) => {
    Usuario.getAll((err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
};

exports.getUsuarioById = (req, res) => {
    Usuario.getById(req.params.id, (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json(result);
    });
};

exports.createUsuario = (req, res) => {
    const data = req.body;
    console.log("datos recibidos", data);
    bcrypt.hash(data.Password_hash, 10, (err, hash) => {
        if (err) return res.status(500).json({ error: err });
        console.log("Hash generado:", hash);
        data.Password_hash = hash;
        Usuario.create(data, (err, result) => {
            if (err) {
                console.log("Error BD:", err);
                return res.status(500).json({ error: err });
            }
            res.json({ message: "Usuario creado", id: result.insertId });
        });
    });
};

exports.updateUsuario = (req, res) => {
    Usuario.update(req.params.id, req.body, (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Usuario actualizado" });
    });
};

exports.deleteUsuario = (req, res) => {
    Usuario.delete(req.params.id, (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Usuario eliminado" });
    });
};

exports.login = (req, res) => {
    const { Email, Password_hash } = req.body;
    Usuario.getByEmail(Email, (err, results) => {
        if (err) return res.status(500).json({ error: err });
        if (results.length === 0) return res.status(401).json({ message: "Usuario no encontrado" });
        const usuario = results[0];
        bcrypt.compare(Password_hash, usuario.Password_hash, (err, coincide) => {
            if (err) return res.status(500).json({ error: err });
            if (!coincide) return res.status(401).json({ message: "Contraseña incorrecta" });
            const token = jwt.sign(
                { id: usuario.idUsuario, rol: usuario.idRol },
                process.env.JWT_SECRET,
                { expiresIn: "8h" }
            );
            res.json({ token, usuario: { id: usuario.idUsuario, nombre: usuario.Nombres, rol: usuario.idRol } });
        });
    });
};

exports.forgotPassword = (req, res) => {
    const { Email } = req.body;
    if (!Email || !/\S+@\S+\.\S+/.test(Email)) {
        return res.status(400).json({ message: "Correo inválido." });
    }
    Usuario.getByEmail(Email, (err, results) => {
        if (err) return res.status(500).json({ error: err });
        if (results.length === 0) {
            return res.status(200).json({ message: "Si el correo existe, recibirás un enlace." });
        }
        const usuario = results[0];
        const token = crypto.randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 15 * 60 * 1000);
        Usuario.saveResetToken(Email, token, expiry, (err) => {
            if (err) return res.status(500).json({ error: err });
            const resetLink = `${BASE_URL}/forgot-password.html?token=${token}`;
            let rolTexto = "";
            if (usuario.idRol === ROLES.DOCTOR) rolTexto = "Dr(a).";
            const mailOptions = {
                from: `"Clínica" <${process.env.SMTP_USER}>`,
                to: usuario.Email,
                subject: 'Restablecer tu contraseña',
                html: `
                    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
                        <h2 style="color: #111827; margin-bottom: 8px;">Restablecer contraseña</h2>
                        <p style="color: #374151; margin-bottom: 4px;">
                            Hola, <strong>${rolTexto} ${usuario.Nombres} ${usuario.Apellidos}</strong>.
                        </p>
                        <p style="color: #6b7280; margin-bottom: 24px;">
                            Recibimos una solicitud para restablecer la contraseña de tu cuenta.
                            Este enlace expira en <strong>15 minutos</strong>.
                        </p>
                        <a href="${resetLink}"
                            style="display: inline-block; background: #4f8ef7; color: #fff;
                                   padding: 13px 28px; border-radius: 8px; text-decoration: none;
                                   font-weight: 600; font-size: 15px; margin-bottom: 24px;">
                            Restablecer contraseña
                        </a>
                        <p style="color: #9ca3af; font-size: 13px;">
                            Si no solicitaste esto, puedes ignorar este correo. Tu contraseña no cambiará.
                        </p>
                        <p style="color: #d1d5db; font-size: 12px; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
                            O copia este enlace en tu navegador:<br/>
                            <span style="color: #6b7280; word-break: break-all;">${resetLink}</span>
                        </p>
                    </div>
                `,
            };
            transporter.sendMail(mailOptions, (err) => {
                if (err) {
                    console.error("[forgot-password] Error enviando email:", err);
                    return res.status(500).json({ message: "No se pudo enviar el correo." });
                }
                res.status(200).json({ message: "Si el correo existe, recibirás un enlace." });
            });
        });
    });
};

exports.resetPassword = (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) {
        return res.status(400).json({ message: "Datos incompletos." });
    }
    if (password.length < 8) {
        return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres." });
    }
    Usuario.getByResetToken(token, (err, results) => {
        if (err) return res.status(500).json({ error: err });
        if (results.length === 0) {
            return res.status(400).json({ message: "El enlace no es válido o ya expiró. Solicita uno nuevo." });
        }
        const usuario = results[0];
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) return res.status(500).json({ error: err });
            Usuario.updatePassword(usuario.idUsuario, hash, (err) => {
                if (err) return res.status(500).json({ error: err });
                res.json({ message: "Contraseña actualizada correctamente." });
            });
        });
    });
};

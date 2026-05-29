process.env.JWT_SECRET = 'test-secret';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({ sendMail: jest.fn() }),
}));
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../../models/usuarios.model');

const usuariosController = require('../../controllers/usuarios.controller');
const Usuario = require('../../models/usuarios.model');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');

function mockRes() {
  const r = {};
  r.status = jest.fn().mockReturnValue(r);
  r.json   = jest.fn().mockReturnValue(r);
  return r;
}

beforeEach(() => jest.clearAllMocks());

// ── createUsuario ─────────────────────────────────────────────────────────────
describe('createUsuario', () => {
  it('returns 400 if Email is missing', () => {
    const res = mockRes();
    usuariosController.createUsuario(
      { body: { Nombres: 'Ana', Password_hash: 'secret123' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 if Nombres is missing', () => {
    const res = mockRes();
    usuariosController.createUsuario(
      { body: { Email: 'a@b.com', Password_hash: 'secret123' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 if Password_hash is missing', () => {
    const res = mockRes();
    usuariosController.createUsuario(
      { body: { Nombres: 'Ana', Email: 'a@b.com' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('creates user and returns id on success', () => {
    bcrypt.hash.mockImplementation((pw, rounds, cb) => cb(null, 'hashed'));
    Usuario.create.mockImplementation((data, cb) => cb(null, { insertId: 7 }));
    const res = mockRes();
    usuariosController.createUsuario(
      { body: { Nombres: 'Ana', Email: 'a@b.com', Password_hash: 'secret123' } }, res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Usuario creado', id: 7 });
  });

  it('returns 500 if bcrypt fails', () => {
    bcrypt.hash.mockImplementation((pw, rounds, cb) => cb(new Error('bcrypt'), null));
    const res = mockRes();
    usuariosController.createUsuario(
      { body: { Nombres: 'Ana', Email: 'a@b.com', Password_hash: 'secret123' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ── login ─────────────────────────────────────────────────────────────────────
describe('login', () => {
  it('returns 400 if Email is missing', () => {
    const res = mockRes();
    usuariosController.login({ body: { Password_hash: 'pw' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 if Password_hash is missing', () => {
    const res = mockRes();
    usuariosController.login({ body: { Email: 'a@b.com' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 401 if user not found', () => {
    Usuario.getByEmail.mockImplementation((email, cb) => cb(null, []));
    const res = mockRes();
    usuariosController.login({ body: { Email: 'a@b.com', Password_hash: 'pw' } }, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 if password does not match', () => {
    Usuario.getByEmail.mockImplementation((email, cb) =>
      cb(null, [{ idUsuario: 1, Nombres: 'Ana', idRol: 30001, Password_hash: 'hashed' }]));
    bcrypt.compare.mockImplementation((pw, hash, cb) => cb(null, false));
    const res = mockRes();
    usuariosController.login({ body: { Email: 'a@b.com', Password_hash: 'wrong' } }, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns token and user info on successful login', () => {
    Usuario.getByEmail.mockImplementation((email, cb) =>
      cb(null, [{ idUsuario: 1, Nombres: 'Ana', idRol: 30001, Password_hash: 'hashed' }]));
    bcrypt.compare.mockImplementation((pw, hash, cb) => cb(null, true));
    jwt.sign.mockReturnValue('mocked-token');
    const res = mockRes();
    usuariosController.login({ body: { Email: 'a@b.com', Password_hash: 'correct' } }, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: 'mocked-token' }));
  });

  it('returns 500 on DB error', () => {
    Usuario.getByEmail.mockImplementation((email, cb) => cb(new Error('DB'), null));
    const res = mockRes();
    usuariosController.login({ body: { Email: 'a@b.com', Password_hash: 'pw' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ── forgotPassword ────────────────────────────────────────────────────────────
describe('forgotPassword', () => {
  it('returns 400 if Email format is invalid', () => {
    const res = mockRes();
    usuariosController.forgotPassword({ body: { Email: 'not-an-email' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 if Email is missing', () => {
    const res = mockRes();
    usuariosController.forgotPassword({ body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 200 even when user is not found (security)', () => {
    Usuario.getByEmail.mockImplementation((email, cb) => cb(null, []));
    const res = mockRes();
    usuariosController.forgotPassword({ body: { Email: 'unknown@b.com' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

// ── resetPassword ─────────────────────────────────────────────────────────────
describe('resetPassword', () => {
  it('returns 400 if token is missing', () => {
    const res = mockRes();
    usuariosController.resetPassword({ body: { password: 'newpass123' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 if password is missing', () => {
    const res = mockRes();
    usuariosController.resetPassword({ body: { token: 'abc' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 if password is shorter than 8 characters', () => {
    const res = mockRes();
    usuariosController.resetPassword({ body: { token: 'abc', password: 'short' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 if token is invalid or expired', () => {
    Usuario.getByResetToken.mockImplementation((token, cb) => cb(null, []));
    const res = mockRes();
    usuariosController.resetPassword({ body: { token: 'bad-token', password: 'newpass123' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('updates password successfully with valid token', () => {
    Usuario.getByResetToken.mockImplementation((token, cb) =>
      cb(null, [{ idUsuario: 1 }]));
    bcrypt.hash.mockImplementation((pw, rounds, cb) => cb(null, 'hashed-new'));
    Usuario.updatePassword.mockImplementation((id, hash, cb) => cb(null));
    const res = mockRes();
    usuariosController.resetPassword({ body: { token: 'valid-token', password: 'newpass123' } }, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('actualizada') }));
  });
});

process.env.JWT_SECRET = 'test-secret';

const jwt  = require('jsonwebtoken');
const auth = require('../../middleware/auth');

function mockRes() {
  const r = {};
  r.status = jest.fn().mockReturnValue(r);
  r.json   = jest.fn().mockReturnValue(r);
  return r;
}

// ── authMiddleware ────────────────────────────────────────────────────────────
describe('authMiddleware', () => {
  it('returns 401 if no Authorization header', () => {
    const req  = { headers: {} };
    const res  = mockRes();
    const next = jest.fn();
    auth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 if Bearer token is empty string', () => {
    const req  = { headers: { authorization: 'Bearer ' } };
    const res  = mockRes();
    const next = jest.fn();
    auth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 if token is invalid', () => {
    const req  = { headers: { authorization: 'Bearer not.a.valid.token' } };
    const res  = mockRes();
    const next = jest.fn();
    auth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 if token is signed with wrong secret', () => {
    const badToken = jwt.sign({ id: 1, rol: 1 }, 'wrong-secret', { expiresIn: '1h' });
    const req  = { headers: { authorization: `Bearer ${badToken}` } };
    const res  = mockRes();
    const next = jest.fn();
    auth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() and sets req.user with a valid token', () => {
    const token = jwt.sign({ id: 5, rol: 30001 }, 'test-secret', { expiresIn: '1h' });
    const req   = { headers: { authorization: `Bearer ${token}` } };
    const res   = mockRes();
    const next  = jest.fn();
    auth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject({ id: 5, rol: 30001 });
  });
});

// ── verificarRol ──────────────────────────────────────────────────────────────
describe('verificarRol', () => {
  const { verificarRol } = require('../../middleware/auth');

  it('returns 403 if req.user is undefined', () => {
    const middleware = verificarRol([1]);
    const req  = {};
    const res  = mockRes();
    const next = jest.fn();
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 if user role is not in allowed list', () => {
    const middleware = verificarRol([1]);
    const req  = { user: { id: 5, rol: 30001 } };
    const res  = mockRes();
    const next = jest.fn();
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('calls next() if user role is allowed', () => {
    const middleware = verificarRol([1, 30001]);
    const req  = { user: { id: 5, rol: 30001 } };
    const res  = mockRes();
    const next = jest.fn();
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

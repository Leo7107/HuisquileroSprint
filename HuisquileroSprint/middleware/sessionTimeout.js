const jwt = require('jsonwebtoken');

const INACTIVIDAD_MS = 10 * 1000;

function sessionTimeoutMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();

  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.iat) {
      if (Date.now() - decoded.iat * 1000 > INACTIVIDAD_MS) {
        return res.status(401).json({ message: 'Sesión expirada por inactividad.' });
      }
    }
  } catch (_) {}
  next();
}

module.exports = sessionTimeoutMiddleware;
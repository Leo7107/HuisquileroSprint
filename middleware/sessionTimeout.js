function sessionTimeoutMiddleware(req, res, next) {
  next();
}

module.exports = sessionTimeoutMiddleware;

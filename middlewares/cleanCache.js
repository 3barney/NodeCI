const { clearHash } = require('../services/cache');

module.exports = async (req, res, next) => {
  await next(); // await ensure route handler goes first
  // We call route handler, ensure it does everything it has to do, 
  // After route handler is complete execution comes back to our middleware n we call clearHash

  clearHash(req.user.id)
}
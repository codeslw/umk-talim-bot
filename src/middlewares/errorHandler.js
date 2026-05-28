const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error(err);
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal server error'
  });
}

module.exports = { errorHandler };

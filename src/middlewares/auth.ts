const { adminApiKey, adminIds, adminUsernames } = require('../config/env');
const { normalizeUsername } = require('../utils/normalize');

function adminAuth(req, res, next) {
  const key = req.header('x-admin-key');
  if (key && key === adminApiKey) return next();

  const telegramId = String(req.header('x-telegram-id') || '');
  if (telegramId && adminIds.includes(telegramId)) return next();

  const telegramUsername = normalizeUsername(req.header('x-telegram-username'));
  if (telegramUsername && adminUsernames.some((entry) => normalizeUsername(entry) === telegramUsername)) {
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized' });
}

module.exports = { adminAuth };

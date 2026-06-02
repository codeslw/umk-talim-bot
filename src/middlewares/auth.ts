const { adminIds, adminUsernames } = require('../config/env');
const { legacyAdminKeyMatches, verifyRequestSession } = require('../services/adminAuth.service');
const { normalizeUsername } = require('../utils/normalize');

async function adminAuth(req, res, next) {
  try {
    const adminUser = await verifyRequestSession(req);
    if (adminUser) {
      req.adminUser = adminUser;
      return next();
    }

    if (legacyAdminKeyMatches(req)) return next();

    const telegramId = String(req.header('x-telegram-id') || '');
    if (telegramId && adminIds.includes(telegramId)) return next();

    const telegramUsername = normalizeUsername(req.header('x-telegram-username'));
    if (telegramUsername && adminUsernames.some((entry) => normalizeUsername(entry) === telegramUsername)) {
      return next();
    }

    return res.status(401).json({ error: 'Unauthorized' });
  } catch (error) {
    return next(error);
  }
}

module.exports = { adminAuth };

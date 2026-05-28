const bot = require('../utils/telegram');
const { adminIds } = require('../config/env');

async function notifyAdmins(text) {
  if (!bot || !adminIds.length) return;
  await Promise.all(adminIds.map((id) => bot.sendMessage(id, text)));
}

module.exports = { notifyAdmins };

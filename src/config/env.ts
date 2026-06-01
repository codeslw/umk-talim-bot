require('dotenv').config();

const required = ['DATABASE_URL', 'ADMIN_API_KEY'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

function normalizeTelegramChatId(value) {
  const text = String(value || '').trim();
  if (!text) return '';

  const fromUrl = text.replace(/^https?:\/\/t\.me\//i, '').replace(/^t\.me\//i, '');
  if (/^-100\d+$/.test(fromUrl)) return fromUrl;
  if (/^100\d+$/.test(fromUrl)) return `-${fromUrl}`;
  if (/^\d+$/.test(fromUrl)) return `-100${fromUrl}`;
  if (/^-\d+$/.test(fromUrl)) return fromUrl;
  if (fromUrl.startsWith('@')) return fromUrl;
  if (fromUrl.startsWith('+')) return fromUrl;

  return `@${fromUrl}`;
}

module.exports = {
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL,
  botToken: process.env.BOT_TOKEN || '',
  telegramPollingEnabled: process.env.TELEGRAM_POLLING_ENABLED !== 'false',
  telegramPollingInterval: Number(process.env.TELEGRAM_POLLING_INTERVAL || 1000),
  telegramPollingTimeout: Number(process.env.TELEGRAM_POLLING_TIMEOUT || 20),
  telegramRequestTimeout: Number(process.env.TELEGRAM_REQUEST_TIMEOUT || 20000),
  adminIds: (process.env.ADMIN_IDS || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean),
  adminUsernames: (process.env.ADMIN_USERNAMES || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean),
  adminApiKey: process.env.ADMIN_API_KEY,
  applicationsChannelId: normalizeTelegramChatId(process.env.APPLICATIONS_CHANNEL_ID),
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
  logLevel: process.env.LOG_LEVEL || 'info',
  cronTime: process.env.CRON_TIME || '0 9 * * *'
};

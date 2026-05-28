require('dotenv').config();

const required = ['DATABASE_URL', 'ADMIN_API_KEY'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

module.exports = {
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL,
  botToken: process.env.BOT_TOKEN || '',
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
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
  logLevel: process.env.LOG_LEVEL || 'info',
  cronTime: process.env.CRON_TIME || '0 9 * * *'
};

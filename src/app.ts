const { port } = require('./config/env');
const { createApp } = require('./http/createApp');
const logger = require('./utils/logger');
const prisma = require('./config/prisma');
const bot = require('./bot');

const app = createApp();
const server = app.listen(port, () => logger.info(`Server running on port ${port}`));

async function shutdown(signal: NodeJS.Signals) {
  logger.info(`${signal} received. Shutting down gracefully.`);

  try {
    if (bot?.stopGracefully) {
      await bot.stopGracefully(signal);
    }
  } catch (err) {
    logger.error({ err }, 'Failed to stop Telegram polling');
  }

  server.close(async () => {
    try {
      await prisma.$disconnect();
    } catch (err) {
      logger.error({ err }, 'Failed to disconnect Prisma');
    }
    process.exit(0);
  });
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

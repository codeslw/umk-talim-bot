const TelegramBot = require('node-telegram-bot-api');
const {
  botToken,
  telegramPollingInterval,
  telegramPollingTimeout,
  telegramRequestTimeout
} = require('../config/env');
const logger = require('./logger');

function createBot() {
  if (!botToken) {
    logger.warn('BOT_TOKEN is not set, Telegram polling is disabled.');
    return null;
  }

  try {
    const instance = new TelegramBot(botToken, {
      polling: {
        autoStart: true,
        interval: telegramPollingInterval,
        params: { timeout: telegramPollingTimeout }
      },
      request: {
        timeout: telegramRequestTimeout
      }
    });

    instance.on('polling_error', (err) => {
      logger.error(
        { err, telegramPollingInterval, telegramPollingTimeout, telegramRequestTimeout },
        'Telegram polling error'
      );
    });

    instance.on('webhook_error', (err) => {
      logger.error({ err }, 'Telegram webhook error');
    });

    return instance;
  } catch (err) {
    logger.error({ err }, 'Failed to initialize Telegram bot');
    return null;
  }
}

module.exports = createBot();

const TelegramBot = require('node-telegram-bot-api');
const {
  botToken,
  telegramPollingEnabled,
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
      polling: false,
      request: {
        timeout: telegramRequestTimeout
      }
    });

    instance.startConfiguredPolling = () => {
      if (!telegramPollingEnabled) return Promise.resolve(false);

      if (instance.isPolling()) {
        return Promise.resolve(true);
      }

      return instance.startPolling({
        interval: telegramPollingInterval,
        params: { timeout: telegramPollingTimeout }
      });
    };

    if (!telegramPollingEnabled) {
      logger.info('Telegram polling is disabled by TELEGRAM_POLLING_ENABLED=false.');
    }

    instance.on('polling_error', (err) => {
      if (err?.code === 'ETELEGRAM' && String(err.message || '').includes('409 Conflict')) {
        logger.error('Telegram polling conflict: another bot instance is already calling getUpdates. Stop the duplicate process or set TELEGRAM_POLLING_ENABLED=false on this one.', {
          err,
          telegramPollingInterval,
          telegramPollingTimeout,
          telegramRequestTimeout
        });
        instance.stopPolling().catch((stopErr) => {
          logger.error('Failed to stop Telegram polling after conflict', { err: stopErr });
        });
        return;
      }

      logger.error('Telegram polling error', {
        err,
        telegramPollingInterval,
        telegramPollingTimeout,
        telegramRequestTimeout
      });
    });

    instance.on('webhook_error', (err) => {
      logger.error('Telegram webhook error', { err });
    });

    return instance;
  } catch (err) {
    logger.error('Failed to initialize Telegram bot', { err });
    return null;
  }
}

module.exports = createBot();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { port } = require('./config/env');
const routes = require('./routes');
const docsRoutes = require('./routes/docs.routes');
const { errorHandler } = require('./middlewares/errorHandler');
const { notFound } = require('./middlewares/notFound');
const logger = require('./utils/logger');
const prisma = require('./config/prisma');
const bot = require('./bot');

const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 200 }));

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api', routes);
app.use('/docs', docsRoutes);
app.use(notFound);
app.use(errorHandler);

const server = app.listen(port, () => logger.info(`Server running on port ${port}`));

async function shutdown(signal) {
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

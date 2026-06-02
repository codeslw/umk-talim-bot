const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const routes = require('../routes');
const docsRoutes = require('../routes/docs.routes');
const { errorHandler } = require('../middlewares/errorHandler');
const { notFound } = require('../middlewares/notFound');

const adminAssetsPath = path.resolve(process.cwd(), 'admin/dist');
const uploadsPath = path.resolve(process.cwd(), 'uploads');

fs.mkdirSync(uploadsPath, { recursive: true });

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 200 }));

  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/uploads', express.static(uploadsPath));
  app.use('/admin', express.static(adminAssetsPath));
  app.get('/admin/*', (req, res, next) => {
    res.sendFile(path.join(adminAssetsPath, 'index.html'), (err) => {
      if (err) next();
    });
  });
  app.use('/api', routes);
  app.use('/docs', docsRoutes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };

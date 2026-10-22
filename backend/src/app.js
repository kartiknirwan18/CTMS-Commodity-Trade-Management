import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import env from './config/env.js';
import apiRoutes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { uploadRoot } from './middleware/upload.js';
import logger from './utils/logger.js';

export function createApp() {
  const app = express();

  // Behind a proxy (Render/Heroku/nginx) so rate limiting and req.ip work correctly.
  app.set('trust proxy', 1);

  app.use(
    helmet({
      // Uploaded images are served from this origin and embedded by the SPA.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  if (!env.isProduction) {
    app.use(morgan('dev'));
  }

  // Static hosting for uploaded store logos, banners, galleries and review photos.
  app.use(
    '/uploads',
    (_req, res, next) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      next();
    },
    express.static(uploadRoot, { index: false, dotfiles: 'deny' }),
  );

  app.get('/', (_req, res) => {
    res.json({ name: 'MultiStore API', version: '1.0.0', docs: '/api/health' });
  });

  app.use('/api', apiLimiter, apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export function logStartup() {
  logger.info(`MultiStore API starting (${env.nodeEnv})`);
  logger.info(`CORS origins: ${env.corsOrigins.join(', ')}`);
  logger.info(`Uploads directory: ${env.uploadDir}`);
}

export default createApp;

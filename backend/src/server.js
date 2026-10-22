import { createApp, logStartup } from './app.js';
import env from './config/env.js';
import prisma, { disconnectPrisma } from './lib/prisma.js';
import logger from './utils/logger.js';

async function bootstrap() {
  // Fail fast when the database is unreachable so misconfiguration is obvious.
  await prisma.$queryRaw`SELECT 1`;

  const app = createApp();
  const server = app.listen(env.port, () => {
    logStartup();
    logger.info(`API ready on http://localhost:${env.port}/api`);
  });

  const shutdown = async (signal) => {
    logger.info(`${signal} received, shutting down`);
    server.close(async () => {
      await disconnectPrisma();
      process.exit(0);
    });
    // Force exit if connections keep the process alive.
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
  logger.error('Unable to start the API', { message: error.message });
  process.exit(1);
});

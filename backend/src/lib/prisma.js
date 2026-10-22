import { PrismaClient } from '@prisma/client';
import env from '../config/env.js';

// A single PrismaClient instance is shared across the process.
// Query logging is noisy, so only log warnings/errors.
export const prisma = new PrismaClient({
  log: env.isProduction ? ['error'] : ['warn', 'error'],
});

export async function disconnectPrisma() {
  await prisma.$disconnect();
}

export default prisma;

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
export const backendRoot = path.resolve(currentDir, '..', '..');

dotenv.config({ path: path.join(backendRoot, '.env') });

function readString(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === '') {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readNumber(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) throw new Error(`Environment variable ${name} must be a number`);
  return parsed;
}

const nodeEnv = readString('NODE_ENV', 'development');

export const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: readNumber('PORT', 5000),
  // JWT_SECRET must always be provided through the environment
  jwtSecret: readString('JWT_SECRET'),
  jwtExpiresIn: readString('JWT_EXPIRES_IN', '7d'),
  jwtIssuer: readString('JWT_ISSUER', 'multistore'),
  corsOrigins: readString('CORS_ORIGIN', 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  uploadDir: path.resolve(backendRoot, readString('UPLOAD_DIR', 'uploads')),
  maxUploadBytes: readNumber('MAX_UPLOAD_MB', 5) * 1024 * 1024,
  databaseUrl: readString('DATABASE_URL', 'file:./dev.db'),
};

export default env;

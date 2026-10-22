import env from '../config/env.js';

/**
 * Minimal structured logger. Keeps secrets out of the output and stays readable
 * in development while remaining machine-parsable in production.
 */
function write(level, message, meta) {
  const entry = {
    level,
    time: new Date().toISOString(),
    message,
    ...(meta ? { meta } : {}),
  };

  const line = env.isProduction ? JSON.stringify(entry) : `[${level}] ${message}${meta ? ` ${JSON.stringify(meta)}` : ''}`;

  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
};

export default logger;

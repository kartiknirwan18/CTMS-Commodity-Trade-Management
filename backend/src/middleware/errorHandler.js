import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import { ApiError } from '../utils/http.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

/** 404 handler for unknown API routes. */
export function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} does not exist`));
}

/** Central error middleware - converts known errors to clean JSON responses. */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join('.') || '_',
      message: issue.message,
    }));
    return res.status(400).json({ message: 'Please check the highlighted fields', errors: details });
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? `Image is larger than ${Math.round(env.maxUploadBytes / (1024 * 1024))}MB`
        : 'Upload failed, please try again';
    return res.status(400).json({ message });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'value';
      return res.status(409).json({ message: `That ${target} is already in use` });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Record not found' });
    }
  }

  if (err instanceof ApiError || err.expected) {
    return res.status(err.statusCode || 400).json({
      message: err.message,
      ...(err.details ? { errors: err.details } : {}),
    });
  }

  logger.error('Unhandled error', {
    message: err.message,
    stack: env.isProduction ? undefined : err.stack,
    path: `${req.method} ${req.originalUrl}`,
  });

  return res.status(500).json({
    message: env.isProduction
      ? 'Something went wrong on our side. Please try again.'
      : err.message || 'Internal server error',
  });
}

export default errorHandler;

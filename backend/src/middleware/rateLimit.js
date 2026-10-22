import rateLimit from 'express-rate-limit';

const jsonHandler = (message) => (_req, res) => {
  res.status(429).json({ message });
};

/** Broad limiter applied to the whole API surface. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: jsonHandler('Too many requests. Please wait a moment and try again.'),
});

/** Credential endpoints: protects against brute force / credential stuffing. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: jsonHandler('Too many authentication attempts. Try again in a few minutes.'),
});

/** Account creation: slow down automated sign-ups. */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: jsonHandler('Too many accounts created from this network. Try again later.'),
});

/** Review spam prevention: keyed by user when authenticated, otherwise by IP. */
export const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 12,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? req.ip,
  handler: jsonHandler('You have submitted a lot of reviews recently. Please try again later.'),
});

/** Reporting/flagging endpoints. */
export const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? req.ip,
  handler: jsonHandler('Too many reports submitted. Please try again later.'),
});

/** Image uploads. */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? req.ip,
  handler: jsonHandler('Upload limit reached. Please try again later.'),
});

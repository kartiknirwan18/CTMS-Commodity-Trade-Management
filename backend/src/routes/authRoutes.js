import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter, registerLimiter } from '../middleware/rateLimit.js';
import {
  loginSchema,
  registerSchema,
  updateProfileSchema,
  changePasswordSchema,
} from '../validators/index.js';

const router = Router();

// POST /api/auth/register - customers and store owners (never super admins)
router.post('/register', registerLimiter, validate(registerSchema), authController.register);

// POST /api/auth/login
router.post('/login', authLimiter, validate(loginSchema), authController.login);

// GET /api/auth/me
router.get('/me', authenticate, authController.me);

// PATCH /api/auth/profile
router.patch('/profile', authenticate, validate(updateProfileSchema), authController.updateProfile);

// PATCH /api/auth/password
router.patch('/password', authenticate, validate(changePasswordSchema), authController.changePassword);

// GET /api/auth/capabilities - role metadata for the current session
router.get('/capabilities', optionalAuth, authController.sessionCapabilities);

export default router;

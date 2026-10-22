import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, validateParams, validateQuery } from '../middleware/validate.js';
import { ROLES } from '../utils/constants.js';
import {
  idParam,
  storeStatusSchema,
  storeFlagSchema,
  moderationSchema,
  reportUpdateSchema,
  userStatusSchema,
  userRoleSchema,
  userListQuerySchema,
  storeListQuerySchema,
  reviewListQuerySchema,
  categoryCreateSchema,
} from '../validators/index.js';
import { z } from 'zod';

const router = Router();

// Every route in this file requires a super admin session.
router.use(authenticate, authorize(ROLES.SUPER_ADMIN));

// GET /api/admin/stats
router.get('/stats', adminController.dashboardStats);

// ---------------------------------------------------------------------------
// Store approval
// ---------------------------------------------------------------------------

// GET /api/admin/stores
router.get('/stores', validateQuery(storeListQuerySchema), adminController.listStores);

// PATCH /api/admin/stores/:id/status
router.patch(
  '/stores/:id/status',
  validateParams(idParam),
  validate(storeStatusSchema),
  adminController.updateStoreStatus,
);

// PATCH /api/admin/stores/:id/feature
router.patch(
  '/stores/:id/feature',
  validateParams(idParam),
  validate(storeFlagSchema),
  adminController.updateStoreFeature,
);

// ---------------------------------------------------------------------------
// Review moderation
// ---------------------------------------------------------------------------

// GET /api/admin/reviews - moderation queue across every review status
router.get('/reviews', validateQuery(reviewListQuerySchema), async (req, res, next) => {
  const { listReviews } = await import('../controllers/reviewController.js');
  return listReviews(req, res, next);
});

// PATCH /api/admin/reviews/:id/status
router.patch(
  '/reviews/:id/status',
  validateParams(idParam),
  validate(moderationSchema),
  adminController.moderateReview,
);

// GET /api/admin/reports
router.get(
  '/reports',
  validateQuery(z.object({ page: z.coerce.number().optional(), pageSize: z.coerce.number().optional(), status: z.enum(['OPEN', 'RESOLVED', 'DISMISSED']).optional() })),
  adminController.listReports,
);

// PATCH /api/admin/reports/:id
router.patch('/reports/:id', validateParams(idParam), validate(reportUpdateSchema), adminController.updateReport);

// ---------------------------------------------------------------------------
// User management
// ---------------------------------------------------------------------------

// GET /api/admin/users
router.get('/users', validateQuery(userListQuerySchema), adminController.listUsers);

// PATCH /api/admin/users/:id/status
router.patch('/users/:id/status', validateParams(idParam), validate(userStatusSchema), adminController.updateUserStatus);

// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', validateParams(idParam), validate(userRoleSchema), adminController.updateUserRole);

// DELETE /api/admin/users/:id
router.delete('/users/:id', validateParams(idParam), adminController.deleteUser);

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

// POST /api/admin/categories
router.post('/categories', validate(categoryCreateSchema), adminController.createCategory);

// PATCH /api/admin/categories/:id
router.patch('/categories/:id', validateParams(idParam), validate(categoryCreateSchema.partial()), adminController.updateCategory);

// DELETE /api/admin/categories/:id
router.delete('/categories/:id', validateParams(idParam), adminController.deleteCategory);

export default router;

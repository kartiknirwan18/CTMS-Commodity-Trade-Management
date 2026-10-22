import { Router } from 'express';
import * as reviewController from '../controllers/reviewController.js';
import { authenticate, optionalAuth, requireStoreOwner } from '../middleware/auth.js';
import { validate, validateParams, validateQuery } from '../middleware/validate.js';
import { reviewLimiter, reportLimiter } from '../middleware/rateLimit.js';
import {
  idParam,
  reviewCreateSchema,
  reviewUpdateSchema,
  reviewReportSchema,
  reviewReplySchema,
  reviewListQuerySchema,
} from '../validators/index.js';

const router = Router();

// ---------------------------------------------------------------------------
// Central review dashboard
// ---------------------------------------------------------------------------

// GET /api/reviews - every published review of every approved store
router.get('/', optionalAuth, validateQuery(reviewListQuerySchema), reviewController.listReviews);

// GET /api/reviews/stats - platform aggregates + per-store summaries
router.get('/stats', reviewController.reviewStats);

// GET /api/reviews/facets - filter options
router.get('/facets', reviewController.reviewFacets);

// GET /api/reviews/mine - the signed-in customer's review history
router.get('/mine', authenticate, reviewController.listMyReviews);

// ---------------------------------------------------------------------------
// Replies (declared before /:id)
// ---------------------------------------------------------------------------

// PATCH /api/reviews/replies/:id
router.patch('/replies/:id', authenticate, validateParams(idParam), validate(reviewReplySchema), reviewController.updateReply);

// DELETE /api/reviews/replies/:id
router.delete('/replies/:id', authenticate, validateParams(idParam), reviewController.deleteReply);

// ---------------------------------------------------------------------------
// Review CRUD
// ---------------------------------------------------------------------------

// POST /api/reviews - authenticated customers only
router.post('/', authenticate, reviewLimiter, validate(reviewCreateSchema), reviewController.createReview);

// GET /api/reviews/:id
router.get('/:id', optionalAuth, validateParams(idParam), reviewController.getReview);

// PATCH /api/reviews/:id - author only
router.patch('/:id', authenticate, validateParams(idParam), validate(reviewUpdateSchema), reviewController.updateReview);

// DELETE /api/reviews/:id - author or super admin
router.delete('/:id', authenticate, validateParams(idParam), reviewController.deleteReview);

// POST /api/reviews/:id/helpful - one vote per account
router.post('/:id/helpful', authenticate, validateParams(idParam), reviewController.toggleHelpful);

// POST /api/reviews/:id/report
router.post(
  '/:id/report',
  authenticate,
  reportLimiter,
  validateParams(idParam),
  validate(reviewReportSchema),
  reviewController.reportReview,
);

// POST /api/reviews/:id/reply - store owner official reply
router.post(
  '/:id/reply',
  authenticate,
  requireStoreOwner,
  validateParams(idParam),
  validate(reviewReplySchema),
  reviewController.replyToReview,
);

export default router;

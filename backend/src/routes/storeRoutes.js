import { Router } from 'express';
import * as storeController from '../controllers/storeController.js';
import * as reviewController from '../controllers/reviewController.js';
import { authenticate, optionalAuth, requireStoreOwner } from '../middleware/auth.js';
import { validate, validateParams, validateQuery } from '../middleware/validate.js';
import {
  idParam,
  slugParam,
  storeCreateSchema,
  storeUpdateSchema,
  storeThemeSchema,
  storeVisibilitySchema,
  storeImageCreateSchema,
  storeListQuerySchema,
  reviewListQuerySchema,
} from '../validators/index.js';
import { uploadImage } from '../middleware/upload.js';

const router = Router();

// ---------------------------------------------------------------------------
// Public discovery
// ---------------------------------------------------------------------------

// GET /api/stores
router.get('/', optionalAuth, validateQuery(storeListQuerySchema), storeController.listStores);

// GET /api/stores/landing
router.get('/landing', storeController.storeLanding);

// GET /api/stores/facets
router.get('/facets', storeController.storeFacets);

// GET /api/stores/categories
router.get('/categories', storeController.listCategories);

// ---------------------------------------------------------------------------
// Store owner self-service (must be declared before /:slug)
// ---------------------------------------------------------------------------

// GET /api/stores/owner/overview
router.get('/owner/overview', authenticate, requireStoreOwner, storeController.storeOwnerOverview);

// GET /api/stores/owner/options
router.get('/owner/options', authenticate, requireStoreOwner, storeController.ownerStoreOptions);

// GET /api/stores/mine
router.get('/mine', authenticate, requireStoreOwner, storeController.listMyStores);

// GET /api/stores/mine/:id
router.get('/mine/:id', authenticate, requireStoreOwner, validateParams(idParam), storeController.getMyStore);

// POST /api/stores
router.post(
  '/',
  authenticate,
  requireStoreOwner,
  validate(storeCreateSchema),
  storeController.createStore,
);

// PATCH /api/stores/:id
router.patch(
  '/:id',
  authenticate,
  requireStoreOwner,
  validateParams(idParam),
  validate(storeUpdateSchema),
  storeController.updateStore,
);

// PUT /api/stores/:id/theme
router.put(
  '/:id/theme',
  authenticate,
  requireStoreOwner,
  validateParams(idParam),
  validate(storeThemeSchema),
  storeController.updateStoreTheme,
);

// PATCH /api/stores/:id/visibility
router.patch(
  '/:id/visibility',
  authenticate,
  requireStoreOwner,
  validateParams(idParam),
  validate(storeVisibilitySchema),
  storeController.setStoreVisibility,
);

// DELETE /api/stores/:id
router.delete('/:id', authenticate, requireStoreOwner, validateParams(idParam), storeController.deleteStore);

// POST /api/stores/:id/images
router.post(
  '/:id/images',
  authenticate,
  requireStoreOwner,
  validateParams(idParam),
  validate(storeImageCreateSchema),
  storeController.addStoreImage,
);

// DELETE /api/stores/:id/images/:imageId
router.delete(
  '/:id/images/:imageId',
  authenticate,
  requireStoreOwner,
  validateParams(idParam.extend({ imageId: idParam.shape.id })),
  storeController.deleteStoreImage,
);

// GET /api/stores/:id/analytics
router.get(
  '/:id/analytics',
  authenticate,
  requireStoreOwner,
  validateParams(idParam),
  storeController.storeAnalytics,
);

// GET /api/stores/:id/reviews - owner review inbox
router.get(
  '/:id/reviews',
  authenticate,
  requireStoreOwner,
  validateParams(idParam),
  validateQuery(reviewListQuerySchema),
  reviewController.listStoreReviews,
);

// POST /api/stores/:id/gallery-upload - multipart gallery upload for the store editor
router.post(
  '/:id/gallery-upload',
  authenticate,
  requireStoreOwner,
  validateParams(idParam),
  uploadImage.array('images', 6),
  storeController.uploadGalleryImages,
);

// ---------------------------------------------------------------------------
// Public store profile (keep last: /:slug is a catch-all)
// ---------------------------------------------------------------------------

// GET /api/stores/:slug
router.get(
  '/:slug',
  optionalAuth,
  validateParams(slugParam),
  storeController.getStoreBySlug,
);

export default router;

import { Router } from 'express';
import * as uploadController from '../controllers/uploadController.js';
import { authenticate } from '../middleware/auth.js';
import { uploadImage } from '../middleware/upload.js';
import { uploadLimiter } from '../middleware/rateLimit.js';

const router = Router();

// POST /api/uploads - single image (store logo, banner, review photo)
router.post('/', authenticate, uploadLimiter, uploadImage.single('file'), uploadController.uploadSingleImage);

// POST /api/uploads/multiple - up to 6 images
router.post(
  '/multiple',
  authenticate,
  uploadLimiter,
  uploadImage.array('files', 6),
  uploadController.uploadMultipleImages,
);

export default router;

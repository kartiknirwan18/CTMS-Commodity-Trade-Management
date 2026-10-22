import { asyncHandler, ApiError } from '../utils/http.js';
import { toPublicUrl } from '../middleware/upload.js';

/** POST /api/uploads - single image upload used by the store editor and reviews. */
export const uploadSingleImage = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Choose an image to upload');

  res.status(201).json({
    url: toPublicUrl(req.file.path),
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
});

/** POST /api/uploads/multiple - up to 6 images for storefront galleries. */
export const uploadMultipleImages = asyncHandler(async (req, res) => {
  if (!req.files?.length) throw ApiError.badRequest('Choose at least one image to upload');

  res.status(201).json({
    files: req.files.map((file) => ({ url: toPublicUrl(file.path), size: file.size, mimetype: file.mimetype })),
  });
});

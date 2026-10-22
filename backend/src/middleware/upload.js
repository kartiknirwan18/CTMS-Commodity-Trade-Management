import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import env from '../config/env.js';
import { ApiError } from '../utils/http.js';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);

// Uploads live outside of `src/` so they are never bundled or overwritten.
export const uploadRoot = env.uploadDir;

if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const now = new Date();
    const folder = path.join(
      uploadRoot,
      `${now.getFullYear()}`,
      `${String(now.getMonth() + 1).padStart(2, '0')}`,
    );
    fs.mkdir(folder, { recursive: true }, (error) => cb(error, folder));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '.jpg';
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${safeExt}`);
  },
});

function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(ApiError.badRequest('Only JPG, PNG, WEBP, GIF or AVIF images are allowed'));
  }
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
    return cb(ApiError.badRequest('Image file extension is not allowed'));
  }
  return cb(null, true);
}

export const uploadImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.maxUploadBytes, files: 6 },
});

/** Converts an absolute upload path to the public URL served by the API. */
export function toPublicUrl(filePath) {
  const relative = path.relative(uploadRoot, filePath).split(path.sep).join('/');
  return `/uploads/${relative}`;
}

export default uploadImage;

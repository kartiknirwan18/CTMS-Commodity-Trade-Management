import { z } from 'zod';
import {
  ROLE_VALUES,
  STORE_STATUS_VALUES,
  REVIEW_STATUS_VALUES,
  REPORT_STATUS_VALUES,
  USER_STATUS_VALUES,
  LAYOUT_VALUES,
  REVIEW_DISPLAY_VALUES,
  REPORT_REASONS,
  STORE_SORTS,
  REVIEW_SORTS,
  ROLES,
} from '../utils/constants.js';

// ---------------------------------------------------------------------------
// Reusable primitives
// ---------------------------------------------------------------------------

const trimmed = (max) => z.string().trim().max(max);

export const idParam = z.object({ id: z.string().trim().min(1, 'Identifier is required') });
export const slugParam = z.object({ slug: z.string().trim().min(1, 'Store slug is required') });

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password is too long')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address')
  .max(160);

const hexColor = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Use a valid hex colour like #0ea5e9');

const latitudeOptional = z
  .union([z.number(), z.string()])
  .optional()
  .transform((value) => (value === undefined || value === '' ? undefined : Number(value)));

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const registerSchema = z.object({
  name: trimmed(80).min(2, 'Name must be at least 2 characters'),
  email: emailSchema,
  password: passwordSchema,
  // Super admins can never self-register.
  role: z
    .enum([ROLES.CUSTOMER, ROLES.STORE_OWNER])
    .default(ROLES.CUSTOMER),
  city: trimmed(80).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(72),
});

export const updateProfileSchema = z.object({
  name: trimmed(80).min(2, 'Name must be at least 2 characters').optional(),
  city: trimmed(80).optional().or(z.literal('')),
  bio: trimmed(400).optional().or(z.literal('')),
  avatarUrl: trimmed(500).optional().or(z.literal('')),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

// ---------------------------------------------------------------------------
// Catalogue & pagination
// ---------------------------------------------------------------------------

export const paginationQuery = {
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(60).optional(),
};

export const storeListQuerySchema = z.object({
  ...paginationQuery,
  search: trimmed(120).optional(),
  category: trimmed(80).optional(),
  city: trimmed(80).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  sort: z.enum(STORE_SORTS).optional(),
  featured: z.enum(['true', 'false']).optional(),
  status: z.enum(STORE_STATUS_VALUES).optional(),
  mine: z.enum(['true', 'false']).optional(),
});

export const reviewListQuerySchema = z.object({
  ...paginationQuery,
  search: trimmed(160).optional(),
  storeId: trimmed(60).optional(),
  storeSlug: trimmed(80).optional(),
  category: trimmed(80).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
  sort: z.enum(REVIEW_SORTS).optional(),
  status: z.enum(REVIEW_STATUS_VALUES).optional(),
  withImages: z.enum(['true', 'false']).optional(),
});

export const userListQuerySchema = z.object({
  ...paginationQuery,
  search: trimmed(120).optional(),
  role: z.enum(ROLE_VALUES).optional(),
  status: z.enum(USER_STATUS_VALUES).optional(),
});

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const openingHourEntry = z.object({
  day: z.string().trim().min(3).max(12),
  open: z.string().trim().max(10).optional().default('09:00'),
  close: z.string().trim().max(10).optional().default('18:00'),
  closed: z.boolean().optional().default(false),
});

export const storeCreateSchema = z.object({
  name: trimmed(120).min(2, 'Store name is required'),
  tagline: trimmed(160).optional().or(z.literal('')),
  description: trimmed(4000).min(20, 'Tell customers a bit more (at least 20 characters)'),
  categoryId: trimmed(60).optional().or(z.literal('')),
  categoryName: trimmed(80).optional().or(z.literal('')),
  phone: trimmed(20).optional().or(z.literal('')),
  email: z.union([emailSchema, z.literal('')]).optional(),
  website: trimmed(200).optional().or(z.literal('')),
  addressLine: trimmed(200).min(4, 'Street address is required'),
  city: trimmed(80).min(2, 'City is required'),
  state: trimmed(80).optional().or(z.literal('')),
  country: trimmed(80).optional().or(z.literal('')),
  postalCode: trimmed(20).optional().or(z.literal('')),
  logoUrl: trimmed(500).optional().or(z.literal('')),
  bannerUrl: trimmed(500).optional().or(z.literal('')),
  openingHours: z.array(openingHourEntry).max(7).optional(),
  gallery: z.array(trimmed(500)).max(12).optional(),
});

export const storeUpdateSchema = storeCreateSchema.partial();

export const storeThemeSchema = z.object({
  primaryColor: hexColor.optional(),
  accentColor: hexColor.optional(),
  backgroundColor: hexColor.optional(),
  surfaceColor: hexColor.optional(),
  textColor: hexColor.optional(),
  fontFamily: trimmed(60).optional(),
  layout: z.enum(LAYOUT_VALUES).optional(),
  reviewDisplay: z.enum(REVIEW_DISPLAY_VALUES).optional(),
  roundedCorners: z.boolean().optional(),
  showBanner: z.boolean().optional(),
});

export const storeStatusSchema = z.object({
  status: z.enum(STORE_STATUS_VALUES),
  adminNote: trimmed(400).optional().or(z.literal('')),
});

export const storeVisibilitySchema = z.object({
  isPublished: z.boolean(),
});

export const storeFlagSchema = z.object({
  isFeatured: z.boolean(),
});

export const storeImageCreateSchema = z.object({
  url: trimmed(500),
  caption: trimmed(160).optional().or(z.literal('')),
});

// ---------------------------------------------------------------------------
// Review
// ---------------------------------------------------------------------------

export const reviewCreateSchema = z.object({
  storeId: trimmed(60).min(1, 'Store is required'),
  rating: z.coerce.number().int().min(1, 'Give a rating between 1 and 5').max(5, 'Rating cannot exceed 5'),
  title: trimmed(120).optional().or(z.literal('')),
  comment: trimmed(3000)
    .min(10, 'Please write at least 10 characters')
    .refine((value) => /[a-zA-Z0-9\u0900-\u0DFF]/.test(value), 'Review must contain readable text'),
  images: z.array(trimmed(500)).max(4).optional(),
});

export const reviewUpdateSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5).optional(),
  title: trimmed(120).optional().or(z.literal('')),
  comment: trimmed(3000).min(10, 'Please write at least 10 characters').optional(),
  images: z.array(trimmed(500)).max(4).optional(),
});

export const reviewReportSchema = z.object({
  reason: z.enum(REPORT_REASONS),
  details: trimmed(500).optional().or(z.literal('')),
});

export const reviewReplySchema = z.object({
  comment: trimmed(1200).min(2, 'Reply cannot be empty'),
});

export const moderationSchema = z.object({
  status: z.enum(REVIEW_STATUS_VALUES),
  moderationNote: trimmed(400).optional().or(z.literal('')),
});

export const reportUpdateSchema = z.object({
  status: z.enum([REPORT_STATUS_VALUES[1], REPORT_STATUS_VALUES[2]]),
});

export const userStatusSchema = z.object({ status: z.enum(USER_STATUS_VALUES) });
export const userRoleSchema = z.object({
  role: z.enum([ROLES.CUSTOMER, ROLES.STORE_OWNER, ROLES.SUPER_ADMIN]),
});

export const categoryCreateSchema = z.object({
  name: trimmed(60).min(2),
  description: trimmed(300).optional().or(z.literal('')),
  icon: trimmed(40).optional().or(z.literal('')),
});

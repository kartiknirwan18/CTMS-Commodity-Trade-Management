/**
 * Single source of truth for the string "enums" used by the database schema.
 * The SQLite connector cannot express Prisma enums, so values are validated here
 * and in the Zod validators instead.
 */

export const ROLES = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  STORE_OWNER: 'STORE_OWNER',
  CUSTOMER: 'CUSTOMER',
});

export const ROLE_VALUES = Object.freeze(Object.values(ROLES));

export const USER_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
});

export const USER_STATUS_VALUES = Object.freeze(Object.values(USER_STATUS));

export const STORE_STATUS = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SUSPENDED: 'SUSPENDED',
});

export const STORE_STATUS_VALUES = Object.freeze(Object.values(STORE_STATUS));

export const REVIEW_STATUS = Object.freeze({
  PUBLISHED: 'PUBLISHED',
  HIDDEN: 'HIDDEN',
  REMOVED: 'REMOVED',
});

export const REVIEW_STATUS_VALUES = Object.freeze(Object.values(REVIEW_STATUS));

export const REPORT_STATUS = Object.freeze({
  OPEN: 'OPEN',
  RESOLVED: 'RESOLVED',
  DISMISSED: 'DISMISSED',
});

export const REPORT_STATUS_VALUES = Object.freeze(Object.values(REPORT_STATUS));

export const LAYOUT_VALUES = Object.freeze(['GRID', 'LIST', 'MAGAZINE']);
export const REVIEW_DISPLAY_VALUES = Object.freeze(['CARDS', 'COMPACT']);

export const REPORT_REASONS = Object.freeze([
  'SPAM',
  'OFFENSIVE',
  'FAKE_REVIEW',
  'IRRELEVANT',
  'CONFLICT_OF_INTEREST',
  'OTHER',
]);

export const STORE_SORTS = Object.freeze(['newest', 'oldest', 'rating', 'reviews', 'name']);
export const REVIEW_SORTS = Object.freeze(['newest', 'oldest', 'highest', 'lowest', 'helpful']);

export const DAYS = Object.freeze([
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]);

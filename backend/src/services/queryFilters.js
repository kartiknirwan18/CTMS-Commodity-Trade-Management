import { STORE_STATUS, REVIEW_STATUS, USER_STATUS, ROLES } from '../utils/constants.js';

/**
 * Shared Prisma `where` fragments so that listings (directory, review
 * dashboard, owner dashboard) all use identical visibility rules.
 */

export const PUBLIC_STORE_WHERE = {
  status: STORE_STATUS.APPROVED,
  isPublished: true,
  owner: { status: USER_STATUS.ACTIVE },
};

export const PUBLIC_REVIEW_WHERE = {
  status: REVIEW_STATUS.PUBLISHED,
  store: PUBLIC_STORE_WHERE,
};

/** Relations needed to serialize a review consistently everywhere. */
export const REVIEW_INCLUDE = {
  user: { select: { id: true, name: true, avatarUrl: true } },
  store: {
    select: {
      id: true,
      slug: true,
      name: true,
      logoUrl: true,
      bannerUrl: true,
      city: true,
      avgRating: true,
      reviewCount: true,
      ownerId: true,
      // Needed for visibility checks in the review detail endpoint.
      status: true,
      isPublished: true,
      category: { select: { id: true, name: true, slug: true, icon: true } },
      theme: true,
    },
  },
  reply: { include: { owner: { select: { id: true, name: true } } } },
};

export const STORE_INCLUDE = {
  category: { select: { id: true, name: true, slug: true, icon: true, description: true } },
  theme: true,
};

export const STORE_DETAIL_INCLUDE = {
  ...STORE_INCLUDE,
  owner: { select: { id: true, name: true, avatarUrl: true } },
  images: { orderBy: { position: 'asc' } },
};

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.STORE_OWNER]: 'Store Owner',
  [ROLES.CUSTOMER]: 'Customer',
};

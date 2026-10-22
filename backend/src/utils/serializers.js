import { parseJsonArray } from './slug.js';
import { ROLES, REVIEW_STATUS } from './constants.js';

/**
 * Response serializers.
 *
 * Every API payload is shaped here so that the frontend never receives
 * password hashes, emails of other customers, or internal fields.
 */

export function toUserDto(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    avatarUrl: user.avatarUrl ?? null,
    bio: user.bio ?? null,
    city: user.city ?? null,
    lastLoginAt: user.lastLoginAt ?? null,
    createdAt: user.createdAt,
  };
}

/** Reviewer identity exposed publicly on reviews. */
export function toReviewerDto(user) {
  if (!user) return { id: null, name: 'Deleted user', avatarUrl: null };
  return { id: user.id, name: user.name, avatarUrl: user.avatarUrl ?? null };
}

export function toCategoryDto(category) {
  if (!category) return null;
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    icon: category.icon ?? 'store',
    description: category.description ?? null,
  };
}

export function toThemeDto(theme) {
  if (!theme) return null;
  return {
    id: theme.id,
    primaryColor: theme.primaryColor,
    accentColor: theme.accentColor,
    backgroundColor: theme.backgroundColor,
    surfaceColor: theme.surfaceColor,
    textColor: theme.textColor,
    fontFamily: theme.fontFamily,
    layout: theme.layout,
    reviewDisplay: theme.reviewDisplay,
    roundedCorners: theme.roundedCorners,
    showBanner: theme.showBanner,
  };
}

export function toStoreCard(store) {
  if (!store) return null;
  return {
    id: store.id,
    slug: store.slug,
    name: store.name,
    tagline: store.tagline ?? null,
    description: store.description ?? null,
    logoUrl: store.logoUrl ?? null,
    bannerUrl: store.bannerUrl ?? null,
    addressLine: store.addressLine,
    city: store.city,
    state: store.state ?? null,
    country: store.country,
    category: toCategoryDto(store.category),
    avgRating: Number(store.avgRating ?? 0),
    reviewCount: store.reviewCount ?? 0,
    status: store.status,
    isPublished: store.isPublished,
    isFeatured: store.isFeatured,
    theme: toThemeDto(store.theme),
    createdAt: store.createdAt,
    updatedAt: store.updatedAt,
  };
}

export function ratingBreakdown(store) {
  const counts = {
    1: store.rating1Count ?? 0,
    2: store.rating2Count ?? 0,
    3: store.rating3Count ?? 0,
    4: store.rating4Count ?? 0,
    5: store.rating5Count ?? 0,
  };
  const total = store.reviewCount ?? 0;
  return [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: counts[stars],
    percentage: total > 0 ? Math.round((counts[stars] / total) * 1000) / 10 : 0,
  }));
}

export function toStoreDetail(store, { viewer = null, viewerReview = null } = {}) {
  if (!store) return null;
  const base = toStoreCard(store);
  const isOwner = Boolean(viewer && viewer.id === store.ownerId);
  const isAdmin = Boolean(viewer && viewer.role === ROLES.SUPER_ADMIN);

  return {
    ...base,
    ownerId: store.ownerId,
    owner: store.owner
      ? { id: store.owner.id, name: store.owner.name, avatarUrl: store.owner.avatarUrl ?? null }
      : null,
    phone: store.phone ?? null,
    email: store.email ?? null,
    website: store.website ?? null,
    postalCode: store.postalCode ?? null,
    openingHours: parseJsonArray(store.openingHours),
    images: (store.images ?? []).map((image) => ({
      id: image.id,
      url: image.url,
      caption: image.caption ?? null,
      position: image.position,
    })),
    adminNote: isOwner || isAdmin ? store.adminNote ?? null : null,
    approvedAt: store.approvedAt ?? null,
    ratingBreakdown: ratingBreakdown(store),
    viewer: {
      canManage: isOwner || isAdmin,
      canReview:
        Boolean(viewer) &&
        viewer.role === ROLES.CUSTOMER &&
        !viewerReview &&
        store.status === 'APPROVED',
      hasReviewed: Boolean(viewerReview),
      viewerReviewId: viewerReview?.id ?? null,
    },
  };
}

export function toReviewDto(review, { viewer = null, helpfulByMe = false } = {}) {
  if (!review) return null;
  const isAuthor = Boolean(viewer && viewer.id === review.userId);
  const isAdmin = Boolean(viewer && viewer.role === ROLES.SUPER_ADMIN);
  const isStoreOwner = Boolean(viewer && review.store && viewer.id === review.store.ownerId);

  return {
    id: review.id,
    rating: review.rating,
    title: review.title ?? null,
    comment: review.comment,
    images: parseJsonArray(review.images),
    status: review.status,
    isVerifiedVisit: review.isVerifiedVisit,
    helpfulCount: review.helpfulCount ?? 0,
    moderationNote: isAuthor || isAdmin ? review.moderationNote ?? null : null,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    user: toReviewerDto(review.user),
    store: review.store
      ? {
          id: review.store.id,
          slug: review.store.slug,
          name: review.store.name,
          logoUrl: review.store.logoUrl ?? null,
          bannerUrl: review.store.bannerUrl ?? null,
          city: review.store.city ?? null,
          avgRating: Number(review.store.avgRating ?? 0),
          reviewCount: review.store.reviewCount ?? 0,
          category: toCategoryDto(review.store.category),
          theme: toThemeDto(review.store.theme),
        }
      : null,
    reply: review.reply
      ? {
          id: review.reply.id,
          comment: review.reply.comment,
          createdAt: review.reply.createdAt,
          updatedAt: review.reply.updatedAt,
          ownerId: review.reply.ownerId,
          ownerName: review.reply.owner?.name ?? null,
          canEdit: isStoreOwner,
        }
      : null,
    reportsCount: Array.isArray(review.reports) ? review.reports.length : 0,
    viewer: {
      isAuthor,
      canEdit: isAuthor && review.status !== REVIEW_STATUS.REMOVED,
      canDelete: isAuthor || isAdmin,
      canReply: isStoreOwner && !review.reply && review.status === REVIEW_STATUS.PUBLISHED,
      canReport: Boolean(viewer) && !isAuthor && review.status === REVIEW_STATUS.PUBLISHED,
      helpfulByMe,
    },
  };
}

export function toReportDto(report) {
  if (!report) return null;
  return {
    id: report.id,
    reason: report.reason,
    details: report.details ?? null,
    status: report.status,
    createdAt: report.createdAt,
    reporter: toReviewerDto(report.reporter),
    review: report.review
      ? {
          id: report.review.id,
          rating: report.review.rating,
          comment: report.review.comment,
          status: report.review.status,
          createdAt: report.review.createdAt,
          author: toReviewerDto(report.review.user),
          store: report.review.store
            ? { id: report.review.store.id, name: report.review.store.name, slug: report.review.store.slug }
            : null,
        }
      : null,
  };
}

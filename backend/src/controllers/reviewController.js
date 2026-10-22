import prisma from '../lib/prisma.js';
import { ApiError, asyncHandler, parsePagination, paginated } from '../utils/http.js';
import { toReviewDto } from '../utils/serializers.js';
import { PUBLIC_STORE_WHERE, REVIEW_INCLUDE } from '../services/queryFilters.js';

import { recalculateStoreRating } from '../services/storeRatingService.js';
import { ROLES, REVIEW_STATUS, STORE_STATUS } from '../utils/constants.js';

const LIST_INCLUDE = {
  ...REVIEW_INCLUDE,
  reports: { select: { id: true, status: true } },
};

/** Loads a review together with the relations needed by the serializers. */
async function loadReview(id) {
  const review = await prisma.review.findUnique({
    where: { id },
    include: {
      ...REVIEW_INCLUDE,
      reports: { select: { id: true, status: true } },
    },
  });
  if (!review) throw ApiError.notFound('Review not found');
  return review;
}

async function helpfulLookup(reviewIds, viewer) {
  if (!viewer || reviewIds.length === 0) return new Set();
  const votes = await prisma.reviewHelpfulVote.findMany({
    where: { userId: viewer.id, reviewId: { in: reviewIds } },
    select: { reviewId: true },
  });
  return new Set(votes.map((vote) => vote.reviewId));
}

function buildReviewWhere(query, viewer) {
  const { search, storeId, storeSlug, category, rating, dateFrom, dateTo, status, withImages } = query;
  const isAdmin = viewer?.role === ROLES.SUPER_ADMIN;

  // Admins may inspect any moderation status; everybody else only sees published
  // reviews that belong to a live, approved store.
  const where = isAdmin
    ? status
      ? { status }
      : {}
    : { status: REVIEW_STATUS.PUBLISHED, store: { ...PUBLIC_STORE_WHERE } };

  if (storeId) where.storeId = storeId;
  if (storeSlug) where.store = { ...(where.store ?? {}), slug: storeSlug };
  if (category) where.store = { ...(where.store ?? {}), category: { slug: category } };
  if (rating !== undefined) where.rating = rating;
  if (withImages === 'true') where.images = { not: null };

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(`${dateFrom}T00:00:00.000Z`);
    if (dateTo) where.createdAt.lte = new Date(`${dateTo}T23:59:59.999Z`);
  }

  if (search) {
    where.OR = [
      { comment: { contains: search } },
      { title: { contains: search } },
      { user: { name: { contains: search } } },
      { store: { name: { contains: search } } },
    ];
  }

  return where;
}

function reviewOrderBy(sort) {
  switch (sort) {
    case 'oldest':
      return [{ createdAt: 'asc' }];
    case 'highest':
      return [{ rating: 'desc' }, { createdAt: 'desc' }];
    case 'lowest':
      return [{ rating: 'asc' }, { createdAt: 'desc' }];
    case 'helpful':
      return [{ helpfulCount: 'desc' }, { createdAt: 'desc' }];
    default:
      return [{ createdAt: 'desc' }];
  }
}

// ---------------------------------------------------------------------------
// Central review dashboard
// ---------------------------------------------------------------------------

/** GET /api/reviews - the centralised review dashboard feed. */
export const listReviews = asyncHandler(async (req, res) => {
  const query = req.query;
  const { page, pageSize, skip, take } = parsePagination(query, { defaultPageSize: 10 });
  const where = buildReviewWhere(query, req.user);

  const [total, reviews] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      include: LIST_INCLUDE,
      orderBy: reviewOrderBy(query.sort),
      skip,
      take,
    }),
  ]);

  const helpful = await helpfulLookup(
    reviews.map((review) => review.id),
    req.user,
  );

  res.json(
    paginated(
      reviews.map((review) => toReviewDto(review, { viewer: req.user, helpfulByMe: helpful.has(review.id) })),
      total,
      page,
      pageSize,
    ),
  );
});

/** GET /api/reviews/stats - platform wide aggregates for the dashboard header. */
export const reviewStats = asyncHandler(async (_req, res) => {
  const where = { status: REVIEW_STATUS.PUBLISHED, store: PUBLIC_STORE_WHERE };

  const [total, aggregate, distribution, withReplies, storeSummaries] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.aggregate({ where, _avg: { rating: true } }),
    prisma.review.groupBy({ by: ['rating'], where, _count: { _all: true } }),
    prisma.review.count({ where: { ...where, reply: { isNot: null } } }),
    prisma.store.findMany({
      where: { ...PUBLIC_STORE_WHERE, reviewCount: { gt: 0 } },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        avgRating: true,
        reviewCount: true,
        rating1Count: true,
        rating2Count: true,
        rating3Count: true,
        rating4Count: true,
        rating5Count: true,
        city: true,
        category: { select: { id: true, name: true, slug: true } },
      },
      orderBy: [{ reviewCount: 'desc' }],
      take: 12,
    }),
  ]);

  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of distribution) counts[row.rating] = row._count._all;

  const last30Days = await prisma.review.count({
    where: { ...where, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
  });

  res.json({
    totalReviews: total,
    averageRating: Math.round((aggregate._avg.rating ?? 0) * 100) / 100,
    reviewsWithReplies: withReplies,
    replyRate: total > 0 ? Math.round((withReplies / total) * 1000) / 10 : 0,
    reviewsLast30Days: last30Days,
    distribution: [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: counts[stars],
      percentage: total > 0 ? Math.round((counts[stars] / total) * 1000) / 10 : 0,
    })),
    stores: storeSummaries.map((store) => ({
      id: store.id,
      name: store.name,
      slug: store.slug,
      logoUrl: store.logoUrl,
      city: store.city,
      category: store.category,
      avgRating: Number(store.avgRating),
      reviewCount: store.reviewCount,
      ratingBreakdown: [5, 4, 3, 2, 1].map((stars) => {
        const key = `rating${stars}Count`;
        const count = store[key] ?? 0;
        return {
          stars,
          count,
          percentage: store.reviewCount > 0 ? Math.round((count / store.reviewCount) * 1000) / 10 : 0,
        };
      }),
    })),
  });
});

/** GET /api/reviews/facets - filter options for the dashboard sidebar. */
export const reviewFacets = asyncHandler(async (_req, res) => {
  const [stores, categories, oldest] = await Promise.all([
    prisma.store.findMany({
      where: PUBLIC_STORE_WHERE,
      select: { id: true, name: true, slug: true, reviewCount: true, avgRating: true, logoUrl: true },
      orderBy: { name: 'asc' },
    }),
    prisma.storeCategory.findMany({
      where: { stores: { some: PUBLIC_STORE_WHERE } },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    }),
    prisma.review.findFirst({
      where: { status: REVIEW_STATUS.PUBLISHED, store: PUBLIC_STORE_WHERE },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    }),
  ]);

  res.json({
    stores,
    categories,
    earliestReviewDate: oldest?.createdAt ?? null,
  });
});

/** GET /api/reviews/mine - review history of the signed-in customer. */
export const listMyReviews = asyncHandler(async (req, res) => {
  const { page, pageSize, skip, take } = parsePagination(req.query, { defaultPageSize: 10 });

  const where = { userId: req.user.id };
  const [total, reviews] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({ where, include: LIST_INCLUDE, orderBy: { createdAt: 'desc' }, skip, take }),
  ]);

  const helpful = await helpfulLookup(
    reviews.map((review) => review.id),
    req.user,
  );

  res.json(
    paginated(
      reviews.map((review) => toReviewDto(review, { viewer: req.user, helpfulByMe: helpful.has(review.id) })),
      total,
      page,
      pageSize,
    ),
  );
});

/** GET /api/reviews/:id - single review detail page. */
export const getReview = asyncHandler(async (req, res) => {
  const review = await loadReview(req.params.id);
  const isAuthor = req.user?.id === review.userId;
  const isStoreOwner = req.user?.id === review.store.ownerId;
  const isAdmin = req.user?.role === ROLES.SUPER_ADMIN;

  if (review.status !== REVIEW_STATUS.PUBLISHED && !isAuthor && !isStoreOwner && !isAdmin) {
    throw ApiError.notFound('Review not found');
  }

  // Reviews of stores that are not publicly live are only visible to the
  // author, the store owner and platform admins.
  if (review.store.status !== STORE_STATUS.APPROVED && !isAdmin && !isStoreOwner && !isAuthor) {
    throw ApiError.notFound('Review not found');
  }

  const helpful = await helpfulLookup([review.id], req.user);

  res.json({ review: toReviewDto(review, { viewer: req.user, helpfulByMe: helpful.has(review.id) }) });
});

// ---------------------------------------------------------------------------
// Customer review CRUD
// ---------------------------------------------------------------------------

const SPAM_PATTERNS = [
  /(https?:\/\/|www\.)\S+/gi,
  /(.{1,3})\1{6,}/g,
];

function assertNotSpam({ comment, title }) {
  const haystack = `${title ?? ''} ${comment}`;
  const linkMatches = haystack.match(SPAM_PATTERNS[0]) ?? [];
  if (linkMatches.length > 2) {
    throw ApiError.badRequest('Reviews cannot contain more than two links');
  }
  if (SPAM_PATTERNS[1].test(haystack)) {
    throw ApiError.badRequest('Review looks like spam. Please write a real experience.');
  }
  const letters = haystack.replace(/[^a-zA-Z\u0900-\u0DFF]/g, '');
  if (letters.length > 25) {
    const upper = letters.replace(/[^A-Z\u0900-\u0DFF]/g, '').length;
    if (upper / letters.length > 0.7) {
      throw ApiError.badRequest('Please avoid writing reviews in all capital letters');
    }
  }
}

/** POST /api/reviews - authenticated customers only. */
export const createReview = asyncHandler(async (req, res) => {
  const { storeId, rating, title, comment, images } = req.body;

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { id: true, ownerId: true, status: true, name: true },
  });
  if (!store) throw ApiError.notFound('Store not found');
  if (store.status !== STORE_STATUS.APPROVED) {
    throw ApiError.badRequest('This store is not accepting reviews yet');
  }
  if (store.ownerId === req.user.id) {
    throw ApiError.badRequest('You cannot review your own store');
  }

  const existing = await prisma.review.findUnique({
    where: { storeId_userId: { storeId, userId: req.user.id } },
    select: { id: true },
  });
  if (existing) {
    throw ApiError.conflict('You have already reviewed this store. Edit your existing review instead.', [
      { field: 'reviewId', message: existing.id },
    ]);
  }

  assertNotSpam({ comment, title });

  const review = await prisma.review.create({
    data: {
      storeId,
      userId: req.user.id,
      rating,
      title: title || null,
      comment,
      images: images?.length ? JSON.stringify(images) : null,
      status: REVIEW_STATUS.PUBLISHED,
      // Verified badges require a real, verifiable purchase/visit signal.
      // This platform has no booking or POS integration, so the flag stays false
      // instead of being guessed. See README "Verified badges".
      isVerifiedVisit: false,
    },
    include: REVIEW_INCLUDE,
  });

  await recalculateStoreRating(storeId);

  res.status(201).json({
    review: toReviewDto(review, { viewer: req.user }),
    message: `Thanks! Your review for ${store.name} is live.`,
  });
});

/** PATCH /api/reviews/:id - only the author may edit. */
export const updateReview = asyncHandler(async (req, res) => {
  const review = await loadReview(req.params.id);

  if (review.userId !== req.user.id) {
    throw ApiError.forbidden('You can only edit your own review');
  }
  if (review.status === REVIEW_STATUS.REMOVED) {
    throw ApiError.badRequest('This review was removed by moderation and can no longer be edited');
  }

  const { rating, title, comment, images } = req.body;
  if (comment !== undefined) assertNotSpam({ comment, title: title ?? review.title });

  const updated = await prisma.review.update({
    where: { id: review.id },
    data: {
      ...(rating !== undefined ? { rating } : {}),
      ...(title !== undefined ? { title: title || null } : {}),
      ...(comment !== undefined ? { comment } : {}),
      ...(images !== undefined ? { images: images?.length ? JSON.stringify(images) : null } : {}),
    },
    include: REVIEW_INCLUDE,
  });

  await recalculateStoreRating(review.storeId);

  res.json({ review: toReviewDto(updated, { viewer: req.user }), message: 'Review updated' });
});

/** DELETE /api/reviews/:id - author or super admin. */
export const deleteReview = asyncHandler(async (req, res) => {
  const review = await prisma.review.findUnique({
    where: { id: req.params.id },
    select: { id: true, userId: true, storeId: true },
  });
  if (!review) throw ApiError.notFound('Review not found');

  const isAuthor = review.userId === req.user.id;
  const isAdmin = req.user.role === ROLES.SUPER_ADMIN;
  if (!isAuthor && !isAdmin) {
    throw ApiError.forbidden('You can only delete your own review');
  }

  await prisma.review.delete({ where: { id: review.id } });
  await recalculateStoreRating(review.storeId);

  res.json({ message: 'Review deleted' });
});

/** POST /api/reviews/:id/helpful - idempotent toggle, one vote per user. */
export const toggleHelpful = asyncHandler(async (req, res) => {
  const review = await prisma.review.findUnique({
    where: { id: req.params.id },
    select: { id: true, userId: true, status: true },
  });
  if (!review || review.status !== REVIEW_STATUS.PUBLISHED) throw ApiError.notFound('Review not found');
  if (review.userId === req.user.id) {
    throw ApiError.badRequest('You cannot mark your own review as helpful');
  }

  const existing = await prisma.reviewHelpfulVote.findUnique({
    where: { reviewId_userId: { reviewId: review.id, userId: req.user.id } },
  });

  const result = await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.reviewHelpfulVote.delete({ where: { id: existing.id } });
    } else {
      await tx.reviewHelpfulVote.create({ data: { reviewId: review.id, userId: req.user.id } });
    }
    const count = await tx.reviewHelpfulVote.count({ where: { reviewId: review.id } });
    const updated = await tx.review.update({
      where: { id: review.id },
      data: { helpfulCount: count },
      select: { helpfulCount: true },
    });
    return { helpfulCount: updated.helpfulCount, voted: !existing };
  });

  res.json(result);
});

/** POST /api/reviews/:id/report - flag a review for moderation. */
export const reportReview = asyncHandler(async (req, res) => {
  const { reason, details } = req.body;

  const review = await prisma.review.findUnique({
    where: { id: req.params.id },
    select: { id: true, userId: true, status: true },
  });
  if (!review || review.status !== REVIEW_STATUS.PUBLISHED) throw ApiError.notFound('Review not found');
  if (review.userId === req.user.id) throw ApiError.badRequest('You cannot report your own review');

  const existing = await prisma.reviewReport.findUnique({
    where: { reviewId_reporterId: { reviewId: review.id, reporterId: req.user.id } },
  });
  if (existing) throw ApiError.conflict('You have already reported this review');

  const report = await prisma.reviewReport.create({
    data: { reviewId: review.id, reporterId: req.user.id, reason, details: details || null },
  });

  res.status(201).json({ report: { id: report.id, status: report.status }, message: 'Report submitted for review' });
});

// ---------------------------------------------------------------------------
// Store owner review management
// ---------------------------------------------------------------------------

async function loadOwnedStore(storeId, user) {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw ApiError.notFound('Store not found');
  if (store.ownerId !== user.id && user.role !== ROLES.SUPER_ADMIN) {
    throw ApiError.forbidden('You can only manage reviews for your own store');
  }
  return store;
}

/** GET /api/stores/:id/reviews - the owner's review inbox. */
export const listStoreReviews = asyncHandler(async (req, res) => {
  const store = await loadOwnedStore(req.params.id, req.user);
  const query = req.query;
  const { page, pageSize, skip, take } = parsePagination(query, { defaultPageSize: 10 });

  const where = { storeId: store.id };
  if (query.status) where.status = query.status;
  if (query.rating !== undefined) where.rating = query.rating;
  if (query.replied === 'true') where.reply = { isNot: null };
  if (query.replied === 'false') where.reply = { is: null };
  if (query.search) {
    where.OR = [{ comment: { contains: query.search } }, { user: { name: { contains: query.search } } }];
  }

  const orderBy =
    query.sort === 'oldest'
      ? [{ createdAt: 'asc' }]
      : query.sort === 'highest'
        ? [{ rating: 'desc' }, { createdAt: 'desc' }]
        : query.sort === 'lowest'
          ? [{ rating: 'asc' }, { createdAt: 'desc' }]
          : [{ createdAt: 'desc' }];

  const [total, reviews, summary] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({ where, include: LIST_INCLUDE, orderBy, skip, take }),
    prisma.review.aggregate({
      where: { storeId: store.id, status: REVIEW_STATUS.PUBLISHED },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  const helpful = await helpfulLookup(
    reviews.map((review) => review.id),
    req.user,
  );

  res.json({
    ...paginated(
      reviews.map((review) => toReviewDto(review, { viewer: req.user, helpfulByMe: helpful.has(review.id) })),
      total,
      page,
      pageSize,
    ),
    summary: {
      total: summary._count._all,
      average: Math.round((summary._avg.rating ?? 0) * 100) / 100,
    },
  });
});

/** POST /api/reviews/:id/reply - store owner official response. */
export const replyToReview = asyncHandler(async (req, res) => {
  const review = await prisma.review.findUnique({
    where: { id: req.params.id },
    select: { id: true, storeId: true, status: true, store: { select: { ownerId: true, name: true } } },
  });
  if (!review) throw ApiError.notFound('Review not found');

  if (review.store.ownerId !== req.user.id) {
    throw ApiError.forbidden('Only the store owner can reply to this review');
  }

  const existing = await prisma.reviewReply.findUnique({ where: { reviewId: review.id } });
  if (existing) throw ApiError.conflict('You have already replied to this review');

  const reply = await prisma.reviewReply.create({
    data: { reviewId: review.id, ownerId: req.user.id, comment: req.body.comment },
  });

  res.status(201).json({ reply, message: 'Reply published' });
});

/** PATCH /api/reviews/replies/:id */
export const updateReply = asyncHandler(async (req, res) => {
  const reply = await prisma.reviewReply.findUnique({ where: { id: req.params.id } });
  if (!reply) throw ApiError.notFound('Reply not found');
  if (reply.ownerId !== req.user.id && req.user.role !== ROLES.SUPER_ADMIN) {
    throw ApiError.forbidden('You can only edit your own reply');
  }

  const updated = await prisma.reviewReply.update({
    where: { id: reply.id },
    data: { comment: req.body.comment },
  });

  res.json({ reply: updated, message: 'Reply updated' });
});

/** DELETE /api/reviews/replies/:id */
export const deleteReply = asyncHandler(async (req, res) => {
  const reply = await prisma.reviewReply.findUnique({ where: { id: req.params.id } });
  if (!reply) throw ApiError.notFound('Reply not found');
  if (reply.ownerId !== req.user.id && req.user.role !== ROLES.SUPER_ADMIN) {
    throw ApiError.forbidden('You can only delete your own reply');
  }

  await prisma.reviewReply.delete({ where: { id: reply.id } });
  res.json({ message: 'Reply deleted' });
});

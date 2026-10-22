import prisma from '../lib/prisma.js';
import { ApiError, asyncHandler, parsePagination, paginated } from '../utils/http.js';
import { slugify, uniqueSlug } from '../utils/slug.js';
import {
  toCategoryDto,
  toReportDto,
  toReviewDto,
  toStoreCard,
  toUserDto,
} from '../utils/serializers.js';
import { recalculateStoreRating } from '../services/storeRatingService.js';
import { REVIEW_INCLUDE, STORE_INCLUDE } from '../services/queryFilters.js';
import { ROLES, REVIEW_STATUS, STORE_STATUS, USER_STATUS, REPORT_STATUS } from '../utils/constants.js';

// ---------------------------------------------------------------------------
// Platform overview
// ---------------------------------------------------------------------------

/** GET /api/admin/stats - platform statistics and reports. */
export const dashboardStats = asyncHandler(async (_req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    customers,
    owners,
    suspendedUsers,
    storesByStatus,
    totalReviews,
    reviewAggregate,
    ratingDistribution,
    openReports,
    newReviews30d,
    newStores30d,
    topStores,
    latestStores,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: ROLES.CUSTOMER } }),
    prisma.user.count({ where: { role: ROLES.STORE_OWNER } }),
    prisma.user.count({ where: { status: USER_STATUS.SUSPENDED } }),
    prisma.store.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.review.count(),
    prisma.review.aggregate({ where: { status: REVIEW_STATUS.PUBLISHED }, _avg: { rating: true } }),
    prisma.review.groupBy({ by: ['rating'], where: { status: REVIEW_STATUS.PUBLISHED }, _count: { _all: true } }),
    prisma.reviewReport.count({ where: { status: REPORT_STATUS.OPEN } }),
    prisma.review.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.store.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.store.findMany({
      where: { status: STORE_STATUS.APPROVED },
      include: STORE_INCLUDE,
      orderBy: [{ avgRating: 'desc' }, { reviewCount: 'desc' }],
      take: 5,
    }),
    prisma.store.findMany({
      include: { ...STORE_INCLUDE, owner: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
  ]);

  const statusCounts = { PENDING: 0, APPROVED: 0, REJECTED: 0, SUSPENDED: 0 };
  for (const row of storesByStatus) statusCounts[row.status] = row._count._all;

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of ratingDistribution) distribution[row.rating] = row._count._all;

  const publishedReviews = ratingDistribution.reduce((acc, row) => acc + row._count._all, 0);

  res.json({
    users: { total: totalUsers, customers, owners, suspended: suspendedUsers },
    stores: { ...statusCounts, total: Object.values(statusCounts).reduce((a, b) => a + b, 0) },
    reviews: {
      total: totalReviews,
      published: publishedReviews,
      averageRating: Math.round((reviewAggregate._avg.rating ?? 0) * 100) / 100,
      last30Days: newReviews30d,
      openReports,
    },
    newStores30d,
    distribution: [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: distribution[stars],
      percentage: publishedReviews > 0 ? Math.round((distribution[stars] / publishedReviews) * 1000) / 10 : 0,
    })),
    topStores: topStores.map(toStoreCard),
    latestStores: latestStores.map((store) => ({
      ...toStoreCard(store),
      owner: { id: store.owner.id, name: store.owner.name, email: store.owner.email },
    })),
  });
});

// ---------------------------------------------------------------------------
// Store approval
// ---------------------------------------------------------------------------

/** GET /api/admin/stores - approval queue with every status. */
export const listStores = asyncHandler(async (req, res) => {
  const query = req.query;
  const { page, pageSize, skip, take } = parsePagination(query, { defaultPageSize: 12 });

  const where = {};
  if (query.status) where.status = query.status;
  if (query.search) {
    where.OR = [
      { name: { contains: query.search } },
      { city: { contains: query.search } },
      { owner: { name: { contains: query.search } } },
      { owner: { email: { contains: query.search } } },
    ];
  }

  const [total, stores] = await Promise.all([
    prisma.store.count({ where }),
    prisma.store.findMany({
      where,
      include: { ...STORE_INCLUDE, owner: { select: { id: true, name: true, email: true, status: true } } },
      orderBy: [{ createdAt: 'desc' }],
      skip,
      take,
    }),
  ]);

  res.json(
    paginated(
      stores.map((store) => ({
        ...toStoreCard(store),
        owner: { id: store.owner.id, name: store.owner.name, email: store.owner.email, status: store.owner.status },
        adminNote: store.adminNote ?? null,
        approvedAt: store.approvedAt ?? null,
      })),
      total,
      page,
      pageSize,
    ),
  );
});

/** PATCH /api/admin/stores/:id/status - approve / reject / suspend / reactivate. */
export const updateStoreStatus = asyncHandler(async (req, res) => {
  const { status, adminNote } = req.body;

  const store = await prisma.store.findUnique({ where: { id: req.params.id } });
  if (!store) throw ApiError.notFound('Store not found');

  const updated = await prisma.store.update({
    where: { id: store.id },
    data: {
      status,
      adminNote: adminNote || null,
      approvedAt: status === STORE_STATUS.APPROVED ? new Date() : store.approvedAt,
      // A suspended, rejected or pending store must never stay featured.
      ...(status === STORE_STATUS.APPROVED ? {} : { isFeatured: false }),
    },
    include: { ...STORE_INCLUDE, owner: { select: { id: true, name: true, email: true } } },
  });

  res.json({
    store: toStoreCard(updated),
    message: `Store ${status.toLowerCase()}`,
  });
});

/** PATCH /api/admin/stores/:id/feature */
export const updateStoreFeature = asyncHandler(async (req, res) => {
  const store = await prisma.store.findUnique({ where: { id: req.params.id } });
  if (!store) throw ApiError.notFound('Store not found');
  if (store.status !== STORE_STATUS.APPROVED) {
    throw ApiError.badRequest('Only approved stores can be featured');
  }

  const updated = await prisma.store.update({
    where: { id: store.id },
    data: { isFeatured: req.body.isFeatured },
    include: STORE_INCLUDE,
  });

  res.json({ store: toStoreCard(updated), message: req.body.isFeatured ? 'Store featured' : 'Store unfeatured' });
});

// ---------------------------------------------------------------------------
// Review moderation
// ---------------------------------------------------------------------------

/** PATCH /api/admin/reviews/:id/status - publish / hide / remove a review. */
export const moderateReview = asyncHandler(async (req, res) => {
  const { status, moderationNote } = req.body;

  const review = await prisma.review.findUnique({ where: { id: req.params.id } });
  if (!review) throw ApiError.notFound('Review not found');

  const updated = await prisma.review.update({
    where: { id: review.id },
    data: { status, moderationNote: moderationNote || null },
    include: REVIEW_INCLUDE,
  });

  if (status === REVIEW_STATUS.REMOVED || status === REVIEW_STATUS.HIDDEN) {
    await prisma.reviewReport.updateMany({
      where: { reviewId: review.id, status: REPORT_STATUS.OPEN },
      data: { status: status === REVIEW_STATUS.REMOVED ? REPORT_STATUS.RESOLVED : REPORT_STATUS.DISMISSED },
    });
  }

  await recalculateStoreRating(review.storeId);

  res.json({ review: toReviewDto(updated), message: `Review marked as ${status.toLowerCase()}` });
});

/** GET /api/admin/reports - user submitted review reports. */
export const listReports = asyncHandler(async (req, res) => {
  const { page, pageSize, skip, take } = parsePagination(req.query, { defaultPageSize: 12 });

  const where = {};
  if (req.query.status) where.status = req.query.status;

  const [total, reports] = await Promise.all([
    prisma.reviewReport.count({ where }),
    prisma.reviewReport.findMany({
      where,
      include: {
        reporter: { select: { id: true, name: true, avatarUrl: true } },
        review: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
            store: { select: { id: true, name: true, slug: true } },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      skip,
      take,
    }),
  ]);

  res.json(paginated(reports.map(toReportDto), total, page, pageSize));
});

/** PATCH /api/admin/reports/:id - resolve or dismiss a report. */
export const updateReport = asyncHandler(async (req, res) => {
  const report = await prisma.reviewReport.findUnique({ where: { id: req.params.id } });
  if (!report) throw ApiError.notFound('Report not found');

  const updated = await prisma.reviewReport.update({
    where: { id: report.id },
    data: { status: req.body.status },
    include: {
      reporter: { select: { id: true, name: true, avatarUrl: true } },
      review: {
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
          store: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });

  res.json({ report: toReportDto(updated), message: `Report ${req.body.status.toLowerCase()}` });
});

// ---------------------------------------------------------------------------
// User management
// ---------------------------------------------------------------------------

/** GET /api/admin/users */
export const listUsers = asyncHandler(async (req, res) => {
  const query = req.query;
  const { page, pageSize, skip, take } = parsePagination(query, { defaultPageSize: 12 });

  const where = {};
  if (query.role) where.role = query.role;
  if (query.status) where.status = query.status;
  if (query.search) {
    where.OR = [{ name: { contains: query.search } }, { email: { contains: query.search } }];
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatarUrl: true,
        city: true,
        createdAt: true,
        lastLoginAt: true,
        _count: { select: { reviews: true, stores: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
  ]);

  res.json(
    paginated(
      users.map((user) => ({
        ...toUserDto(user),
        counts: { reviews: user._count.reviews, stores: user._count.stores },
      })),
      total,
      page,
      pageSize,
    ),
  );
});

/** PATCH /api/admin/users/:id/status - suspend or reactivate an account. */
export const updateUserStatus = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) {
    throw ApiError.badRequest('You cannot change the status of your own account');
  }

  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) throw ApiError.notFound('User not found');

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: { status: req.body.status },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
  });

  res.json({ user: toUserDto(updated), message: `Account ${req.body.status.toLowerCase()}` });
});

/** PATCH /api/admin/users/:id/role */
export const updateUserRole = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) {
    throw ApiError.badRequest('You cannot change your own role');
  }

  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) throw ApiError.notFound('User not found');

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: { role: req.body.role },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
  });

  res.json({ user: toUserDto(updated), message: `Role updated to ${req.body.role}` });
});

/** DELETE /api/admin/users/:id - cascades to the user's stores and reviews. */
export const deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) {
    throw ApiError.badRequest('You cannot delete your own account from here');
  }

  const target = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, stores: { select: { id: true } } },
  });
  if (!target) throw ApiError.notFound('User not found');

  await prisma.user.delete({ where: { id: target.id } });

  // Ratings of deleted stores are gone with them; nothing else to recalculate.
  res.json({ message: 'User and related data deleted' });
});

// ---------------------------------------------------------------------------
// Category management
// ---------------------------------------------------------------------------

export const createCategory = asyncHandler(async (req, res) => {
  const { name, description, icon } = req.body;

  const duplicate = await prisma.storeCategory.findFirst({ where: { name } });
  if (duplicate) throw ApiError.conflict('A category with this name already exists');

  const category = await prisma.storeCategory.create({
    data: {
      name,
      slug: await uniqueSlug(prisma.storeCategory, name),
      description: description || null,
      icon: icon || 'store',
    },
  });

  res.status(201).json({ category: toCategoryDto(category) });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await prisma.storeCategory.findUnique({ where: { id: req.params.id } });
  if (!category) throw ApiError.notFound('Category not found');

  const updated = await prisma.storeCategory.update({
    where: { id: category.id },
    data: {
      ...(req.body.name ? { name: req.body.name, slug: slugify(req.body.name) } : {}),
      ...(req.body.description !== undefined ? { description: req.body.description || null } : {}),
      ...(req.body.icon !== undefined ? { icon: req.body.icon || 'store' } : {}),
    },
  });

  res.json({ category: toCategoryDto(updated) });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await prisma.storeCategory.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { stores: true } } },
  });
  if (!category) throw ApiError.notFound('Category not found');
  if (category._count.stores > 0) {
    throw ApiError.badRequest('Move the stores in this category before deleting it');
  }

  await prisma.storeCategory.delete({ where: { id: category.id } });
  res.json({ message: 'Category deleted' });
});

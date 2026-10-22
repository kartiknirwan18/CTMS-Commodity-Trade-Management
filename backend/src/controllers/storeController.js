import prisma from '../lib/prisma.js';
import path from 'node:path';
import { ApiError, asyncHandler, parsePagination, paginated } from '../utils/http.js';
import { uniqueSlug, slugify } from '../utils/slug.js';
import { toStoreCard, toStoreDetail } from '../utils/serializers.js';
import { PUBLIC_STORE_WHERE, STORE_INCLUDE, STORE_DETAIL_INCLUDE } from '../services/queryFilters.js';
import { ROLES, STORE_STATUS, USER_STATUS, DAYS, REVIEW_STATUS } from '../utils/constants.js';
import { uploadRoot } from '../middleware/upload.js';

const DEFAULT_OPENING_HOURS = DAYS.map((day) => ({
  day,
  open: '09:00',
  close: '18:00',
  closed: day === 'Sunday',
}));

/** Tenant guard: only the owning store owner (or a super admin) may manage a store. */
async function loadStoreForManagement(storeId, user) {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw ApiError.notFound('Store not found');
  const isOwner = store.ownerId === user.id;
  const isAdmin = user.role === ROLES.SUPER_ADMIN;
  if (!isOwner && !isAdmin) {
    throw ApiError.forbidden('You can only manage your own stores');
  }
  return store;
}

function buildStoreWhere(query, viewer) {
  const { search, category, city, minRating, status, featured } = query;
  const isAdmin = viewer?.role === ROLES.SUPER_ADMIN;

  const where = isAdmin && status ? { status } : { ...PUBLIC_STORE_WHERE };

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { tagline: { contains: search } },
      { description: { contains: search } },
      { city: { contains: search } },
      { addressLine: { contains: search } },
      { category: { name: { contains: search } } },
    ];
  }

  if (category) {
    where.category = { OR: [{ slug: category }, { id: category }] };
  }

  if (city) where.city = { contains: city };
  if (minRating !== undefined) where.avgRating = { gte: minRating };
  if (featured === 'true') where.isFeatured = true;

  return where;
}

function storeOrderBy(sort) {
  switch (sort) {
    case 'oldest':
      return [{ createdAt: 'asc' }];
    case 'rating':
      return [{ avgRating: 'desc' }, { reviewCount: 'desc' }];
    case 'reviews':
      return [{ reviewCount: 'desc' }, { avgRating: 'desc' }];
    case 'name':
      return [{ name: 'asc' }];
    default:
      return [{ createdAt: 'desc' }];
  }
}

// ---------------------------------------------------------------------------
// Public endpoints
// ---------------------------------------------------------------------------

/** GET /api/stores - paginated public store directory with filters. */
export const listStores = asyncHandler(async (req, res) => {
  const query = req.query;
  const { page, pageSize, skip, take } = parsePagination(query, { defaultPageSize: 12 });
  const where = buildStoreWhere(query, req.user);

  const [total, stores] = await Promise.all([
    prisma.store.count({ where }),
    prisma.store.findMany({
      where,
      include: STORE_INCLUDE,
      orderBy: storeOrderBy(query.sort),
      skip,
      take,
    }),
  ]);

  res.json(paginated(stores.map((store) => toStoreCard(store)), total, page, pageSize));
});

/** GET /api/stores/facets - filters, cities and categories for the directory UI. */
export const storeFacets = asyncHandler(async (_req, res) => {
  const [cities, categories] = await Promise.all([
    prisma.store.findMany({
      where: PUBLIC_STORE_WHERE,
      select: { city: true },
      distinct: ['city'],
      orderBy: { city: 'asc' },
    }),
    prisma.storeCategory.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        description: true,
        _count: { select: { stores: { where: PUBLIC_STORE_WHERE } } },
      },
    }),
  ]);

  res.json({
    cities: cities.map((entry) => entry.city).filter(Boolean),
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      icon: category.icon,
      description: category.description,
      storeCount: category._count.stores,
    })),
  });
});

/** GET /api/stores/landing - home page payload (featured, top rated, latest, stats). */
export const storeLanding = asyncHandler(async (_req, res) => {
  const [topRated, featured, newest, mostReviewed, totalStores, totalReviews, ratingAggregate] =
    await Promise.all([
      prisma.store.findMany({
        where: { ...PUBLIC_STORE_WHERE, reviewCount: { gt: 0 } },
        include: STORE_INCLUDE,
        orderBy: [{ avgRating: 'desc' }, { reviewCount: 'desc' }],
        take: 6,
      }),
      prisma.store.findMany({
        where: PUBLIC_STORE_WHERE,
        include: STORE_INCLUDE,
        orderBy: [{ isFeatured: 'desc' }, { avgRating: 'desc' }],
        take: 3,
      }),
      prisma.store.findMany({
        where: PUBLIC_STORE_WHERE,
        include: STORE_INCLUDE,
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      prisma.store.findMany({
        where: { ...PUBLIC_STORE_WHERE, reviewCount: { gt: 0 } },
        include: STORE_INCLUDE,
        orderBy: { reviewCount: 'desc' },
        take: 6,
      }),
      prisma.store.count({ where: PUBLIC_STORE_WHERE }),
      prisma.review.count({ where: { status: REVIEW_STATUS.PUBLISHED, store: PUBLIC_STORE_WHERE } }),
      prisma.store.aggregate({ where: PUBLIC_STORE_WHERE, _avg: { avgRating: true }, _sum: { reviewCount: true } }),
    ]);

  const categories = await prisma.storeCategory.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
      _count: { select: { stores: { where: PUBLIC_STORE_WHERE } } },
    },
  });

  res.json({
    topRated: topRated.map(toStoreCard),
    featured: featured.map(toStoreCard),
    newest: newest.map(toStoreCard),
    mostReviewed: mostReviewed.map(toStoreCard),
    categories: categories
      .map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        storeCount: category._count.stores,
      }))
      .filter((category) => category.storeCount > 0),
    stats: {
      totalStores,
      totalReviews,
      platformAverageRating: Math.round((ratingAggregate._avg.avgRating ?? 0) * 100) / 100,
    },
  });
});

/** GET /api/stores/:slug - public store profile including published reviews. */
export const getStoreBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const viewer = req.user;

  const store = await prisma.store.findUnique({
    where: { slug },
    include: STORE_DETAIL_INCLUDE,
  });

  if (!store) throw ApiError.notFound('Store not found');

  const isOwner = viewer && store.ownerId === viewer.id;
  const isAdmin = viewer?.role === ROLES.SUPER_ADMIN;
  const publiclyVisible = store.status === STORE_STATUS.APPROVED && store.isPublished;

  if (!publiclyVisible && !isOwner && !isAdmin) {
    throw ApiError.notFound('Store not found');
  }

  const [viewerReview, reviewTotal] = await Promise.all([
    viewer
      ? prisma.review.findUnique({
          where: { storeId_userId: { storeId: store.id, userId: viewer.id } },
          select: { id: true },
        })
      : null,
    prisma.review.count({
      where: { storeId: store.id, ...(isOwner || isAdmin ? {} : { status: REVIEW_STATUS.PUBLISHED }) },
    }),
  ]);

  res.json({
    store: toStoreDetail(store, { viewer, viewerReview }),
    reviewSummary: {
      total: reviewTotal,
      average: Number(store.avgRating),
      ratingBreakdown: toStoreDetail(store, {}).ratingBreakdown,
    },
  });
});

// ---------------------------------------------------------------------------
// Store owner endpoints
// ---------------------------------------------------------------------------

async function resolveCategoryId({ categoryId, categoryName }) {
  if (categoryId) {
    const category = await prisma.storeCategory.findUnique({ where: { id: categoryId } });
    if (!category) throw ApiError.badRequest('Selected category no longer exists');
    return category.id;
  }
  if (categoryName) {
    const slug = slugify(categoryName);
    const existing = await prisma.storeCategory.findFirst({
      where: { OR: [{ slug }, { name: categoryName }] },
    });
    if (existing) return existing.id;
    const created = await prisma.storeCategory.create({ data: { name: categoryName, slug } });
    return created.id;
  }
  return null;
}

async function replaceGallery(storeId, gallery) {
  if (!Array.isArray(gallery)) return;
  await prisma.storeImage.deleteMany({ where: { storeId } });
  if (gallery.length === 0) return;
  await prisma.storeImage.createMany({
    data: gallery.map((url, index) => ({ storeId, url, position: index })),
  });
}

/** POST /api/stores - create a store, submitted for admin approval. */
export const createStore = asyncHandler(async (req, res) => {
  const body = req.body;

  const existingForOwner = await prisma.store.count({ where: { ownerId: req.user.id } });
  if (existingForOwner >= 10) {
    throw ApiError.badRequest('You have reached the maximum number of stores for one account');
  }

  const duplicateName = await prisma.store.findFirst({
    where: { ownerId: req.user.id, name: body.name },
    select: { id: true },
  });
  if (duplicateName) throw ApiError.conflict('You already have a store with this name');

  const slug = await uniqueSlug(prisma.store, body.name);
  const categoryId = await resolveCategoryId(body);

  const store = await prisma.store.create({
    data: {
      ownerId: req.user.id,
      categoryId,
      name: body.name,
      slug,
      tagline: body.tagline || null,
      description: body.description,
      logoUrl: body.logoUrl || null,
      bannerUrl: body.bannerUrl || null,
      phone: body.phone || null,
      email: body.email || null,
      website: body.website || null,
      addressLine: body.addressLine,
      city: body.city,
      state: body.state || null,
      country: body.country || 'India',
      postalCode: body.postalCode || null,
      openingHours: JSON.stringify(body.openingHours?.length ? body.openingHours : DEFAULT_OPENING_HOURS),
      status: STORE_STATUS.PENDING,
      theme: { create: {} },
      images: body.gallery?.length
        ? { create: body.gallery.map((url, index) => ({ url, position: index })) }
        : undefined,
    },
    include: STORE_DETAIL_INCLUDE,
  });

  res.status(201).json({
    store: toStoreDetail(store, { viewer: req.user }),
    message: 'Store submitted for approval. A platform admin will review it shortly.',
  });
});

/** GET /api/stores/mine - stores belonging to the signed-in owner. */
export const listMyStores = asyncHandler(async (req, res) => {
  const stores = await prisma.store.findMany({
    where: { ownerId: req.user.id },
    include: {
      ...STORE_INCLUDE,
      _count: { select: { reviews: true, images: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    items: stores.map((store) => ({
      ...toStoreCard(store),
      counts: {
        reviews: store._count.reviews,
        images: store._count.images,
      },
    })),
    total: stores.length,
  });
});

/** GET /api/stores/mine/:id - full management view of a single owned store. */
export const getMyStore = asyncHandler(async (req, res) => {
  await loadStoreForManagement(req.params.id, req.user);

  const store = await prisma.store.findUnique({
    where: { id: req.params.id },
    include: STORE_DETAIL_INCLUDE,
  });

  const [pendingReports, recentReviews, reviewTotal] = await Promise.all([
    prisma.reviewReport.count({
      where: { status: 'OPEN', review: { storeId: store.id } },
    }),
    prisma.review.findMany({
      where: { storeId: store.id },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        reply: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.review.count({ where: { storeId: store.id, status: REVIEW_STATUS.PUBLISHED } }),
  ]);

  res.json({
    store: toStoreDetail(store, { viewer: req.user }),
    summary: {
      reviewTotal,
      pendingReports,
      recentReviews: recentReviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        user: review.user,
        hasReply: Boolean(review.reply),
      })),
    },
  });
});

/** PATCH /api/stores/:id - update store information. */
export const updateStore = asyncHandler(async (req, res) => {
  const store = await loadStoreForManagement(req.params.id, req.user);
  const body = req.body;

  const data = {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.tagline !== undefined ? { tagline: body.tagline || null } : {}),
    ...(body.description !== undefined ? { description: body.description } : {}),
    ...(body.logoUrl !== undefined ? { logoUrl: body.logoUrl || null } : {}),
    ...(body.bannerUrl !== undefined ? { bannerUrl: body.bannerUrl || null } : {}),
    ...(body.phone !== undefined ? { phone: body.phone || null } : {}),
    ...(body.email !== undefined ? { email: body.email || null } : {}),
    ...(body.website !== undefined ? { website: body.website || null } : {}),
    ...(body.addressLine !== undefined ? { addressLine: body.addressLine } : {}),
    ...(body.city !== undefined ? { city: body.city } : {}),
    ...(body.state !== undefined ? { state: body.state || null } : {}),
    ...(body.country !== undefined ? { country: body.country || 'India' } : {}),
    ...(body.postalCode !== undefined ? { postalCode: body.postalCode || null } : {}),
    ...(body.openingHours !== undefined ? { openingHours: JSON.stringify(body.openingHours) } : {}),
  };

  if (body.categoryId !== undefined || body.categoryName !== undefined) {
    data.categoryId = await resolveCategoryId(body);
  }

  if (body.name !== undefined && body.name !== store.name) {
    data.slug = await uniqueSlug(prisma.store, body.name, store.id);
  }

  if (body.gallery !== undefined) {
    await replaceGallery(store.id, body.gallery);
  }

  const updated = await prisma.store.update({
    where: { id: store.id },
    data,
    include: STORE_DETAIL_INCLUDE,
  });

  res.json({ store: toStoreDetail(updated, { viewer: req.user }), message: 'Store updated' });
});

/** PUT /api/stores/:id/theme - update storefront branding. */
export const updateStoreTheme = asyncHandler(async (req, res) => {
  const store = await loadStoreForManagement(req.params.id, req.user);

  const theme = await prisma.storeTheme.upsert({
    where: { storeId: store.id },
    create: { storeId: store.id, ...req.body },
    update: { ...req.body },
  });

  res.json({ theme, message: 'Storefront theme saved' });
});

/** PATCH /api/stores/:id/visibility - owner-controlled publishing switch. */
export const setStoreVisibility = asyncHandler(async (req, res) => {
  const store = await loadStoreForManagement(req.params.id, req.user);

  if (store.status !== STORE_STATUS.APPROVED && req.body.isPublished) {
    throw ApiError.badRequest('Only approved stores can be published to the directory');
  }

  const updated = await prisma.store.update({
    where: { id: store.id },
    data: { isPublished: req.body.isPublished },
    include: STORE_INCLUDE,
  });

  res.json({
    store: toStoreCard(updated),
    message: req.body.isPublished ? 'Store is now live' : 'Store hidden from the directory',
  });
});

/** DELETE /api/stores/:id - removes a store and all dependent data (cascade). */
export const deleteStore = asyncHandler(async (req, res) => {
  const store = await loadStoreForManagement(req.params.id, req.user);
  await prisma.store.delete({ where: { id: store.id } });
  res.json({ message: 'Store deleted' });
});

/** POST /api/stores/:id/images - attach a gallery image. */
export const addStoreImage = asyncHandler(async (req, res) => {
  const store = await loadStoreForManagement(req.params.id, req.user);

  const count = await prisma.storeImage.count({ where: { storeId: store.id } });
  if (count >= 12) throw ApiError.badRequest('Gallery is full (maximum 12 images)');

  const image = await prisma.storeImage.create({
    data: {
      storeId: store.id,
      url: req.body.url,
      caption: req.body.caption || null,
      position: count,
    },
  });

  res.status(201).json({ image });
});

/** DELETE /api/stores/:id/images/:imageId */
export const deleteStoreImage = asyncHandler(async (req, res) => {
  const store = await loadStoreForManagement(req.params.id, req.user);

  const image = await prisma.storeImage.findFirst({
    where: { id: req.params.imageId, storeId: store.id },
  });
  if (!image) throw ApiError.notFound('Image not found');

  await prisma.storeImage.delete({ where: { id: image.id } });
  res.json({ message: 'Image removed' });
});

/** POST /api/stores/:id/gallery-upload - multipart gallery upload. */
export const uploadGalleryImages = asyncHandler(async (req, res) => {
  const store = await loadStoreForManagement(req.params.id, req.user);
  const files = req.files ?? [];
  if (files.length === 0) throw ApiError.badRequest('Choose at least one image to upload');

  const existing = await prisma.storeImage.count({ where: { storeId: store.id } });
  if (existing >= 12) throw ApiError.badRequest('Gallery is full (maximum 12 images)');

  const allowed = files.slice(0, Math.max(0, 12 - existing));
  await prisma.storeImage.createMany({
    data: allowed.map((file, index) => ({
      storeId: store.id,
      url: `/uploads/${path.relative(uploadRoot, file.path).split(path.sep).join('/')}`,
      position: existing + index,
    })),
  });

  const images = await prisma.storeImage.findMany({
    where: { storeId: store.id },
    orderBy: { position: 'asc' },
  });

  res.status(201).json({ images, message: `${allowed.length} image(s) uploaded` });
});

/** GET /api/stores/:id/analytics - rating analytics for the owning dashboard. */
export const storeAnalytics = asyncHandler(async (req, res) => {
  const store = await loadStoreForManagement(req.params.id, req.user);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const [published, recent, trending, replied, totalReviews] = await Promise.all([
    prisma.review.groupBy({
      by: ['rating'],
      where: { storeId: store.id, status: REVIEW_STATUS.PUBLISHED },
      _count: { _all: true },
    }),
    prisma.review.findMany({
      where: { storeId: store.id, createdAt: { gte: thirtyDaysAgo } },
      select: { rating: true, createdAt: true },
    }),
    prisma.review.findMany({
      where: { storeId: store.id, status: REVIEW_STATUS.PUBLISHED, createdAt: { gte: ninetyDaysAgo } },
      select: { rating: true, createdAt: true },
    }),
    prisma.reviewReply.count({ where: { review: { storeId: store.id } } }),
    prisma.review.count({ where: { storeId: store.id } }),
  ]);

  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  let sum = 0;
  for (const row of published) {
    counts[row.rating] = row._count._all;
    total += row._count._all;
    sum += row.rating * row._count._all;
  }

  // Monthly trend over the last 6 months
  const monthBuckets = new Map();
  const now = new Date();
  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    monthBuckets.set(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, {
      month: date.toLocaleString('en-US', { month: 'short' }),
      count: 0,
      ratingSum: 0,
    });
  }
  for (const review of trending) {
    const key = `${review.createdAt.getFullYear()}-${String(review.createdAt.getMonth() + 1).padStart(2, '0')}`;
    const bucket = monthBuckets.get(key);
    if (!bucket) continue;
    bucket.count += 1;
    bucket.ratingSum += review.rating;
  }

  res.json({
    store: { id: store.id, name: store.name, slug: store.slug, status: store.status },
    totals: {
      averageRating: total > 0 ? Math.round((sum / total) * 100) / 100 : 0,
      publishedReviews: total,
      totalReviews,
      replies: replied,
      replyRate: total > 0 ? Math.round((replied / total) * 1000) / 10 : 0,
      last30Days: recent.length,
      hiddenOrRemoved: totalReviews - total,
    },
    distribution: [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: counts[stars],
      percentage: total > 0 ? Math.round((counts[stars] / total) * 1000) / 10 : 0,
    })),
    trend: Array.from(monthBuckets.values()).map((bucket) => ({
      month: bucket.month,
      count: bucket.count,
      average: bucket.count > 0 ? Math.round((bucket.ratingSum / bucket.count) * 100) / 100 : 0,
    })),
  });
});

export const listCategories = asyncHandler(async (_req, res) => {
  const categories = await prisma.storeCategory.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
      description: true,
      _count: { select: { stores: true } },
    },
  });

  res.json({
    items: categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      icon: category.icon,
      description: category.description,
      storeCount: category._count.stores,
    })),
  });
});

export const storeOwnerOverview = asyncHandler(async (req, res) => {
  const stores = await prisma.store.findMany({
    where: { ownerId: req.user.id },
    include: STORE_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });

  const storeIds = stores.map((store) => store.id);

  const [reviewAggregate, pendingReviews, unreplied, openReports] = await Promise.all([
    prisma.review.aggregate({
      where: { storeId: { in: storeIds }, status: REVIEW_STATUS.PUBLISHED },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.review.count({ where: { storeId: { in: storeIds }, status: REVIEW_STATUS.PUBLISHED } }),
    prisma.review.count({
      where: { storeId: { in: storeIds }, status: REVIEW_STATUS.PUBLISHED, reply: { is: null } },
    }),
    prisma.reviewReport.count({ where: { status: 'OPEN', review: { storeId: { in: storeIds } } } }),
  ]);

  res.json({
    stores: stores.map(toStoreCard),
    totals: {
      stores: stores.length,
      approvedStores: stores.filter((store) => store.status === STORE_STATUS.APPROVED).length,
      pendingStores: stores.filter((store) => store.status === STORE_STATUS.PENDING).length,
      reviews: reviewAggregate._count._all,
      averageRating: Math.round((reviewAggregate._avg.rating ?? 0) * 100) / 100,
      awaitingReply: unreplied,
      openReports,
      publishedReviews: pendingReviews,
    },
  });
});

export const ownerStoreOptions = asyncHandler(async (req, res) => {
  const stores = await prisma.store.findMany({
    where: { ownerId: req.user.id },
    select: { id: true, name: true, slug: true, status: true },
    orderBy: { name: 'asc' },
  });
  res.json({ items: stores, activeOwner: { id: req.user.id, status: USER_STATUS.ACTIVE } });
});

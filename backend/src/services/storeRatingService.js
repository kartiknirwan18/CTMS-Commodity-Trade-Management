import prisma from '../lib/prisma.js';
import { REVIEW_STATUS } from '../utils/constants.js';

/**
 * Recalculates the denormalised rating counters of a store from its published
 * reviews. Called after every mutation that can affect ratings so that the
 * storefront, directory and review dashboard always agree.
 */
export async function recalculateStoreRating(storeId, client = prisma) {
  const groups = await client.review.groupBy({
    by: ['rating'],
    where: { storeId, status: REVIEW_STATUS.PUBLISHED },
    _count: { _all: true },
  });

  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  let sum = 0;

  for (const group of groups) {
    const rating = Number(group.rating);
    const count = group._count._all;
    if (counts[rating] === undefined) continue;
    counts[rating] = count;
    total += count;
    sum += rating * count;
  }

  const avgRating = total > 0 ? Math.round((sum / total) * 100) / 100 : 0;

  return client.store.update({
    where: { id: storeId },
    data: {
      reviewCount: total,
      ratingSum: sum,
      avgRating,
      rating1Count: counts[1],
      rating2Count: counts[2],
      rating3Count: counts[3],
      rating4Count: counts[4],
      rating5Count: counts[5],
    },
    select: {
      id: true,
      slug: true,
      reviewCount: true,
      avgRating: true,
      rating1Count: true,
      rating2Count: true,
      rating3Count: true,
      rating4Count: true,
      rating5Count: true,
    },
  });
}

export default recalculateStoreRating;

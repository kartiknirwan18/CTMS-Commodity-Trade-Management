/**
 * MultiStore development seed.
 *
 * Usage: npm run db:seed   (from /backend or the repo root)
 *
 * - Safe to re-run: it clears platform data and recreates a consistent dataset.
 * - Credentials come from backend/.env (see .env.example). They are development
 *   accounts only - never use them in production.
 * - Review ratings are inserted as data, but each store's average rating and
 *   rating distribution are recalculated with the same service the API uses, so
 *   the seed can never produce inconsistent counters.
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { recalculateStoreRating } from '../src/services/storeRatingService.js';

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@multistore.test';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345';
const OWNER_PASSWORD = process.env.SEED_OWNER_PASSWORD ?? 'Owner@12345';
const CUSTOMER_PASSWORD = process.env.SEED_CUSTOMER_PASSWORD ?? 'Customer@12345';

// Deterministic pseudo random generator so repeated seeds look identical.
function createRandom(seed = 20260217) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}
const random = createRandom();
const pick = (list) => list[Math.floor(random() * list.length)];
const intBetween = (min, max) => min + Math.floor(random() * (max - min + 1));

const image = (prompt, size = 'landscape_4_3') =>
  `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=${size}`;

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const defaultHours = (open = '09:00', close = '18:00', closedDays = ['Sunday']) =>
  days.map((day) => ({ day, open, close, closed: closedDays.includes(day) }));

const CATEGORIES = [
  { name: 'Restaurants & Cafés', icon: 'utensils', description: 'Dining, takeaway and coffee shops' },
  { name: 'Fashion & Apparel', icon: 'shirt', description: 'Clothing, footwear and accessories' },
  { name: 'Electronics & Gadgets', icon: 'cpu', description: 'Phones, laptops and accessories' },
  { name: 'Grocery & Daily Needs', icon: 'shopping-basket', description: 'Fresh produce and household items' },
  { name: 'Health & Pharmacy', icon: 'heart-pulse', description: 'Pharmacy, clinics and wellness' },
  { name: 'Beauty & Wellness', icon: 'sparkles', description: 'Salons, spas and personal care' },
  { name: 'Home & Furniture', icon: 'sofa', description: 'Furniture, decor and interiors' },
  { name: 'Books & Stationery', icon: 'book-open', description: 'Books, gifts and office supplies' },
  { name: 'Sports & Fitness', icon: 'dumbbell', description: 'Gyms, sports gear and outdoor' },
];

const OWNERS = [
  {
    name: 'Priya Nair',
    email: 'priya@multistore.test',
    city: 'Bengaluru',
    bio: 'Runs two neighbourhood food spots in Bengaluru.',
  },
  {
    name: 'Rahul Verma',
    email: 'rahul@multistore.test',
    city: 'Pune',
    bio: 'Electronics retailer since 2014.',
  },
  {
    name: 'Sara Khan',
    email: 'sara@multistore.test',
    city: 'Mumbai',
    bio: 'Independent fashion and beauty entrepreneur.',
  },
  {
    name: 'Imran Sheikh',
    email: 'imran@multistore.test',
    city: 'Hyderabad',
    bio: 'Grocery and fitness ventures across Hyderabad.',
  },
];

const CUSTOMERS = [
  { name: 'Ananya Iyer', email: 'ananya@multistore.test', city: 'Bengaluru' },
  { name: 'Vikram Singh', email: 'vikram@multistore.test', city: 'Delhi' },
  { name: 'Meera Joshi', email: 'meera@multistore.test', city: 'Pune' },
  { name: 'Karan Patel', email: 'karan@multistore.test', city: 'Ahmedabad' },
  { name: 'Nisha Rao', email: 'nisha@multistore.test', city: 'Hyderabad' },
  { name: 'Aditya Bose', email: 'aditya@multistore.test', city: 'Kolkata' },
  { name: 'Zoya Ahmed', email: 'zoya@multistore.test', city: 'Lucknow' },
  { name: 'Rohan Das', email: 'customer@multistore.test', city: 'Chennai' },
];

const STORES = [
  {
    ownerEmail: 'priya@multistore.test',
    category: 'Restaurants & Cafés',
    name: 'Spice Route Kitchen',
    tagline: 'Coastal Indian flavours, cooked fresh every day',
    description:
      'Spice Route Kitchen is a family-run restaurant serving coastal Indian classics with locally sourced spices. Our menu changes weekly, and our kitchen is open for lunch, dinner and late-night takeaway. Private dining is available for groups of up to twenty guests.',
    city: 'Bengaluru',
    state: 'Karnataka',
    addressLine: '142 Brigade Road, Shanthala Nagar',
    postalCode: '560025',
    phone: '+91 98450 11223',
    email: 'hello@spiceroute.test',
    website: 'https://spiceroute.test',
    openingHours: defaultHours('11:30', '23:00', []),
    status: 'APPROVED',
    isFeatured: true,
    theme: {
      primaryColor: '#b91c1c',
      accentColor: '#f97316',
      backgroundColor: '#fff7ed',
      surfaceColor: '#ffffff',
      textColor: '#1c1917',
      fontFamily: 'Inter',
      layout: 'MAGAZINE',
      reviewDisplay: 'CARDS',
    },
  },
  {
    ownerEmail: 'priya@multistore.test',
    category: 'Restaurants & Cafés',
    name: 'Bean & Brew Café',
    tagline: 'Single-origin coffee and slow mornings',
    description:
      'A quiet speciality coffee bar in Indiranagar pouring single-origin espresso, filter brews and house-baked pastries. We roast in small batches every Tuesday and host a monthly cupping session for our regulars.',
    city: 'Bengaluru',
    state: 'Karnataka',
    addressLine: '7th Main, 100 Feet Road, Indiranagar',
    postalCode: '560038',
    phone: '+91 98450 44556',
    email: 'hi@beanandbrew.test',
    website: 'https://beanandbrew.test',
    openingHours: defaultHours('07:30', '22:00', []),
    status: 'APPROVED',
    theme: {
      primaryColor: '#78350f',
      accentColor: '#d97706',
      backgroundColor: '#fffbeb',
      surfaceColor: '#ffffff',
      textColor: '#1f2937',
      fontFamily: 'Inter',
      layout: 'GRID',
      reviewDisplay: 'COMPACT',
    },
  },
  {
    ownerEmail: 'rahul@multistore.test',
    category: 'Electronics & Gadgets',
    name: 'TechnoHub Electronics',
    tagline: 'Phones, laptops and honest after-sales support',
    description:
      'TechnoHub is an authorised multi-brand electronics retailer with in-house service. We stock smartphones, laptops, audio gear and smart home devices, all with manufacturer warranty and same-day pickup options.',
    city: 'Pune',
    state: 'Maharashtra',
    addressLine: 'Shop 12, FC Road, Shivajinagar',
    postalCode: '411005',
    phone: '+91 98220 77881',
    email: 'support@technohub.test',
    website: 'https://technohub.test',
    openingHours: defaultHours('10:00', '21:00', ['Sunday']),
    status: 'APPROVED',
    isFeatured: true,
    theme: {
      primaryColor: '#1d4ed8',
      accentColor: '#06b6d4',
      backgroundColor: '#f8fafc',
      surfaceColor: '#ffffff',
      textColor: '#0f172a',
      fontFamily: 'Inter',
      layout: 'LIST',
      reviewDisplay: 'CARDS',
    },
  },
  {
    ownerEmail: 'sara@multistore.test',
    category: 'Fashion & Apparel',
    name: 'Urban Threads',
    tagline: 'Everyday essentials, small-batch and sustainable',
    description:
      'Urban Threads curates breathable cottons, handloom weaves and denim from Indian workshops. Every drop is limited to fifty pieces, and we repair any garment you buy from us for free within a year.',
    city: 'Mumbai',
    state: 'Maharashtra',
    addressLine: '218 Linking Road, Bandra West',
    postalCode: '400050',
    phone: '+91 98200 33112',
    email: 'studio@urbanthreads.test',
    website: 'https://urbanthreads.test',
    openingHours: defaultHours('10:30', '20:30', ['Monday']),
    status: 'APPROVED',
    theme: {
      primaryColor: '#7c3aed',
      accentColor: '#22d3ee',
      backgroundColor: '#f5f3ff',
      surfaceColor: '#ffffff',
      textColor: '#111827',
      fontFamily: 'Inter',
      layout: 'MAGAZINE',
      reviewDisplay: 'CARDS',
    },
  },
  {
    ownerEmail: 'imran@multistore.test',
    category: 'Grocery & Daily Needs',
    name: 'Green Basket Grocery',
    tagline: 'Farm-fresh produce, delivered in ninety minutes',
    description:
      'Green Basket works directly with forty farms around Hyderabad to deliver vegetables, fruit, dairy and staples within ninety minutes of ordering. No cold storage, no middlemen, and a no-questions refund on anything you are unhappy with.',
    city: 'Hyderabad',
    state: 'Telangana',
    addressLine: 'Plot 45, Road No. 12, Banjara Hills',
    postalCode: '500034',
    phone: '+91 90000 12345',
    email: 'care@greenbasket.test',
    website: 'https://greenbasket.test',
    openingHours: defaultHours('07:00', '22:00', []),
    status: 'APPROVED',
    theme: {
      primaryColor: '#15803d',
      accentColor: '#84cc16',
      backgroundColor: '#f0fdf4',
      surfaceColor: '#ffffff',
      textColor: '#052e16',
      fontFamily: 'Inter',
      layout: 'GRID',
      reviewDisplay: 'CARDS',
    },
  },
  {
    ownerEmail: 'rahul@multistore.test',
    category: 'Electronics & Gadgets',
    name: 'Gadget Garage',
    tagline: 'Refurbished devices with a year of warranty',
    description:
      'Gadget Garage refurbishes laptops, tablets and headphones to a certified standard, then sells them with twelve months of warranty and a free battery health report.',
    city: 'Pune',
    state: 'Maharashtra',
    addressLine: 'Unit 9, Viman Nagar Industrial Estate',
    postalCode: '411014',
    phone: '+91 98220 99001',
    email: 'sales@gadgetgarage.test',
    openingHours: defaultHours('10:00', '19:00', ['Sunday']),
    status: 'PENDING',
    theme: { primaryColor: '#0f766e', accentColor: '#14b8a6' },
  },
  {
    ownerEmail: 'sara@multistore.test',
    category: 'Beauty & Wellness',
    name: 'Glow Beauty Studio',
    tagline: 'Clean beauty treatments and bridal styling',
    description:
      'Glow Beauty Studio offers facials, hair treatments and bridal packages using fragrance-free, cruelty-free products. Booking is by appointment to keep each session unhurried.',
    city: 'Mumbai',
    state: 'Maharashtra',
    addressLine: '3rd Floor, Hill Road, Bandra West',
    postalCode: '400050',
    phone: '+91 98200 77445',
    email: 'bookings@glowstudio.test',
    openingHours: defaultHours('11:00', '20:00', ['Monday']),
    status: 'REJECTED',
    adminNote: 'Address proof did not match the registered business name. Please re-upload the shop licence.',
    theme: { primaryColor: '#db2777', accentColor: '#f472b6' },
  },
  {
    ownerEmail: 'imran@multistore.test',
    category: 'Sports & Fitness',
    name: 'FitZone Gym',
    tagline: 'Strength floor, group classes and personal coaching',
    description:
      'FitZone is a 6000 sq ft strength and conditioning gym with certified coaches, group classes through the day and a physio desk for injury screening.',
    city: 'Hyderabad',
    state: 'Telangana',
    addressLine: '8-2-120, Road No. 2, Jubilee Hills',
    postalCode: '500033',
    phone: '+91 90000 55667',
    email: 'join@fitzone.test',
    openingHours: defaultHours('05:30', '22:00', []),
    status: 'SUSPENDED',
    adminNote: 'Suspended pending renewal of the fire safety certificate.',
    theme: { primaryColor: '#1e293b', accentColor: '#facc15' },
  },
  {
    ownerEmail: 'priya@multistore.test',
    category: 'Books & Stationery',
    name: 'Page & Paper Books',
    tagline: 'Independent bookstore with a reading room',
    description:
      'A two-floor independent bookstore stocking fiction, poetry, children books and stationery, with a free reading room and a monthly author evening.',
    city: 'Bengaluru',
    state: 'Karnataka',
    addressLine: '11 Church Street',
    postalCode: '560001',
    phone: '+91 98450 67890',
    email: 'read@pageandpaper.test',
    openingHours: defaultHours('10:00', '20:00', []),
    status: 'APPROVED',
    theme: {
      primaryColor: '#0f172a',
      accentColor: '#22d3ee',
      backgroundColor: '#f8fafc',
      surfaceColor: '#ffffff',
      textColor: '#0f172a',
      layout: 'LIST',
      reviewDisplay: 'COMPACT',
    },
  },
];

const REVIEW_POOL = {
  5: [
    'Genuinely one of the best experiences I have had in this city. The staff remembered my name on the second visit and the quality has been consistent every single time.',
    'Exceptional service from start to finish. Everything was clean, well organised and exactly as described. I have already recommended it to three friends.',
    'Worth every rupee. Great attention to detail and you can tell the team cares about what they do.',
    'I have been coming here for months and the standard never drops. Fast, friendly and fairly priced.',
  ],
  4: [
    'Really good overall. Only reason it is not five stars is the wait time during peak hours, but the quality makes up for it.',
    'Solid experience and helpful staff. A couple of small things could be polished but nothing that would stop me returning.',
    'Very happy with my visit. Prices are reasonable and the team explained everything clearly.',
    'Great quality and easy to deal with. Parking is a bit tight, otherwise no complaints at all.',
  ],
  3: [
    'Decent on the whole. The product was fine but the service felt rushed on a busy afternoon.',
    'Mixed feelings. The core offering is good, however I expected a bit more for the price.',
    'Average experience. Nothing went wrong, but nothing stood out either.',
  ],
  2: [
    'Disappointing this time. I had to follow up twice before getting a clear answer, and the final result did not match what was promised.',
    'Quality has slipped compared to my last visit. Staff were polite but clearly understaffed.',
  ],
  1: [
    'Poor experience. I was charged for something I did not receive and it took a week to sort out.',
    'Would not recommend based on this visit. The listing does not match what you actually get.',
  ],
};

const REPLY_POOL = [
  'Thank you so much for the kind words - the whole team is delighted. See you again soon!',
  'Thanks for taking the time to share this. We are glad it worked out well for you.',
  'We are sorry this visit did not meet our usual standard. Please reach us on our support number so we can make it right.',
  'Appreciate the honest feedback. We have shared it with the team and are already working on the wait times you mentioned.',
  'Thank you for the detailed review - it genuinely helps us improve. We hope to see you again.',
];

const REPORT_REASONS = ['SPAM', 'FAKE_REVIEW', 'OFFENSIVE', 'IRRELEVANT'];

async function clearDatabase() {
  // Delete in dependency order so foreign keys stay valid.
  await prisma.reviewHelpfulVote.deleteMany();
  await prisma.reviewReport.deleteMany();
  await prisma.reviewReply.deleteMany();
  await prisma.review.deleteMany();
  await prisma.storeImage.deleteMany();
  await prisma.storeTheme.deleteMany();
  await prisma.store.deleteMany();
  await prisma.user.deleteMany();
  await prisma.storeCategory.deleteMany();
}

async function main() {
  console.log('Clearing existing data...');
  await clearDatabase();

  console.log('Creating categories...');
  const categoryByName = new Map();
  for (const category of CATEGORIES) {
    const created = await prisma.storeCategory.create({
      data: {
        name: category.name,
        slug: category.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, ''),
        description: category.description,
        icon: category.icon,
      },
    });
    categoryByName.set(category.name, created);
  }

  console.log('Creating users...');
  const admin = await prisma.user.create({
    data: {
      name: 'Aarav Mehta',
      email: ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
      role: 'SUPER_ADMIN',
      city: 'Bengaluru',
      bio: 'Platform administrator for MultiStore.',
    },
  });

  const owners = new Map();
  for (const owner of OWNERS) {
    const created = await prisma.user.create({
      data: {
        name: owner.name,
        email: owner.email,
        passwordHash: await bcrypt.hash(OWNER_PASSWORD, 12),
        role: 'STORE_OWNER',
        city: owner.city,
        bio: owner.bio,
      },
    });
    owners.set(owner.email, created);
  }

  const customers = [];
  for (const customer of CUSTOMERS) {
    const created = await prisma.user.create({
      data: {
        name: customer.name,
        email: customer.email,
        passwordHash: await bcrypt.hash(CUSTOMER_PASSWORD, 12),
        role: 'CUSTOMER',
        city: customer.city,
      },
    });
    customers.push(created);
  }

  console.log('Creating stores, themes and galleries...');
  const stores = [];
  for (const definition of STORES) {
    const owner = owners.get(definition.ownerEmail);
    const category = categoryByName.get(definition.category);

    const store = await prisma.store.create({
      data: {
        ownerId: owner.id,
        categoryId: category.id,
        name: definition.name,
        slug: definition.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, ''),
        tagline: definition.tagline,
        description: definition.description,
        logoUrl: image(`${definition.name} logo, minimalist retail brand mark, flat vector, white background`, 'square'),
        bannerUrl: image(`${definition.name} storefront interior, ${definition.category}, warm lighting, professional photo`, 'landscape_16_9'),
        phone: definition.phone,
        email: definition.email,
        website: definition.website ?? null,
        addressLine: definition.addressLine,
        city: definition.city,
        state: definition.state,
        country: 'India',
        postalCode: definition.postalCode,
        openingHours: JSON.stringify(definition.openingHours ?? defaultHours()),
        status: definition.status,
        isFeatured: definition.isFeatured ?? false,
        isPublished: true,
        adminNote: definition.adminNote ?? null,
        approvedAt: definition.status === 'APPROVED' ? new Date() : null,
        theme: { create: { ...definition.theme } },
        images: {
          create: [1, 2, 3].map((index) => ({
            url: image(
              `${definition.name} gallery photo ${index}, ${definition.category}, natural light, editorial photography`,
              'landscape_4_3',
            ),
            caption: `${definition.name} - photo ${index}`,
            position: index - 1,
          })),
        },
      },
    });
    stores.push(store);
  }

  console.log('Creating reviews, replies, votes and reports...');
  const reviewableStores = stores.filter((store) => store.status === 'APPROVED');
  let reviewTotal = 0;

  for (const store of reviewableStores) {
    const reviewerCount = intBetween(4, 7);
    const shuffled = [...customers].sort(() => random() - 0.5).slice(0, reviewerCount);

    for (const [index, customer] of shuffled.entries()) {
      // Weight the distribution towards positive reviews, like a healthy marketplace.
      const roll = random();
      const rating = roll > 0.78 ? pick([5, 3]) : roll > 0.6 ? 4 : roll > 0.42 ? 3 : roll > 0.3 ? 5 : pick([1, 2, 4]);
      const comment = pick(REVIEW_POOL[rating]);
      const createdAt = new Date(Date.now() - intBetween(2, 160) * 24 * 60 * 60 * 1000);
      const shuffledAgain = random() > 0.45;

      const review = await prisma.review.create({
        data: {
          storeId: store.id,
          userId: customer.id,
          rating,
          title: rating >= 4 ? 'Would recommend' : rating === 3 ? 'Mixed experience' : 'Needs improvement',
          comment,
          images:
            rating >= 4 && random() > 0.72
              ? JSON.stringify([
                  image(`${store.name} customer photo, product or storefront detail`, 'landscape_4_3'),
                ])
              : null,
          status: 'PUBLISHED',
          isVerifiedVisit: false,
          helpfulCount: intBetween(0, 14),
          createdAt,
          updatedAt: createdAt,
        },
      });
      reviewTotal += 1;

      // A few reviews get an official store owner reply.
      if (index % 3 === 0 || rating <= 2) {
        const replyAt = new Date(createdAt.getTime() + intBetween(1, 5) * 24 * 60 * 60 * 1000);
        if (replyAt < new Date()) {
          await prisma.reviewReply.create({
            data: {
              reviewId: review.id,
              ownerId: store.ownerId,
              comment: pick(REPLY_POOL),
              createdAt: replyAt,
              updatedAt: replyAt,
            },
          });
        }
      }

      // Helpful votes from other customers.
      const voterCount = Math.min(intBetween(0, 3), customers.length - 1);
      const voters = customers.filter((candidate) => candidate.id !== customer.id).slice(0, voterCount);
      for (const voter of voters) {
        await prisma.reviewHelpfulVote.create({ data: { reviewId: review.id, userId: voter.id } });
      }
      const helpfulCount = await prisma.reviewHelpfulVote.count({ where: { reviewId: review.id } });
      await prisma.review.update({ where: { id: review.id }, data: { helpfulCount } });

      if (shuffledAgain && rating <= 2 && random() > 0.6) {
        await prisma.reviewReport.create({
          data: {
            reviewId: review.id,
            reporterId: voters[0]?.id ?? customers.find((candidate) => candidate.id !== customer.id).id,
            reason: pick(REPORT_REASONS),
            details: 'Automatically seeded sample report so the moderation queue is not empty.',
            status: 'OPEN',
          },
        });
      }
    }
  }

  // A hidden review demonstrates the moderation workflow end to end.
  const moderatedStore = reviewableStores[0];
  const moderatedReview = await prisma.review.findFirst({ where: { storeId: moderatedStore.id } });
  if (moderatedReview) {
    await prisma.review.update({
      where: { id: moderatedReview.id },
      data: {
        status: 'HIDDEN',
        moderationNote: 'Hidden by the seed script to demonstrate the moderation workflow.',
      },
    });
  }

  console.log('Recalculating store rating aggregates...');
  for (const store of stores) {
    await recalculateStoreRating(store.id);
  }

  const [storeCount, userCount, finalReviews] = await Promise.all([
    prisma.store.count(),
    prisma.user.count(),
    prisma.review.count(),
  ]);

  console.log('\nSeed complete');
  console.log(`  users:     ${userCount} (1 super admin, ${OWNERS.length} store owners, ${CUSTOMERS.length} customers)`);
  console.log(`  stores:    ${storeCount} (${reviewableStores.length} approved, 1 pending, 1 rejected, 1 suspended)`);
  console.log(`  reviews:   ${finalReviews} inserted (${reviewTotal} generated, 1 hidden for moderation demo)`);
  console.log('\nDevelopment logins');
  console.log(`  Super admin   ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`  Store owner   ${OWNERS[0].email} / ${OWNER_PASSWORD}`);
  console.log(`  Customer      ${CUSTOMERS[7].email} / ${CUSTOMER_PASSWORD}`);
  console.log(`  (all other owners use ${OWNER_PASSWORD}, all other customers use ${CUSTOMER_PASSWORD})`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

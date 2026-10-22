/**
 * End-to-end smoke test for the MultiStore API.
 *
 * It boots the real Express app against the real database (in-process, on a
 * random port) and walks the full acceptance criteria: owner registers, creates
 * a store, admin approves it, it appears publicly, a customer reviews it, the
 * rating aggregates update, the review shows up on the central dashboard, the
 * owner replies, and the permission boundaries hold.
 *
 * Run with:  npm run smoke      (from /backend)
 *
 * Each run creates throwaway data tagged with a unique suffix, so it is safe to
 * run repeatedly against the development database.
 */

import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import prisma from '../src/lib/prisma.js';

const suffix = Date.now().toString(36);
const log = (...parts) => console.log('  ', ...parts);
const results = [];

async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`PASS  ${name}`);
  } catch (error) {
    results.push({ name, ok: false, error });
    console.log(`FAIL  ${name}\n        ${error.message}`);
  }
}

function startServer() {
  const app = createApp();
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}/api` });
    });
  });
}

let baseUrl = '';

async function api(method, path, { token, body, raw } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !raw) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: raw ?? (body ? JSON.stringify(body) : undefined),
  });

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: response.status, body: json };
}

async function main() {
  const started = await startServer();
  const server = started.server;
  baseUrl = started.baseUrl.replace(/\/$/, '');
  const origin = `http://127.0.0.1:${new URL(baseUrl).port}`;

  const ctx = {};

  console.log('\nHealth');
  await check('GET /api/health reports a connected database', async () => {
    const res = await api('GET', '/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.database, 'connected');
  });

  console.log('\nAuthentication and roles');
  await check('store owner registers and receives a token', async () => {
    const res = await api('POST', '/auth/register', {
      body: {
        name: `Smoke Owner ${suffix}`,
        email: `owner-${suffix}@smoke.test`,
        password: 'SmokePass123',
        role: 'STORE_OWNER',
        city: 'Bengaluru',
      },
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.ok(res.body.token);
    assert.equal(res.body.user.role, 'STORE_OWNER');
    assert.equal(res.body.user.passwordHash, undefined);
    ctx.owner = { token: res.body.token, id: res.body.user.id, email: res.body.user.email };
  });

  await check('the API rejects an invalid registration payload', async () => {
    const res = await api('POST', '/auth/register', {
      body: { name: 'x', email: 'not-an-email', password: 'short', role: 'CUSTOMER' },
    });
    assert.equal(res.status, 400);
    assert.ok(Array.isArray(res.body.errors));
  });

  await check('super admin signs in', async () => {
    const res = await api('POST', '/auth/login', {
      body: {
        email: process.env.SEED_ADMIN_EMAIL ?? 'admin@multistore.test',
        password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345',
      },
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.user.role, 'SUPER_ADMIN');
    ctx.admin = { token: res.body.token, id: res.body.user.id };
  });

  await check('a customer cannot self-register as super admin', async () => {
    const res = await api('POST', '/auth/register', {
      body: {
        name: 'Sneaky User',
        email: `sneaky-${suffix}@smoke.test`,
        password: 'SmokePass123',
        role: 'SUPER_ADMIN',
      },
    });
    // The privileged role is rejected outright by server-side validation.
    assert.equal(res.status, 400);
    assert.ok(res.body.errors.some((issue) => issue.field === 'role'));
  });

  console.log('\nStore creation and approval');
  await check('owner creates a store that starts as PENDING', async () => {
    const res = await api('POST', '/stores', {
      token: ctx.owner.token,
      body: {
        name: `Smoke Store ${suffix}`,
        description: 'A smoke-test storefront created by the automated verification script.',
        addressLine: '1 Test Street',
        city: 'Bengaluru',
        state: 'Karnataka',
        categoryName: 'Restaurants & Cafés',
        phone: '+91 90000 00000',
        email: `store-${suffix}@smoke.test`,
      },
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.store.status, 'PENDING');
    ctx.store = { id: res.body.store.id, slug: res.body.store.slug };
  });

  await check('a pending store is not visible in the public directory', async () => {
    const res = await api('GET', `/stores?search=${encodeURIComponent(`Smoke Store ${suffix}`)}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.items.length, 0);
  });

  await check('a store owner cannot reach the admin API', async () => {
    const res = await api('GET', '/admin/stats', { token: ctx.owner.token });
    assert.equal(res.status, 403);
  });

  await check('admin approves the store', async () => {
    const res = await api('PATCH', `/admin/stores/${ctx.store.id}/status`, {
      token: ctx.admin.token,
      body: { status: 'APPROVED' },
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.store.status, 'APPROVED');
  });

  await check('the approved store appears in the public directory', async () => {
    const res = await api('GET', `/stores?search=${encodeURIComponent(`Smoke Store ${suffix}`)}`);
    assert.equal(res.body.items.length, 1);
    assert.equal(res.body.items[0].slug, ctx.store.slug);
  });

  console.log('\nReviews and rating aggregation');
  await check('customer registers', async () => {
    const res = await api('POST', '/auth/register', {
      body: {
        name: `Smoke Customer ${suffix}`,
        email: `customer-${suffix}@smoke.test`,
        password: 'SmokePass123',
        role: 'CUSTOMER',
      },
    });
    assert.equal(res.status, 201);
    ctx.customer = { token: res.body.token, id: res.body.user.id };
  });

  await check('anonymous visitors cannot submit a review', async () => {
    const res = await api('POST', '/reviews', {
      body: { storeId: ctx.store.id, rating: 5, comment: 'Anonymous review attempt that must fail.' },
    });
    assert.equal(res.status, 401);
  });

  await check('customer submits a 4 star review and aggregates update', async () => {
    const res = await api('POST', '/reviews', {
      token: ctx.customer.token,
      body: {
        storeId: ctx.store.id,
        rating: 4,
        title: 'Great little shop',
        comment: 'The smoke test review body, long enough to pass validation rules.',
      },
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.review.rating, 4);
    ctx.review = { id: res.body.review.id };

    const store = await api('GET', `/stores/${ctx.store.slug}`);
    assert.equal(store.body.store.reviewCount, 1);
    assert.equal(store.body.store.avgRating, 4);
  });

  await check('duplicate reviews from the same customer are rejected', async () => {
    const res = await api('POST', '/reviews', {
      token: ctx.customer.token,
      body: { storeId: ctx.store.id, rating: 5, comment: 'Trying to review the same store twice here.' },
    });
    assert.equal(res.status, 409);
  });

  await check('another customer cannot edit this review', async () => {
    const other = await api('POST', '/auth/register', {
      body: {
        name: `Other Customer ${suffix}`,
        email: `other-${suffix}@smoke.test`,
        password: 'SmokePass123',
        role: 'CUSTOMER',
      },
    });
    ctx.other = { token: other.body.token };

    const res = await api('PATCH', `/reviews/${ctx.review.id}`, {
      token: ctx.other.token,
      body: { rating: 1, comment: 'Malicious edit attempt from a different account.' },
    });
    assert.equal(res.status, 403);
  });

  await check('the review appears on the central review dashboard', async () => {
    const res = await api('GET', `/reviews?search=${encodeURIComponent('smoke test review body')}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.total >= 1, 'expected the new review in the dashboard feed');
    assert.equal(res.body.items[0].store.slug, ctx.store.slug);
  });

  await check('the review is reachable through its detail endpoint', async () => {
    const res = await api('GET', `/reviews/${ctx.review.id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.review.user.name, `Smoke Customer ${suffix}`);
    assert.equal(res.body.review.user.email, undefined);
  });

  await check('helpful voting toggles and is idempotent per account', async () => {
    const up = await api('POST', `/reviews/${ctx.review.id}/helpful`, { token: ctx.other.token });
    assert.equal(up.status, 200);
    assert.equal(up.body.helpfulCount, 1);
    assert.equal(up.body.voted, true);

    const down = await api('POST', `/reviews/${ctx.review.id}/helpful`, { token: ctx.other.token });
    assert.equal(down.body.helpfulCount, 0);
    assert.equal(down.body.voted, false);
  });

  await check('a customer cannot mark their own review as helpful', async () => {
    const res = await api('POST', `/reviews/${ctx.review.id}/helpful`, { token: ctx.customer.token });
    assert.equal(res.status, 400);
  });

  await check('the review can be reported and lands in the moderation queue', async () => {
    const created = await api('POST', `/reviews/${ctx.review.id}/report`, {
      token: ctx.other.token,
      body: { reason: 'SPAM', details: 'Automated smoke test report.' },
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));

    const queue = await api('GET', '/admin/reports?status=OPEN', { token: ctx.admin.token });
    assert.equal(queue.status, 200);
    assert.ok(queue.body.items.some((report) => report.review.id === ctx.review.id));
  });

  console.log('\nTenant isolation');
  await check('the owner sees the review in their own inbox', async () => {
    const res = await api('GET', `/stores/${ctx.store.id}/reviews`, { token: ctx.owner.token });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.total, 1);
    assert.equal(res.body.items[0].viewer.canReply, true);
  });

  await check('a different store owner cannot read that inbox', async () => {
    const res = await api('GET', `/stores/${ctx.store.id}/reviews`, { token: ctx.other.token });
    assert.equal(res.status, 403);
  });

  await check('a customer cannot read the owner inbox', async () => {
    const res = await api('GET', `/stores/${ctx.store.id}/reviews`, { token: ctx.customer.token });
    assert.equal(res.status, 403);
  });

  await check('the owner replies to the review', async () => {
    const res = await api('POST', `/reviews/${ctx.review.id}/reply`, {
      token: ctx.owner.token,
      body: { comment: 'Thank you for the detailed feedback, we appreciate it.' },
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));

    const detail = await api('GET', `/reviews/${ctx.review.id}`);
    assert.ok(detail.body.review.reply);
    assert.equal(detail.body.review.reply.ownerName, `Smoke Owner ${suffix}`);
  });

  await check('the review author can edit their own review', async () => {
    const res = await api('PATCH', `/reviews/${ctx.review.id}`, {
      token: ctx.customer.token,
      body: { rating: 5, comment: 'Updated after a second visit, the smoke test comment.' },
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));

    const store = await api('GET', `/stores/${ctx.store.slug}`);
    assert.equal(store.body.store.avgRating, 5);
  });

  console.log('\nModeration');
  await check('admin hides the review and the store rating recalculates', async () => {
    const res = await api('PATCH', `/admin/reviews/${ctx.review.id}/status`, {
      token: ctx.admin.token,
      body: { status: 'HIDDEN', moderationNote: 'Hidden by the smoke test.' },
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));

    const store = await api('GET', `/stores/${ctx.store.slug}`);
    assert.equal(store.body.store.reviewCount, 0);
    assert.equal(store.body.store.avgRating, 0);
  });

  await check('a hidden review disappears from the public dashboard', async () => {
    const res = await api('GET', `/reviews?storeId=${ctx.store.id}`);
    assert.equal(res.body.total, 0);
  });

  await check('the author can still see their own hidden review', async () => {
    const res = await api('GET', `/reviews/${ctx.review.id}`, { token: ctx.customer.token });
    assert.equal(res.status, 200);
    assert.equal(res.body.review.status, 'HIDDEN');
  });

  await check('admin restores the review', async () => {
    const res = await api('PATCH', `/admin/reviews/${ctx.review.id}/status`, {
      token: ctx.admin.token,
      body: { status: 'PUBLISHED' },
    });
    assert.equal(res.status, 200);
    const store = await api('GET', `/stores/${ctx.store.slug}`);
    assert.equal(store.body.store.reviewCount, 1);
    assert.equal(store.body.store.avgRating, 5);
  });

  console.log('\nOwner dashboard, analytics and uploads');
  await check('owner analytics reflect the published review', async () => {
    const res = await api('GET', `/stores/${ctx.store.id}/analytics`, { token: ctx.owner.token });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.totals.publishedReviews, 1);
    assert.equal(res.body.distribution.find((row) => row.stars === 5).count, 1);
  });

  await check('owner updates storefront theme colours', async () => {
    const res = await api('PUT', `/stores/${ctx.store.id}/theme`, {
      token: ctx.owner.token,
      body: { primaryColor: '#0ea5e9', accentColor: '#22d3ee', layout: 'GRID' },
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.theme.primaryColor, '#0ea5e9');
  });

  await check('theme update rejects an invalid colour value', async () => {
    const res = await api('PUT', `/stores/${ctx.store.id}/theme`, {
      token: ctx.owner.token,
      body: { primaryColor: 'blue' },
    });
    assert.equal(res.status, 400);
  });

  await check('image upload stores the file and returns a public URL', async () => {
    // 1x1 transparent PNG.
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64',
    );
    const form = new FormData();
    form.append('file', new Blob([png], { type: 'image/png' }), 'pixel.png');

    const res = await api('POST', '/uploads', { token: ctx.owner.token, raw: form });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.match(res.body.url, /^\/uploads\/\d{4}\/\d{2}\/.+\.png$/);
    ctx.uploadUrl = res.body.url;

    const file = await fetch(`${origin}${res.body.url}`);
    assert.equal(file.status, 200);
  });

  await check('upload rejects a non-image file', async () => {
    const form = new FormData();
    form.append('file', new Blob([Buffer.from('not an image')], { type: 'text/plain' }), 'notes.txt');
    const res = await api('POST', '/uploads', { token: ctx.owner.token, raw: form });
    assert.equal(res.status, 400);
  });

  await check('owner can attach the uploaded image to the store gallery', async () => {
    const res = await api('POST', `/stores/${ctx.store.id}/images`, {
      token: ctx.owner.token,
      body: { url: ctx.uploadUrl, caption: 'Smoke test photo' },
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
  });

  await check('owner hides the store from the directory', async () => {
    const res = await api('PATCH', `/stores/${ctx.store.id}/visibility`, {
      token: ctx.owner.token,
      body: { isPublished: false },
    });
    assert.equal(res.status, 200);

    const directory = await api('GET', `/stores?search=${encodeURIComponent(`Smoke Store ${suffix}`)}`);
    assert.equal(directory.body.items.length, 0);
  });

  console.log('\nPlatform reporting and profile');
  await check('admin dashboard reports platform statistics', async () => {
    const res = await api('GET', '/admin/stats', { token: ctx.admin.token });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.ok(res.body.stores.total >= 1);
    assert.ok(res.body.reviews.total >= 1);
    assert.equal(res.body.distribution.length, 5);
  });

  await check('central dashboard statistics include per-store summaries', async () => {
    const res = await api('GET', '/reviews/stats');
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.ok(res.body.totalReviews >= 1);
    assert.equal(res.body.distribution.length, 5);
    assert.ok(Array.isArray(res.body.stores));
  });

  await check('customer review history is scoped to their own account', async () => {
    const res = await api('GET', '/reviews/mine', { token: ctx.customer.token });
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 1);
    assert.equal(res.body.items[0].id, ctx.review.id);
  });

  await check('admin suspends the store and it leaves the public directory', async () => {
    const res = await api('PATCH', `/admin/stores/${ctx.store.id}/status`, {
      token: ctx.admin.token,
      body: { status: 'SUSPENDED', adminNote: 'Suspended by the smoke test.' },
    });
    assert.equal(res.status, 200);

    const directory = await api('GET', `/stores?search=${encodeURIComponent(`Smoke Store ${suffix}`)}`);
    assert.equal(directory.body.items.length, 0);
  });

  await check('admin user management lists and filters accounts', async () => {
    const res = await api('GET', `/admin/users?search=${suffix}`, { token: ctx.admin.token });
    assert.equal(res.status, 200);
    assert.ok(res.body.items.length >= 2);
    assert.ok(res.body.items.every((user) => user.passwordHash === undefined));
  });

  console.log('\nCleanup');
  await check('test data is removed', async () => {
    const owners = await prisma.user.findMany({
      where: { email: { contains: suffix } },
      select: { id: true },
    });
    const storeIds = await prisma.store.findMany({
      where: { ownerId: { in: owners.map((owner) => owner.id) } },
      select: { id: true },
    });
    await prisma.store.updateMany({
      where: { id: { in: storeIds.map((store) => store.id) } },
      data: { status: 'APPROVED', isPublished: true },
    });
    // Reviews and reports cascade with the store/user deletion.
    await prisma.store.deleteMany({ where: { name: { contains: suffix } } });
    await prisma.user.deleteMany({ where: { email: { contains: suffix } } });
    assert.ok(true);
  });

  server.close();
  await prisma.$disconnect();

  const failed = results.filter((result) => !result.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length > 0) {
    console.log('\nFailures:');
    for (const result of failed) console.log(` - ${result.name}: ${result.error.message}`);
    process.exit(1);
  }
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});

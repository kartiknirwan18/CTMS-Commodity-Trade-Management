import prisma from '../lib/prisma.js';
import { ApiError, asyncHandler } from '../utils/http.js';
import { hashPassword, signAuthToken, verifyPassword } from '../utils/auth.js';
import { toUserDto } from '../utils/serializers.js';
import { ROLES, USER_STATUS } from '../utils/constants.js';

const AUTH_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  avatarUrl: true,
  bio: true,
  city: true,
  lastLoginAt: true,
  createdAt: true,
};

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, city } = req.body;

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists', [
      { field: 'email', message: 'Email already registered' },
    ]);
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      role: role === ROLES.STORE_OWNER ? ROLES.STORE_OWNER : ROLES.CUSTOMER,
      city: city || null,
      status: USER_STATUS.ACTIVE,
    },
    select: AUTH_SELECT,
  });

  res.status(201).json({ token: signAuthToken(user), user: toUserDto(user) });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const account = await prisma.user.findUnique({ where: { email } });

  // Identical message for unknown email and wrong password: avoids account enumeration.
  if (!account || !(await verifyPassword(password, account.passwordHash))) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (account.status === USER_STATUS.SUSPENDED) {
    throw ApiError.forbidden('Your account has been suspended. Contact platform support.');
  }

  const user = await prisma.user.update({
    where: { id: account.id },
    data: { lastLoginAt: new Date() },
    select: AUTH_SELECT,
  });

  res.json({ token: signAuthToken(user), user: toUserDto(user) });
});

export const me = asyncHandler(async (req, res) => {
  const [reviewCount, storeCount] = await Promise.all([
    prisma.review.count({ where: { userId: req.user.id } }),
    prisma.store.count({ where: { ownerId: req.user.id } }),
  ]);

  res.json({ user: toUserDto(req.user), stats: { reviewCount, storeCount } });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, city, bio, avatarUrl } = req.body;

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(city !== undefined ? { city: city || null } : {}),
      ...(bio !== undefined ? { bio: bio || null } : {}),
      ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl || null } : {}),
    },
    select: AUTH_SELECT,
  });

  res.json({ user: toUserDto(user) });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const account = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!account || !(await verifyPassword(currentPassword, account.passwordHash))) {
    throw ApiError.badRequest('Your current password is incorrect');
  }

  await prisma.user.update({
    where: { id: req.user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  res.json({ message: 'Password updated successfully' });
});

/** Public list of store owners/customers is never exposed - handled by admin routes. */
export const sessionCapabilities = asyncHandler(async (req, res) => {
  const roles = Object.values(ROLES);
  res.json({ roles, user: toUserDto(req.user) });
});

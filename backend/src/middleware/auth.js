import prisma from '../lib/prisma.js';
import { ApiError, asyncHandler } from '../utils/http.js';
import { verifyAuthToken } from '../utils/auth.js';
import { ROLES, USER_STATUS } from '../utils/constants.js';

function extractBearerToken(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

async function resolveUserFromToken(token) {
  let payload;
  try {
    payload = verifyAuthToken(token);
  } catch {
    throw ApiError.unauthorized('Your session has expired, please sign in again');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
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
      updatedAt: true,
    },
  });

  if (!user) throw ApiError.unauthorized('Account no longer exists');
  if (user.status === USER_STATUS.SUSPENDED) {
    throw ApiError.forbidden('Your account has been suspended. Contact platform support.');
  }

  return user;
}

/** Attaches req.user when a valid token is present, otherwise continues anonymously. */
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = extractBearerToken(req);
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    req.user = await resolveUserFromToken(token);
  } catch {
    // A bad token on a public endpoint must not break browsing.
    req.user = null;
  }
  return next();
});

/** Requires a valid, active session. */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const token = extractBearerToken(req);
  if (!token) throw ApiError.unauthorized('Sign in to continue');
  req.user = await resolveUserFromToken(token);
  next();
});

/** Role based access control. Usage: authorize(ROLES.SUPER_ADMIN) */
export const authorize = (...allowedRoles) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized('Sign in to continue'));
  if (!allowedRoles.includes(req.user.role)) {
    return next(ApiError.forbidden('Your role does not allow this action'));
  }
  return next();
};

export const requireSuperAdmin = [authenticate, authorize(ROLES.SUPER_ADMIN)];
export const requireStoreOwner = [authenticate, authorize(ROLES.STORE_OWNER)];
export const requireCustomer = [authenticate, authorize(ROLES.CUSTOMER)];

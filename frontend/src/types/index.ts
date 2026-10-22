/**
 * Shared API types. These mirror the backend serializers in
 * backend/src/utils/serializers.js - keep both sides in sync.
 */

export type Role = 'SUPER_ADMIN' | 'STORE_OWNER' | 'CUSTOMER';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';
export type StoreStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type ReviewStatus = 'PUBLISHED' | 'HIDDEN' | 'REMOVED';
export type ReportStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED';
export type LayoutStyle = 'GRID' | 'LIST' | 'MAGAZINE';
export type ReviewDisplay = 'CARDS' | 'COMPACT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  avatarUrl: string | null;
  bio: string | null;
  city: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface Reviewer {
  id: string | null;
  name: string;
  avatarUrl: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description?: string | null;
  storeCount?: number;
}

export interface StoreTheme {
  id?: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  fontFamily: string;
  layout: LayoutStyle;
  reviewDisplay: ReviewDisplay;
  roundedCorners: boolean;
  showBanner: boolean;
}

export interface OpeningHour {
  day: string;
  open?: string;
  close?: string;
  closed?: boolean;
}

export interface StoreImage {
  id: string;
  url: string;
  caption: string | null;
  position?: number;
}

export interface StoreCard {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  addressLine: string;
  city: string;
  state: string | null;
  country: string;
  category: Category | null;
  avgRating: number;
  reviewCount: number;
  status: StoreStatus;
  isPublished: boolean;
  isFeatured: boolean;
  theme: StoreTheme | null;
  createdAt: string;
  updatedAt: string;
}

export interface RatingBreakdownRow {
  stars: number;
  count: number;
  percentage: number;
}

export interface StoreDetail extends StoreCard {
  ownerId: string;
  owner: { id: string; name: string; avatarUrl: string | null } | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  postalCode: string | null;
  openingHours: OpeningHour[];
  images: StoreImage[];
  adminNote: string | null;
  approvedAt: string | null;
  ratingBreakdown: RatingBreakdownRow[];
  viewer: {
    canManage: boolean;
    canReview: boolean;
    hasReviewed: boolean;
    viewerReviewId: string | null;
  };
}

export interface ReviewReply {
  id: string;
  comment: string;
  createdAt: string;
  updatedAt?: string;
  ownerId?: string;
  ownerName: string | null;
  canEdit?: boolean;
}

export interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  images: string[];
  status: ReviewStatus;
  isVerifiedVisit: boolean;
  helpfulCount: number;
  moderationNote: string | null;
  createdAt: string;
  updatedAt: string;
  user: Reviewer;
  store: {
    id: string;
    slug: string;
    name: string;
    logoUrl: string | null;
    bannerUrl: string | null;
    city: string | null;
    avgRating: number;
    reviewCount: number;
    category: Category | null;
    theme: StoreTheme | null;
  } | null;
  reply: ReviewReply | null;
  reportsCount: number;
  viewer: {
    isAuthor: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canReply: boolean;
    canReport: boolean;
    helpfulByMe: boolean;
  };
}

export interface StoreSummary {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  city: string | null;
  category: Category | null;
  avgRating: number;
  reviewCount: number;
  ratingBreakdown: RatingBreakdownRow[];
}

export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  reviewsWithReplies: number;
  replyRate: number;
  reviewsLast30Days: number;
  distribution: RatingBreakdownRow[];
  stores: StoreSummary[];
}

export interface LandingPayload {
  topRated: StoreCard[];
  featured: StoreCard[];
  newest: StoreCard[];
  mostReviewed: StoreCard[];
  categories: Category[];
  stats: { totalStores: number; totalReviews: number; platformAverageRating: number };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminStats {
  users: { total: number; customers: number; owners: number; suspended: number };
  stores: { PENDING: number; APPROVED: number; REJECTED: number; SUSPENDED: number; total: number };
  reviews: {
    total: number;
    published: number;
    averageRating: number;
    last30Days: number;
    openReports: number;
  };
  newStores30d: number;
  distribution: RatingBreakdownRow[];
  topStores: StoreCard[];
  latestStores: (StoreCard & { owner: { id: string; name: string; email: string } })[];
}

export interface AdminStoreRow extends StoreCard {
  owner: { id: string; name: string; email: string; status: UserStatus };
  adminNote: string | null;
  approvedAt: string | null;
}

export interface AdminUserRow extends User {
  counts: { reviews: number; stores: number };
}

export interface ReviewReport {
  id: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
  reporter: Reviewer;
  review: {
    id: string;
    rating: number;
    comment: string;
    status: ReviewStatus;
    createdAt: string;
    author: Reviewer;
    store: { id: string; name: string; slug: string } | null;
  } | null;
}

export interface StoreAnalytics {
  store: { id: string; name: string; slug: string; status: StoreStatus };
  totals: {
    averageRating: number;
    publishedReviews: number;
    totalReviews: number;
    replies: number;
    replyRate: number;
    last30Days: number;
    hiddenOrRemoved: number;
  };
  distribution: RatingBreakdownRow[];
  trend: { month: string; count: number; average: number }[];
}

export interface MyStore extends StoreCard {
  counts: { reviews: number; images: number };
}

export interface OwnerOverview {
  stores: StoreCard[];
  totals: {
    stores: number;
    approvedStores: number;
    pendingStores: number;
    reviews: number;
    averageRating: number;
    awaitingReply: number;
    openReports: number;
    publishedReviews: number;
  };
}

export interface StoreReviewInbox {
  items: Review[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: { total: number; average: number };
}

export interface ReviewFacets {
  stores: { id: string; name: string; slug: string; reviewCount: number; avgRating: number; logoUrl: string | null }[];
  categories: Category[];
  earliestReviewDate: string | null;
}

export interface ManagedStore {
  store: StoreDetail;
  summary: {
    reviewTotal: number;
    pendingReports: number;
    recentReviews: {
      id: string;
      rating: number;
      comment: string;
      createdAt: string;
      user: Reviewer;
      hasReply: boolean;
    }[];
  };
}

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface MessageResponse {
  message: string;
}

import { api, buildQuery, type FieldError } from './api';
import type {
  AdminStats,
  AdminStoreRow,
  AdminUserRow,
  Category,
  LandingPayload,
  ManagedStore,
  MessageResponse,
  MyStore,
  OwnerOverview,
  Paginated,
  Review,
  ReviewFacets,
  ReviewReport,
  ReviewStats,
  Role,
  StoreAnalytics,
  StoreCard,
  StoreDetail,
  StoreReviewInbox,
  User,
  UserStatus,
  StoreStatus,
  LayoutStyle,
  ReviewDisplay,
} from '../types';

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const authApi = {
  register: (payload: { name: string; email: string; password: string; role: Role; city?: string }) =>
    api.post<{ token: string; user: User }>('/auth/register', payload, { auth: false }),

  login: (payload: { email: string; password: string }) =>
    api.post<{ token: string; user: User }>('/auth/login', payload, { auth: false }),

  me: () => api.get<{ user: User; stats: { reviewCount: number; storeCount: number } }>('/auth/me'),

  updateProfile: (payload: { name?: string; city?: string; bio?: string; avatarUrl?: string }) =>
    api.patch<{ user: User }>('/auth/profile', payload),

  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    api.patch<MessageResponse>('/auth/password', payload),
};

// ---------------------------------------------------------------------------
// Stores
// ---------------------------------------------------------------------------

export interface StoreListParams {
  search?: string;
  category?: string;
  city?: string;
  minRating?: number;
  sort?: 'newest' | 'oldest' | 'rating' | 'reviews' | 'name';
  featured?: 'true' | 'false';
  status?: StoreStatus;
  page?: number;
  pageSize?: number;
}

export interface StoreFormPayload {
  name: string;
  tagline?: string;
  description: string;
  categoryId?: string;
  categoryName?: string;
  phone?: string;
  email?: string;
  website?: string;
  addressLine: string;
  city: string;
  state?: string;
  country?: string;
  postalCode?: string;
  logoUrl?: string;
  bannerUrl?: string;
  openingHours?: { day: string; open?: string; close?: string; closed?: boolean }[];
  gallery?: string[];
}

export const storesApi = {
  list: (params: StoreListParams = {}, options?: { auth?: boolean }) =>
    api.get<Paginated<StoreCard>>(`/stores${buildQuery(params)}`, options),

  landing: () => api.get<LandingPayload>('/stores/landing', { auth: false }),

  facets: () =>
    api.get<{ cities: string[]; categories: Category[] }>('/stores/facets', { auth: false }),

  categories: () => api.get<{ items: Category[] }>('/stores/categories', { auth: false }),

  bySlug: (slug: string) =>
    api.get<{ store: StoreDetail; reviewSummary: { total: number; average: number } }>(
      `/stores/${slug}`,
    ),

  mine: () => api.get<{ items: MyStore[]; total: number }>('/stores/mine'),

  mineById: (id: string) => api.get<ManagedStore>(`/stores/mine/${id}`),

  ownerOverview: () => api.get<OwnerOverview>('/stores/owner/overview'),

  create: (payload: StoreFormPayload) =>
    api.post<{ store: StoreDetail; message: string }>('/stores', payload),

  update: (id: string, payload: Partial<StoreFormPayload>) =>
    api.patch<{ store: StoreDetail; message: string }>(`/stores/${id}`, payload),

  updateTheme: (id: string, payload: Partial<Record<string, string | boolean>>) =>
    api.put<{ theme: StoreCard['theme']; message: string }>(`/stores/${id}/theme`, payload),

  setVisibility: (id: string, isPublished: boolean) =>
    api.patch<{ store: StoreCard; message: string }>(`/stores/${id}/visibility`, { isPublished }),

  remove: (id: string) => api.delete<MessageResponse>(`/stores/${id}`),

  addImage: (id: string, payload: { url: string; caption?: string }) =>
    api.post<{ image: { id: string; url: string; caption: string | null } }>(
      `/stores/${id}/images`,
      payload,
    ),

  removeImage: (id: string, imageId: string) =>
    api.delete<MessageResponse>(`/stores/${id}/images/${imageId}`),

  uploadGallery: (id: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    return api.upload<{ images: { id: string; url: string; caption: string | null }[]; message: string }>(
      `/stores/${id}/gallery-upload`,
      formData,
    );
  },

  analytics: (id: string) => api.get<StoreAnalytics>(`/stores/${id}/analytics`),

  reviews: (
    id: string,
    params: {
      page?: number;
      pageSize?: number;
      rating?: number;
      status?: string;
      replied?: 'true' | 'false';
      sort?: 'newest' | 'oldest' | 'highest' | 'lowest';
      search?: string;
    } = {},
  ) => api.get<StoreReviewInbox>(`/stores/${id}/reviews${buildQuery(params)}`),
};

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export interface ReviewListParams {
  search?: string;
  storeId?: string;
  storeSlug?: string;
  category?: string;
  rating?: number;
  dateFrom?: string;
  dateTo?: string;
  sort?: 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful';
  status?: string;
  withImages?: 'true' | 'false';
  page?: number;
  pageSize?: number;
}

export const reviewsApi = {
  list: (params: ReviewListParams = {}) => api.get<Paginated<Review>>(`/reviews${buildQuery(params)}`),

  stats: () => api.get<ReviewStats>('/reviews/stats', { auth: false }),

  facets: () => api.get<ReviewFacets>('/reviews/facets', { auth: false }),

  mine: (params: { page?: number; pageSize?: number } = {}) =>
    api.get<Paginated<Review>>(`/reviews/mine${buildQuery(params)}`),

  byId: (id: string) => api.get<{ review: Review }>(`/reviews/${id}`),

  create: (payload: { storeId: string; rating: number; title?: string; comment: string; images?: string[] }) =>
    api.post<{ review: Review; message: string }>('/reviews', payload),

  update: (id: string, payload: { rating?: number; title?: string; comment?: string; images?: string[] }) =>
    api.patch<{ review: Review; message: string }>(`/reviews/${id}`, payload),

  remove: (id: string) => api.delete<MessageResponse>(`/reviews/${id}`),

  toggleHelpful: (id: string) =>
    api.post<{ helpfulCount: number; voted: boolean }>(`/reviews/${id}/helpful`),

  report: (id: string, payload: { reason: string; details?: string }) =>
    api.post<{ report: { id: string; status: string }; message: string }>(`/reviews/${id}/report`, payload),

  reply: (id: string, comment: string) =>
    api.post<{ reply: Review['reply']; message: string }>(`/reviews/${id}/reply`, { comment }),

  updateReply: (replyId: string, comment: string) =>
    api.patch<{ reply: Review['reply']; message: string }>(`/reviews/replies/${replyId}`, { comment }),

  deleteReply: (replyId: string) => api.delete<MessageResponse>(`/reviews/replies/${replyId}`),
};

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------

export const uploadsApi = {
  image: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.upload<{ url: string; size: number; mimetype: string }>('/uploads', formData);
  },

  images: (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return api.upload<{ files: { url: string; size: number; mimetype: string }[] }>('/uploads/multiple', formData);
  },
};

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export const adminApi = {
  stats: () => api.get<AdminStats>('/admin/stats'),

  stores: (
    params: { status?: StoreStatus; search?: string; page?: number; pageSize?: number } = {},
  ) => api.get<Paginated<AdminStoreRow>>(`/admin/stores${buildQuery(params)}`),

  setStoreStatus: (id: string, status: StoreStatus, adminNote?: string) =>
    api.patch<{ store: StoreCard; message: string }>(`/admin/stores/${id}/status`, { status, adminNote }),

  setStoreFeatured: (id: string, isFeatured: boolean) =>
    api.patch<{ store: StoreCard; message: string }>(`/admin/stores/${id}/feature`, { isFeatured }),

  reviews: (
    params: { status?: string; search?: string; rating?: number; storeId?: string; page?: number; pageSize?: number } = {},
  ) => api.get<Paginated<Review>>(`/admin/reviews${buildQuery(params)}`),

  moderateReview: (id: string, status: string, moderationNote?: string) =>
    api.patch<{ review: Review; message: string }>(`/admin/reviews/${id}/status`, { status, moderationNote }),

  reports: (params: { status?: string; page?: number; pageSize?: number } = {}) =>
    api.get<Paginated<ReviewReport>>(`/admin/reports${buildQuery(params)}`),

  updateReport: (id: string, status: 'RESOLVED' | 'DISMISSED') =>
    api.patch<{ report: ReviewReport; message: string }>(`/admin/reports/${id}`, { status }),

  users: (
    params: { role?: Role; status?: UserStatus; search?: string; page?: number; pageSize?: number } = {},
  ) => api.get<Paginated<AdminUserRow>>(`/admin/users${buildQuery(params)}`),

  setUserStatus: (id: string, status: UserStatus) =>
    api.patch<{ user: User; message: string }>(`/admin/users/${id}/status`, { status }),

  setUserRole: (id: string, role: Role) =>
    api.patch<{ user: User; message: string }>(`/admin/users/${id}/role`, { role }),

  deleteUser: (id: string) => api.delete<MessageResponse>(`/admin/users/${id}`),

  createCategory: (payload: { name: string; description?: string; icon?: string }) =>
    api.post<{ category: Category }>('/admin/categories', payload),

  updateCategory: (id: string, payload: { name?: string; description?: string; icon?: string }) =>
    api.patch<{ category: Category }>(`/admin/categories/${id}`, payload),

  deleteCategory: (id: string) => api.delete<MessageResponse>(`/admin/categories/${id}`),
};

// ---------------------------------------------------------------------------
// Theme / layout option constants shared by the theme editor
// ---------------------------------------------------------------------------

export const THEME_PRESETS: {
  name: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
}[] = [
  {
    name: 'Ocean',
    primaryColor: '#0891b2',
    accentColor: '#22d3ee',
    backgroundColor: '#f8fafc',
    surfaceColor: '#ffffff',
    textColor: '#0f172a',
  },
  {
    name: 'Ember',
    primaryColor: '#b91c1c',
    accentColor: '#f97316',
    backgroundColor: '#fff7ed',
    surfaceColor: '#ffffff',
    textColor: '#1c1917',
  },
  {
    name: 'Forest',
    primaryColor: '#15803d',
    accentColor: '#84cc16',
    backgroundColor: '#f0fdf4',
    surfaceColor: '#ffffff',
    textColor: '#052e16',
  },
  {
    name: 'Violet',
    primaryColor: '#7c3aed',
    accentColor: '#22d3ee',
    backgroundColor: '#f5f3ff',
    surfaceColor: '#ffffff',
    textColor: '#111827',
  },
  {
    name: 'Espresso',
    primaryColor: '#78350f',
    accentColor: '#d97706',
    backgroundColor: '#fffbeb',
    surfaceColor: '#ffffff',
    textColor: '#1f2937',
  },
  {
    name: 'Graphite',
    primaryColor: '#1e293b',
    accentColor: '#facc15',
    backgroundColor: '#f8fafc',
    surfaceColor: '#ffffff',
    textColor: '#0b1220',
  },
];

export const LAYOUT_OPTIONS: { value: LayoutStyle; label: string; description: string }[] = [
  { value: 'GRID', label: 'Grid', description: 'Even product grid - best for groceries and retail' },
  { value: 'LIST', label: 'List', description: 'Wide rows with detail - best for services and electronics' },
  { value: 'MAGAZINE', label: 'Magazine', description: 'Large hero imagery - best for restaurants and fashion' },
];

export const REVIEW_DISPLAY_OPTIONS: { value: ReviewDisplay; label: string }[] = [
  { value: 'CARDS', label: 'Cards' },
  { value: 'COMPACT', label: 'Compact list' },
];

/** Field errors from an ApiError, keyed by field name. */
export function fieldErrorMap(errors: FieldError[]): Record<string, string> {
  return errors.reduce<Record<string, string>>((acc, error) => {
    if (!acc[error.field]) acc[error.field] = error.message;
    return acc;
  }, {});
}

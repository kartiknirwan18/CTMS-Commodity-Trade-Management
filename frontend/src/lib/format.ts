/** Formatting and display helpers shared across pages. */

export function formatDate(value: string | Date | null | undefined, withTime = false): string {
  if (!value) return '-';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const date = typeof value === 'string' ? new Date(value) : value;
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  return formatDate(date);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

export function truncate(text: string, max = 140): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}...`;
}

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  STORE_OWNER: 'Store Owner',
  CUSTOMER: 'Customer',
};

export const STORE_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  SUSPENDED: 'Suspended',
};

export const REVIEW_STATUS_LABELS: Record<string, string> = {
  PUBLISHED: 'Published',
  HIDDEN: 'Hidden',
  REMOVED: 'Removed',
};

export const REPORT_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  RESOLVED: 'Resolved',
  DISMISSED: 'Dismissed',
};

export const REPORT_REASON_LABELS: Record<string, string> = {
  SPAM: 'Spam or advertising',
  OFFENSIVE: 'Offensive language',
  FAKE_REVIEW: 'Looks like a fake review',
  IRRELEVANT: 'Not relevant to this store',
  CONFLICT_OF_INTEREST: 'Conflict of interest',
  OTHER: 'Something else',
};

export const REPORT_REASONS = Object.keys(REPORT_REASON_LABELS);

/** Tailwind classes for status pills, keyed by status value. */
export const STATUS_TONES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 ring-amber-200',
  APPROVED: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  REJECTED: 'bg-rose-100 text-rose-800 ring-rose-200',
  SUSPENDED: 'bg-slate-200 text-slate-700 ring-slate-300',
  PUBLISHED: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  HIDDEN: 'bg-amber-100 text-amber-800 ring-amber-200',
  REMOVED: 'bg-rose-100 text-rose-800 ring-rose-200',
  OPEN: 'bg-amber-100 text-amber-800 ring-amber-200',
  RESOLVED: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  DISMISSED: 'bg-slate-200 text-slate-700 ring-slate-300',
  ACTIVE: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
};

export function statusTone(status: string): string {
  return STATUS_TONES[status] ?? 'bg-slate-100 text-slate-700 ring-slate-200';
}

export const CATEGORY_ICONS: Record<string, string> = {
  utensils: '🍽️',
  shirt: '👕',
  cpu: '💻',
  'shopping-basket': '🧺',
  'heart-pulse': '💊',
  sparkles: '✨',
  sofa: '🛋️',
  'book-open': '📚',
  dumbbell: '🏋️',
  store: '🏬',
};

export function categoryIcon(icon: string | null | undefined): string {
  return CATEGORY_ICONS[icon ?? 'store'] ?? '🏬';
}

/** Deterministic gradient used as the banner/logo fallback. */
export function gradientFor(seed: string): string {
  const palettes = [
    'from-accent-500 to-navy-700',
    'from-navy-600 to-accent-400',
    'from-emerald-500 to-navy-700',
    'from-violet-500 to-navy-700',
    'from-amber-500 to-rose-500',
    'from-sky-500 to-indigo-700',
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 9973;
  return palettes[hash % palettes.length];
}

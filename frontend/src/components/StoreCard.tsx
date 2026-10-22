import { Link } from 'react-router-dom';
import { assetUrl } from '../lib/api';
import { categoryIcon, gradientFor, pluralise, truncate, STORE_STATUS_LABELS } from '../lib/format';
import { Badge, cn, statusToneName } from './ui';
import { StarRating } from './StarRating';
import type { StoreCard as StoreCardType } from '../types';

export function StoreLogo({
  name,
  logoUrl,
  size = 48,
  rounded = 'rounded-xl',
  className,
}: {
  name: string;
  logoUrl: string | null;
  size?: number;
  rounded?: string;
  className?: string;
}) {
  const src = assetUrl(logoUrl);
  if (src) {
    return (
      <img
        src={src}
        alt={`${name} logo`}
        style={{ height: size, width: size }}
        className={cn('shrink-0 object-cover', rounded, className)}
      />
    );
  }
  return (
    <span
      style={{ height: size, width: size, fontSize: Math.max(12, size * 0.38) }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center bg-gradient-to-br font-bold text-white',
        gradientFor(name),
        rounded,
        className,
      )}
      aria-hidden="true"
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

/** Store banner with a deterministic gradient fallback. */
export function StoreBanner({
  name,
  bannerUrl,
  className,
}: {
  name: string;
  bannerUrl: string | null;
  className?: string;
}) {
  const src = assetUrl(bannerUrl);
  if (src) {
    return <img src={src} alt={`${name} banner`} className={cn('h-full w-full object-cover', className)} />;
  }
  return (
    <div
      className={cn('flex h-full w-full items-center justify-center bg-gradient-to-br', gradientFor(name), className)}
      aria-hidden="true"
    >
      <span className="text-4xl font-bold text-white/35">{name.slice(0, 2).toUpperCase()}</span>
    </div>
  );
}

interface StoreCardProps {
  store: StoreCardType;
  /** Owners and admins see the moderation status pill on the card. */
  showStatus?: boolean;
  className?: string;
}

export function StoreCard({ store, showStatus = false, className }: StoreCardProps) {
  return (
    <article className={cn('panel group flex flex-col overflow-hidden transition-shadow hover:shadow-float', className)}>
      <Link to={`/stores/${store.slug}`} className="relative block h-36 overflow-hidden">
        <StoreBanner name={store.name} bannerUrl={store.bannerUrl} className="transition-transform duration-300 group-hover:scale-105" />
        {store.isFeatured && (
          <span className="absolute left-3 top-3 rounded-full bg-navy-900/85 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
            Featured
          </span>
        )}
        {showStatus && (
          <span className="absolute right-3 top-3">
            <Badge tone={statusToneName(store.status)}>{STORE_STATUS_LABELS[store.status] ?? store.status}</Badge>
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start gap-3">
          <StoreLogo name={store.name} logoUrl={store.logoUrl} size={44} className="-mt-9 ring-4 ring-white" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-navy-900">
              <Link to={`/stores/${store.slug}`} className="hover:text-accent-600">
                {store.name}
              </Link>
            </h3>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-500">
              <span aria-hidden="true">{categoryIcon(store.category?.icon)}</span>
              {store.category?.name ?? 'Uncategorised'}
              <span aria-hidden="true">·</span>
              {store.city}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <StarRating value={store.avgRating} showValue />
          <span className="text-slate-400">·</span>
          <span className="text-slate-500">{pluralise(store.reviewCount, 'review')}</span>
        </div>

        <p className="clamp-2 text-sm text-slate-600">
          {store.tagline || (store.description ? truncate(store.description, 130) : 'No description provided yet.')}
        </p>

        <div className="mt-auto pt-1">
          <Link
            to={`/stores/${store.slug}`}
            className="inline-flex text-sm font-semibold text-accent-600 hover:text-accent-700"
          >
            View storefront →
          </Link>
        </div>
      </div>
    </article>
  );
}

export default StoreCard;

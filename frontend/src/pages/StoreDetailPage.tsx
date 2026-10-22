import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { assetUrl } from '../lib/api';
import { reviewsApi, storesApi } from '../lib/endpoints';
import { useAsyncData } from '../hooks/useAsyncData';
import { categoryIcon, pluralise } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import {
  Alert,
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  LoadingBlock,
  Pagination,
  Select,
  Skeleton,
  Textarea,
  cn,
  useToast,
} from '../components/ui';
import { RatingBreakdown, StarPicker, StarRating } from '../components/StarRating';
import { ReviewCard } from '../components/ReviewCard';
import { StoreBanner, StoreLogo } from '../components/StoreCard';
import { RatingDonut } from '../components/charts';
import type { StoreTheme } from '../types';

const DEFAULT_THEME: StoreTheme = {
  primaryColor: '#0891b2',
  accentColor: '#22d3ee',
  backgroundColor: '#f8fafc',
  surfaceColor: '#ffffff',
  textColor: '#0f172a',
  fontFamily: 'Inter',
  layout: 'GRID',
  reviewDisplay: 'CARDS',
  roundedCorners: true,
  showBanner: true,
};

const REVIEW_SORTS = [
  { value: 'newest', label: 'Most recent' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'highest', label: 'Highest rated' },
  { value: 'lowest', label: 'Lowest rated' },
  { value: 'helpful', label: 'Most helpful' },
];

function ReviewComposer({ storeId, onDone }: { storeId: string; onDone: () => void }) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await reviewsApi.create({ storeId, rating, title: title || undefined, comment });
      toast.show('Thanks! Your review is now live.');
      setTitle('');
      setComment('');
      setRating(5);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit your review');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <Alert tone="error">{error}</Alert>}
      <div>
        <p className="field-label">
          Your rating <span className="text-rose-500">*</span>
        </p>
        <StarPicker value={rating} onChange={setRating} disabled={busy} />
      </div>
      <Textarea
        label="Headline (optional)"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        rows={1}
        maxLength={120}
        placeholder="Sum up your experience in a few words"
        className="min-h-0"
      />
      <Textarea
        label="Your review"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        rows={5}
        required
        minLength={10}
        maxLength={2000}
        placeholder="What was good, what could be better? At least 10 characters."
        hint={`${comment.length}/2000 characters`}
      />
      <Button type="submit" loading={busy}>
        Publish review
      </Button>
    </form>
  );
}

export function StoreDetailPage() {
  const { slug = '' } = useParams();
  const { isAuthenticated, user } = useAuth();

  const [sort, setSort] = useState('newest');
  const [ratingFilter, setRatingFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, loading, error, reload } = useAsyncData(() => storesApi.bySlug(slug), [slug]);
  const reviewParams = useMemo(
    () => ({
      storeSlug: slug,
      sort: sort as 'newest' | 'highest' | 'lowest',
      rating: ratingFilter ? Number(ratingFilter) : undefined,
      page,
      pageSize: 5,
    }),
    [slug, sort, ratingFilter, page],
  );
  const { data: reviews, loading: reviewsLoading, reload: reloadReviews } = useAsyncData(
    () => reviewsApi.list(reviewParams),
    [JSON.stringify(reviewParams)],
    { enabled: Boolean(slug), keepPrevious: true },
  );

  if (loading) return <LoadingBlock label="Loading storefront..." />;

  if (error || !data) {
    return (
      <div className="page-shell py-16">
        <EmptyState
          icon="🏪"
          title="Store not available"
          description={error ?? 'This store does not exist or has not been approved yet.'}
          action={<ButtonLink to="/stores">Browse the directory</ButtonLink>}
        />
      </div>
    );
  }

  const { store } = data;
  const theme = store.theme ?? DEFAULT_THEME;
  const radius = theme.roundedCorners ? '1rem' : '0.25rem';
  const surfaceStyle = {
    backgroundColor: theme.backgroundColor,
    color: theme.textColor,
    fontFamily: theme.fontFamily,
  };

  const infoRows = [
    { label: 'Address', value: [store.addressLine, store.city, store.state, store.postalCode, store.country].filter(Boolean).join(', ') },
    { label: 'Phone', value: store.phone, href: store.phone ? `tel:${store.phone}` : undefined },
    { label: 'Email', value: store.email, href: store.email ? `mailto:${store.email}` : undefined },
    { label: 'Website', value: store.website, href: store.website ?? undefined },
  ].filter((row) => row.value);

  return (
    <div>
      {/* ---------------------------------------------------------- Storefront */}
      <section style={surfaceStyle}>
        <div className="page-shell py-8 sm:py-10">
          {theme.showBanner && (
            <div className="relative h-40 overflow-hidden sm:h-56" style={{ borderRadius: radius }}>
              <StoreBanner name={store.name} bannerUrl={store.bannerUrl} />
              {store.status !== 'APPROVED' && (
                <span className="absolute right-3 top-3">
                  <Badge tone={store.status === 'PENDING' ? 'warning' : 'danger'}>
                    {store.status === 'PENDING' ? 'Awaiting approval' : store.status}
                  </Badge>
                </span>
              )}
            </div>
          )}

          <div className={cn('flex flex-col gap-5 sm:flex-row sm:items-end', theme.showBanner && '-mt-10')}>
            <div
              className="shrink-0 p-1"
              style={{ backgroundColor: theme.surfaceColor, borderRadius: radius }}
            >
              <StoreLogo name={store.name} logoUrl={store.logoUrl} size={88} rounded="" className="rounded-xl" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{store.name}</h1>
              {store.tagline && <p className="mt-1 text-sm opacity-80">{store.tagline}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: theme.accentColor, color: '#0b1220' }}>
                  <span aria-hidden="true">{categoryIcon(store.category?.icon)}</span>
                  {store.category?.name ?? 'Uncategorised'}
                </span>
                <span className="inline-flex items-center gap-2">
                  <StarRating value={store.avgRating} showValue />
                  <span className="opacity-70">({pluralise(store.reviewCount, 'review')})</span>
                </span>
                <span className="opacity-80">{store.city}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {store.viewer.canManage && (
                <ButtonLink
                  to={`/owner/stores/${store.id}`}
                  size="sm"
                  className="text-white"
                  variant="primary"
                >
                  Manage store
                </ButtonLink>
              )}
            </div>
          </div>

          {store.description && (
            <p className="mt-6 max-w-3xl whitespace-pre-line text-sm leading-relaxed opacity-90">
              {store.description}
            </p>
          )}

          {/* Gallery */}
          {store.images.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide opacity-70">Gallery</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {store.images.map((image) => (
                  <figure
                    key={image.id}
                    className="overflow-hidden"
                    style={{ borderRadius: radius, backgroundColor: theme.surfaceColor }}
                  >
                    <img src={assetUrl(image.url)} alt={image.caption ?? store.name} className="h-36 w-full object-cover" />
                    {image.caption && <figcaption className="px-3 py-2 text-xs opacity-70">{image.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            </div>
          )}

          {/* Info + hours */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {infoRows.length > 0 && (
              <div className="p-5" style={{ backgroundColor: theme.surfaceColor, borderRadius: radius }}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide opacity-70">Store information</h2>
                <dl className="space-y-2 text-sm">
                  {infoRows.map((row) => (
                    <div key={row.label} className="flex gap-3">
                      <dt className="w-20 shrink-0 opacity-60">{row.label}</dt>
                      <dd className="min-w-0 break-words">
                        {row.href ? (
                          <a href={row.href} className="hover:underline" style={{ color: theme.primaryColor }}>
                            {row.value}
                          </a>
                        ) : (
                          row.value
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {store.openingHours.length > 0 && (
              <div className="p-5" style={{ backgroundColor: theme.surfaceColor, borderRadius: radius }}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide opacity-70">Opening hours</h2>
                <dl className="space-y-2 text-sm">
                  {store.openingHours.map((entry) => (
                    <div key={entry.day} className="flex justify-between gap-3">
                      <dt className="opacity-60">{entry.day}</dt>
                      <dd className="tabular-nums">{entry.closed ? 'Closed' : `${entry.open ?? '-'} - ${entry.close ?? '-'}`}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- Reviews zone */}
      <div className="page-shell py-10">
        <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
          {/* Summary */}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <Card>
              <h2 className="text-lg font-semibold text-navy-900">Rating summary</h2>
              <div className="mt-4">
                <RatingDonut average={store.avgRating} total={store.reviewCount} />
              </div>
              <div className="mt-5">
                <RatingBreakdown rows={store.ratingBreakdown} total={store.reviewCount} />
              </div>
              <p className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
                Verified-visit badges are only shown when a visit is genuinely verifiable - MultiStore never fakes them.
              </p>
            </Card>

            {store.viewer.canManage && (
              <Card>
                <h2 className="text-sm font-semibold text-navy-900">Owner tools</h2>
                <div className="mt-3 flex flex-col gap-2">
                  <ButtonLink to={`/owner/stores/${store.id}?tab=reviews`} variant="outline" size="sm">
                    Review inbox
                  </ButtonLink>
                  <ButtonLink to={`/owner/stores/${store.id}?tab=analytics`} variant="outline" size="sm">
                    Analytics
                  </ButtonLink>
                  <ButtonLink to={`/owner/stores/${store.id}?tab=theme`} variant="outline" size="sm">
                    Storefront theme
                  </ButtonLink>
                </div>
              </Card>
            )}
          </aside>

          {/* Reviews */}
          <section className="space-y-6">
            {/* Composer */}
            {store.viewer.canReview && (
              <Card>
                <h2 className="text-lg font-semibold text-navy-900">Write a review</h2>
                <p className="mb-4 mt-1 text-sm text-slate-600">
                  Share your experience to help other customers. You can edit or delete your review at any time.
                </p>
                <ReviewComposer
                  storeId={store.id}
                  onDone={() => {
                    reloadReviews();
                    reload();
                  }}
                />
              </Card>
            )}

            {!isAuthenticated && (
              <Alert tone="info" title="Sign in to review this store">
                Only registered customers can leave a review.{' '}
                <Link to="/login" state={{ from: `/stores/${store.slug}` }} className="font-semibold underline">
                  Sign in
                </Link>{' '}
                or{' '}
                <Link to="/register" className="font-semibold underline">
                  create an account
                </Link>
                .
              </Alert>
            )}

            {isAuthenticated && store.viewer.hasReviewed && !store.viewer.canReview && (
              <Alert tone="success" title="You have already reviewed this store">
                Scroll to your review below to edit it, or visit{' '}
                <Link to="/account" className="font-semibold underline">
                  your review history
                </Link>
                .
              </Alert>
            )}

            {isAuthenticated && user && store.ownerId === user.id && (
              <Alert tone="warning" title="This is your store">
                Store owners cannot review their own store.
              </Alert>
            )}

            {/* List header */}
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-navy-900">
                  Customer reviews {reviews ? `(${reviews.total})` : ''}
                </h2>
                <p className="text-sm text-slate-600">Sorted and filtered in real time from the database.</p>
              </div>
              <div className="flex gap-2">
                <Select
                  value={ratingFilter}
                  onChange={(event) => {
                    setRatingFilter(event.target.value);
                    setPage(1);
                  }}
                  options={[
                    { value: '', label: 'All ratings' },
                    ...[5, 4, 3, 2, 1].map((star) => ({ value: String(star), label: `${star} stars` })),
                  ]}
                />
                <Select
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value);
                    setPage(1);
                  }}
                  options={REVIEW_SORTS}
                />
              </div>
            </div>

            {reviewsLoading && !reviews ? (
              <div className="space-y-4">
                {[0, 1].map((index) => (
                  <div key={index} className="panel space-y-3 p-5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                ))}
              </div>
            ) : reviews?.items.length ? (
              <>
                <div className={cn('space-y-4', reviewsLoading && 'opacity-60')}>
                  {reviews.items.map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      onChanged={() => {
                        reloadReviews();
                        reload();
                      }}
                    />
                  ))}
                </div>
                <Pagination
                  page={reviews.page}
                  totalPages={reviews.totalPages}
                  total={reviews.total}
                  onChange={(next) => {
                    setPage(next);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </>
            ) : (
              <EmptyState
                icon="💬"
                title="No reviews match this filter"
                description="Be the first to share your experience with this store."
              />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default StoreDetailPage;

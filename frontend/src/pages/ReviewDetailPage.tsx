import { Link, useParams } from 'react-router-dom';
import { reviewsApi, storesApi } from '../lib/endpoints';
import { useAsyncData } from '../hooks/useAsyncData';
import { categoryIcon, formatDate, pluralise } from '../lib/format';
import { ButtonLink, Card, EmptyState, LoadingBlock } from '../components/ui';
import { ReviewCard } from '../components/ReviewCard';
import { StarRating } from '../components/StarRating';
import { StoreLogo } from '../components/StoreCard';

export function ReviewDetailPage() {
  const { id = '' } = useParams();

  const { data, loading, error, reload } = useAsyncData(() => reviewsApi.byId(id), [id]);
  const storeSlug = data?.review.store?.slug;

  const { data: siblings } = useAsyncData(
    () => reviewsApi.list({ storeSlug, sort: 'newest', pageSize: 4 }),
    [storeSlug ?? ''],
    { enabled: Boolean(storeSlug) },
  );

  const { data: storeData } = useAsyncData(
    () => storesApi.bySlug(storeSlug as string),
    [storeSlug ?? ''],
    { enabled: Boolean(storeSlug) },
  );

  if (loading) return <LoadingBlock label="Loading review..." />;

  if (error || !data) {
    return (
      <div className="page-shell py-16">
        <EmptyState
          icon="💬"
          title="Review not available"
          description={error ?? 'This review may have been removed or is not public.'}
          action={<ButtonLink to="/reviews">Back to the review dashboard</ButtonLink>}
        />
      </div>
    );
  }

  const { review } = data;
  const others = (siblings?.items ?? []).filter((item) => item.id !== review.id);

  return (
    <div className="page-shell py-8 sm:py-12">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link to="/reviews" className="hover:text-accent-600">
          Review dashboard
        </Link>
        <span aria-hidden="true">/</span>
        {review.store && (
          <>
            <Link to={`/stores/${review.store.slug}`} className="hover:text-accent-600">
              {review.store.name}
            </Link>
            <span aria-hidden="true">/</span>
          </>
        )}
        <span className="text-navy-800">Review by {review.user.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <ReviewCard review={review} onChanged={reload} />

          <section>
            <h2 className="mb-4 text-lg font-semibold text-navy-900">
              More reviews for {review.store?.name ?? 'this store'}
            </h2>
            {others.length ? (
              <div className="space-y-4">
                {others.map((item) => (
                  <ReviewCard key={item.id} review={item} clampComment onChanged={reload} />
                ))}
              </div>
            ) : (
              <EmptyState icon="🗒️" title="No other reviews yet" />
            )}
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {review.store && (
            <Card>
              <div className="flex items-center gap-3">
                <StoreLogo name={review.store.name} logoUrl={review.store.logoUrl} size={48} />
                <div className="min-w-0">
                  <Link
                    to={`/stores/${review.store.slug}`}
                    className="block truncate font-semibold text-navy-900 hover:text-accent-600"
                  >
                    {review.store.name}
                  </Link>
                  <p className="truncate text-xs text-slate-500">
                    <span aria-hidden="true">{categoryIcon(review.store.category?.icon)}</span>{' '}
                    {review.store.category?.name ?? 'Uncategorised'}
                    {review.store.city ? ` · ${review.store.city}` : ''}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <StarRating value={review.store.avgRating} showValue />
                <span className="text-slate-500">{pluralise(review.store.reviewCount, 'review')}</span>
              </div>
              <ButtonLink to={`/stores/${review.store.slug}`} variant="outline" size="sm" className="mt-4 w-full">
                Visit storefront
              </ButtonLink>
            </Card>
          )}

          <Card>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Review details</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Published</dt>
                <dd className="text-right font-medium text-navy-800">{formatDate(review.createdAt, true)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Last updated</dt>
                <dd className="text-right font-medium text-navy-800">{formatDate(review.updatedAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Helpful votes</dt>
                <dd className="text-right font-medium tabular-nums text-navy-800">{review.helpfulCount}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Verified visit</dt>
                <dd className="text-right font-medium text-navy-800">{review.isVerifiedVisit ? 'Yes' : 'Not verified'}</dd>
              </div>
              {review.title && (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Headline</dt>
                  <dd className="text-right font-medium text-navy-800">{review.title}</dd>
                </div>
              )}
            </dl>
          </Card>

          {storeData && (
            <Card>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Store rating</h2>
              <p className="mt-3 text-3xl font-bold tabular-nums text-navy-900">
                {storeData.store.avgRating.toFixed(1)}
                <span className="ml-1 text-sm font-medium text-slate-500">/ 5</span>
              </p>
              <p className="text-sm text-slate-500">
                Based on {pluralise(storeData.store.reviewCount, 'published review')}
              </p>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

export default ReviewDetailPage;

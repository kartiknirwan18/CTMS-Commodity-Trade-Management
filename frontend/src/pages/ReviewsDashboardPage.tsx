import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { reviewsApi, type ReviewListParams } from '../lib/endpoints';
import { useAsyncData, useDebouncedValue } from '../hooks/useAsyncData';
import { categoryIcon, pluralise } from '../lib/format';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Input,
  Pagination,
  Select,
  Skeleton,
  StatCard,
  Tabs,
  cn,
} from '../components/ui';
import { RatingBreakdown, StarRating } from '../components/StarRating';
import { ReviewCard } from '../components/ReviewCard';
import { BarList, RatingDonut } from '../components/charts';
import { StoreLogo } from '../components/StoreCard';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'highest', label: 'Highest rated' },
  { value: 'lowest', label: 'Lowest rated' },
  { value: 'helpful', label: 'Most helpful' },
];

export function ReviewsDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('search') ?? '';
  const storeId = searchParams.get('storeId') ?? '';
  const category = searchParams.get('category') ?? '';
  const rating = searchParams.get('rating') ?? '';
  const dateFrom = searchParams.get('dateFrom') ?? '';
  const dateTo = searchParams.get('dateTo') ?? '';
  const sort = searchParams.get('sort') ?? 'newest';
  const page = Number(searchParams.get('page') ?? '1') || 1;

  const [searchDraft, setSearchDraft] = useState(search);
  const debouncedSearch = useDebouncedValue(searchDraft, 350);
  const [showStores, setShowStores] = useState<'reviews' | 'stores'>('reviews');

  useEffect(() => setSearchDraft(search), [search]);

  const updateParams = (changes: Record<string, string | number | undefined>, resetPage = true) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => {
      if (value === undefined || value === '') next.delete(key);
      else next.set(key, String(value));
    });
    if (resetPage) next.delete('page');
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (debouncedSearch !== search) updateParams({ search: debouncedSearch || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const params = useMemo<ReviewListParams>(
    () => ({
      search: search || undefined,
      storeId: storeId || undefined,
      category: category || undefined,
      rating: rating ? Number(rating) : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      sort: sort as ReviewListParams['sort'],
      page,
      pageSize: 8,
    }),
    [search, storeId, category, rating, dateFrom, dateTo, sort, page],
  );

  const { data: stats } = useAsyncData(() => reviewsApi.stats(), []);
  const { data: facets } = useAsyncData(() => reviewsApi.facets(), []);
  const { data, loading, error, reload } = useAsyncData(
    () => reviewsApi.list(params),
    [JSON.stringify(params)],
    { keepPrevious: true },
  );

  const activeFilters = [
    search && { key: 'search', label: `"${search}"` },
    storeId && { key: 'storeId', label: facets?.stores.find((store) => store.id === storeId)?.name ?? 'Store' },
    category && { key: 'category', label: facets?.categories.find((entry) => entry.slug === category)?.name ?? category },
    rating && { key: 'rating', label: `${rating} stars` },
    dateFrom && { key: 'dateFrom', label: `From ${dateFrom}` },
    dateTo && { key: 'dateTo', label: `Until ${dateTo}` },
  ].filter(Boolean) as { key: string; label: string }[];

  const storeOptions = useMemo(
    () =>
      (facets?.stores ?? []).map((store) => ({
        value: store.id,
        label: `${store.name} (${store.reviewCount})`,
      })),
    [facets],
  );

  return (
    <div className="page-shell py-8 sm:py-12">
      <header className="mb-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-700 ring-1 ring-inset ring-accent-200">
              Central review dashboard
            </span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
              Every review across every store
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              A single, database-backed feed of customer reviews from all approved MultiStore storefronts. Search,
              filter and sort to see what customers really think.
            </p>
          </div>
        </div>
      </header>

      {/* Platform stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total reviews" value={stats?.totalReviews ?? '—'} hint="All approved stores" icon="💬" />
        <StatCard
          label="Platform average"
          value={stats ? stats.averageRating.toFixed(2) : '—'}
          hint="Weighted across stores"
          icon="⭐"
          tone="warning"
        />
        <StatCard label="Last 30 days" value={stats?.reviewsLast30Days ?? '—'} hint="New reviews" icon="📈" tone="accent" />
        <StatCard
          label="Owner replies"
          value={stats ? `${Math.round(stats.replyRate)}%` : '—'}
          hint={stats ? `${stats.reviewsWithReplies} reviews answered` : undefined}
          icon="↩️"
          tone="success"
        />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Rating distribution</h2>
            <p className="text-xs text-slate-500">Across all published reviews</p>
          </div>
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <RatingDonut average={stats?.averageRating ?? 0} total={stats?.totalReviews ?? 0} />
            <RatingBreakdown rows={stats?.distribution ?? []} total={stats?.totalReviews ?? 0} />
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Most reviewed stores</h2>
          <BarList
            className="mt-4"
            items={(stats?.stores ?? [])
              .slice()
              .sort((a, b) => b.reviewCount - a.reviewCount)
              .slice(0, 6)
              .map((store) => ({
                label: store.name,
                value: store.reviewCount,
                hint: `${pluralise(store.reviewCount, 'review')} · ${store.avgRating.toFixed(1)}★`,
              }))}
          />
        </Card>
      </div>

      <Tabs
        className="mb-6"
        active={showStores}
        onChange={(id) => setShowStores(id as 'reviews' | 'stores')}
        tabs={[
          { id: 'reviews', label: 'Reviews feed', count: stats?.totalReviews },
          { id: 'stores', label: 'Store summaries', count: stats?.stores.length },
        ]}
      />

      {showStores === 'stores' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(stats?.stores ?? []).map((store) => (
            <Card key={store.id} className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <StoreLogo name={store.name} logoUrl={store.logoUrl} size={44} />
                <div className="min-w-0 flex-1">
                  <Link to={`/stores/${store.slug}`} className="block truncate font-semibold text-navy-900 hover:text-accent-600">
                    {store.name}
                  </Link>
                  <p className="truncate text-xs text-slate-500">
                    <span aria-hidden="true">{categoryIcon(store.category?.icon)}</span> {store.category?.name ?? 'Uncategorised'}
                    {store.city ? ` · ${store.city}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <StarRating value={store.avgRating} showValue />
                <span className="text-slate-500">{pluralise(store.reviewCount, 'review')}</span>
              </div>
              <RatingBreakdown rows={store.ratingBreakdown} total={store.reviewCount} />
              <div className="mt-auto flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    updateParams({ storeId: store.id });
                    setShowStores('reviews');
                  }}
                >
                  View reviews
                </Button>
                <Link
                  to={`/stores/${store.slug}`}
                  className="inline-flex h-9 items-center px-2 text-sm font-medium text-accent-600 hover:underline"
                >
                  Storefront →
                </Link>
              </div>
            </Card>
          ))}
          {!stats?.stores.length && (
            <EmptyState icon="🏬" title="No store summaries yet" description="Reviews will populate this view." />
          )}
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
          {/* Filters */}
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Card className="space-y-4">
              <h2 className="text-sm font-semibold text-navy-900">Filter reviews</h2>
              <Input
                label="Search"
                type="search"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Store name or review text"
              />
              <Select
                label="Store"
                value={storeId}
                onChange={(event) => updateParams({ storeId: event.target.value || undefined })}
                options={[{ value: '', label: 'All stores' }, ...storeOptions]}
              />
              <Select
                label="Category"
                value={category}
                onChange={(event) => updateParams({ category: event.target.value || undefined, storeId: undefined })}
                options={[
                  { value: '', label: 'All categories' },
                  ...(facets?.categories ?? []).map((entry) => ({ value: entry.slug, label: entry.name })),
                ]}
              />
              <Select
                label="Rating"
                value={rating}
                onChange={(event) => updateParams({ rating: event.target.value || undefined })}
                options={[
                  { value: '', label: 'Any rating' },
                  ...[5, 4, 3, 2, 1].map((star) => ({ value: String(star), label: `${star} stars only` })),
                ]}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="From"
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  min={facets?.earliestReviewDate?.slice(0, 10)}
                  onChange={(event) => updateParams({ dateFrom: event.target.value || undefined })}
                />
                <Input
                  label="To"
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(event) => updateParams({ dateTo: event.target.value || undefined })}
                />
              </div>
              <Select
                label="Sort by"
                value={sort}
                onChange={(event) => updateParams({ sort: event.target.value }, false)}
                options={SORT_OPTIONS}
              />
            </Card>

            {activeFilters.length > 0 && (
              <Card className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Active filters</p>
                <div className="flex flex-wrap gap-2">
                  {activeFilters.map((filter) => (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() => updateParams({ [filter.key]: undefined })}
                      className="inline-flex items-center gap-1.5 rounded-full bg-navy-50 px-2.5 py-1 text-xs font-medium text-navy-800 hover:bg-navy-100"
                    >
                      {filter.label}
                      <span aria-hidden="true">✕</span>
                    </button>
                  ))}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSearchParams({}, { replace: true })}>
                  Clear all
                </Button>
              </Card>
            )}
          </aside>

          {/* Feed */}
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600">
                {loading && !data ? 'Loading reviews...' : `${data?.total ?? 0} review${data?.total === 1 ? '' : 's'} matched`}
              </p>
              <Select
                className="sm:hidden"
                value={sort}
                onChange={(event) => updateParams({ sort: event.target.value }, false)}
                options={SORT_OPTIONS}
              />
            </div>

            {error && <Alert tone="error" className="mb-6">{error}</Alert>}

            {loading && !data ? (
              <div className="space-y-4">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="panel space-y-3 p-6">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                ))}
              </div>
            ) : data?.items.length ? (
              <>
                <div className={cn('space-y-4', loading && 'opacity-60')}>
                  {data.items.map((review) => (
                    <ReviewCard key={review.id} review={review} showStore clampComment onChanged={reload} />
                  ))}
                </div>
                <Pagination
                  className="mt-8"
                  page={data.page}
                  totalPages={data.totalPages}
                  total={data.total}
                  onChange={(next) => {
                    updateParams({ page: next }, false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </>
            ) : (
              <EmptyState
                icon="🔍"
                title="No reviews match your filters"
                description="Try a different store, rating or date range."
                action={
                  <Button variant="outline" onClick={() => setSearchParams({}, { replace: true })}>
                    Clear filters
                  </Button>
                }
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default ReviewsDashboardPage;

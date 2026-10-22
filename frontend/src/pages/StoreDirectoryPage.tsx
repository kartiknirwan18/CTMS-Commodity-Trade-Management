import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { storesApi, type StoreListParams } from '../lib/endpoints';
import { useAsyncData, useDebouncedValue } from '../hooks/useAsyncData';
import { Button, Card, EmptyState, Input, Pagination, Select, SkeletonGrid, cn } from '../components/ui';
import { StoreCard } from '../components/StoreCard';

const SORT_OPTIONS = [
  { value: 'rating', label: 'Highest rated' },
  { value: 'reviews', label: 'Most reviewed' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'name', label: 'Name (A-Z)' },
];

const MIN_RATING_OPTIONS = [
  { value: '', label: 'Any rating' },
  { value: '3', label: '3★ and up' },
  { value: '4', label: '4★ and up' },
  { value: '4.5', label: '4.5★ and up' },
];

export function StoreDirectoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('search') ?? '';
  const category = searchParams.get('category') ?? '';
  const city = searchParams.get('city') ?? '';
  const minRating = searchParams.get('minRating') ?? '';
  const sort = searchParams.get('sort') ?? 'rating';
  const page = Number(searchParams.get('page') ?? '1') || 1;

  const [searchDraft, setSearchDraft] = useState(search);
  const debouncedSearch = useDebouncedValue(searchDraft, 350);

  // Keep the debounced search box in sync with the URL (e.g. back button).
  useEffect(() => setSearchDraft(search), [search]);

  const updateParams = (changes: Record<string, string | number | undefined>, resetPage = true) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => {
      if (value === undefined || value === '' || value === null) next.delete(key);
      else next.set(key, String(value));
    });
    if (resetPage) next.delete('page');
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (debouncedSearch !== search) updateParams({ search: debouncedSearch || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const params = useMemo<StoreListParams>(
    () => ({
      search: search || undefined,
      category: category || undefined,
      city: city || undefined,
      minRating: minRating ? Number(minRating) : undefined,
      sort: sort as StoreListParams['sort'],
      page,
      pageSize: 12,
    }),
    [search, category, city, minRating, sort, page],
  );

  const { data: facets } = useAsyncData(() => storesApi.facets(), []);
  const { data, loading, error } = useAsyncData(() => storesApi.list(params, { auth: false }), [JSON.stringify(params)], {
    keepPrevious: true,
  });

  const activeFilters = [
    search && { key: 'search', label: `"${search}"` },
    category && { key: 'category', label: facets?.categories.find((entry) => entry.slug === category)?.name ?? category },
    city && { key: 'city', label: city },
    minRating && { key: 'minRating', label: `${minRating}★ and up` },
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <div className="page-shell py-8 sm:py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">Store directory</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Browse every approved store on MultiStore. Filter by category, city and rating, then read real customer
          reviews before you visit.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        {/* Filters */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="space-y-5">
            <div>
              <h2 className="text-sm font-semibold text-navy-900">Filters</h2>
              <p className="mt-0.5 text-xs text-slate-500">Refine the directory.</p>
            </div>

            <Input
              label="Search"
              type="search"
              placeholder="Store name or keyword"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
            />

            <Select
              label="Category"
              value={category}
              onChange={(event) => updateParams({ category: event.target.value || undefined })}
              options={[
                { value: '', label: 'All categories' },
                ...(facets?.categories ?? []).map((entry) => ({
                  value: entry.slug,
                  label: `${entry.name}${entry.storeCount !== undefined ? ` (${entry.storeCount})` : ''}`,
                })),
              ]}
            />

            <Select
              label="City"
              value={city}
              onChange={(event) => updateParams({ city: event.target.value || undefined })}
              options={[
                { value: '', label: 'All cities' },
                ...(facets?.cities ?? []).map((entry) => ({ value: entry, label: entry })),
              ]}
            />

            <Select
              label="Minimum rating"
              value={minRating}
              onChange={(event) => updateParams({ minRating: event.target.value || undefined })}
              options={MIN_RATING_OPTIONS}
            />

            <Select
              label="Sort by"
              value={sort}
              onChange={(event) => updateParams({ sort: event.target.value }, false)}
              options={SORT_OPTIONS}
            />

            {activeFilters.length > 0 && (
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Active</p>
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
                  Clear all filters
                </Button>
              </div>
            )}
          </Card>
        </aside>

        {/* Results */}
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              {loading && !data ? 'Loading stores...' : `${data?.total ?? 0} store${data?.total === 1 ? '' : 's'} found`}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:hidden">
              <Select
                value={category}
                onChange={(event) => updateParams({ category: event.target.value || undefined })}
                options={[
                  { value: '', label: 'All categories' },
                  ...(facets?.categories ?? []).map((entry) => ({ value: entry.slug, label: entry.name })),
                ]}
              />
              <Select
                value={sort}
                onChange={(event) => updateParams({ sort: event.target.value }, false)}
                options={SORT_OPTIONS}
              />
            </div>
          </div>

          {error && (
            <EmptyState icon="⚠️" title="Could not load stores" description={error} className="mb-6" />
          )}

          {loading && !data ? (
            <SkeletonGrid count={6} />
          ) : data?.items.length ? (
            <>
              <div className={cn('grid gap-5 sm:grid-cols-2 xl:grid-cols-3', loading && 'opacity-60')}>
                {data.items.map((store) => (
                  <StoreCard key={store.id} store={store} />
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
              title="No stores match those filters"
              description="Try widening your search, or clear the filters to see every approved store."
              action={
                <Button variant="outline" onClick={() => setSearchParams({}, { replace: true })}>
                  Clear filters
                </Button>
              }
            />
          )}
        </section>
      </div>
    </div>
  );
}

export default StoreDirectoryPage;

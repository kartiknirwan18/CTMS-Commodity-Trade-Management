import { Link } from 'react-router-dom';
import { storesApi } from '../lib/endpoints';
import { useAsyncData } from '../hooks/useAsyncData';
import { categoryIcon, pluralise } from '../lib/format';
import { Alert, ButtonLink, EmptyState, SectionHeading, SkeletonGrid } from '../components/ui';
import { StoreCard } from '../components/StoreCard';
import { StarRating } from '../components/StarRating';
import type { StoreCard as StoreCardType } from '../types';

function StoreRow({ stores }: { stores: StoreCardType[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {stores.map((store) => (
        <StoreCard key={store.id} store={store} />
      ))}
    </div>
  );
}

export function HomePage() {
  const { data, loading, error } = useAsyncData(() => storesApi.landing(), []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-900 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(60rem 30rem at 15% -10%, rgba(6,182,212,.55), transparent), radial-gradient(40rem 24rem at 90% 10%, rgba(34,211,238,.35), transparent)',
          }}
          aria-hidden="true"
        />
        <div className="page-shell relative grid gap-10 py-16 lg:grid-cols-[1.15fr_1fr] lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-accent-200 ring-1 ring-inset ring-white/15">
              Multi-vendor directory · verified reviews
            </span>
            <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Find trusted local stores.
              <br />
              <span className="text-accent-400">Read reviews that actually help.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-slate-300">
              Every store on MultiStore is moderated before it goes live, and every review comes from a registered
              customer - so ratings mean something.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/stores" size="lg" variant="secondary">
                Browse stores
              </ButtonLink>
              <ButtonLink
                to="/reviews"
                size="lg"
                variant="outline"
                className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:border-white/40"
              >
                Review dashboard
              </ButtonLink>
            </div>

            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4">
              {[
                { label: 'Approved stores', value: data?.stats.totalStores ?? 0 },
                { label: 'Customer reviews', value: data?.stats.totalReviews ?? 0 },
                { label: 'Platform rating', value: (data?.stats.platformAverageRating ?? 0).toFixed(1) },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl bg-white/5 px-4 py-3 ring-1 ring-inset ring-white/10">
                  <dt className="text-xs text-slate-400">{stat.label}</dt>
                  <dd className="mt-1 text-xl font-bold tabular-nums text-white">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative hidden lg:block">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-accent-500/20 to-transparent blur-2xl" aria-hidden="true" />
            {loading ? (
              <div className="relative space-y-4">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="h-28 animate-pulse rounded-2xl bg-white/5" />
                ))}
              </div>
            ) : (
              <ul className="relative space-y-4">
                {(data?.topRated ?? []).slice(0, 3).map((store) => (
                  <li key={store.id}>
                    <Link
                      to={`/stores/${store.slug}`}
                      className="flex items-center gap-4 rounded-2xl bg-white/8 p-4 ring-1 ring-inset ring-white/10 backdrop-blur transition-colors hover:bg-white/15"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-white">{store.name}</p>
                        <p className="truncate text-xs text-slate-400">
                          {store.category?.name ?? 'Uncategorised'} · {store.city}
                        </p>
                      </div>
                      <div className="text-right">
                        <StarRating value={store.avgRating} size="sm" />
                        <p className="mt-1 text-xs text-slate-400">{pluralise(store.reviewCount, 'review')}</p>
                      </div>
                    </Link>
                  </li>
                ))}
                {!data?.topRated.length && (
                  <li className="rounded-2xl bg-white/5 p-4 text-sm text-slate-300 ring-1 ring-inset ring-white/10">
                    No rated stores yet - be the first to review.
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      </section>

      <div className="page-shell py-12 sm:py-16">
        {error && (
          <Alert tone="error" title="Could not load the store directory" className="mb-8">
            {error}
          </Alert>
        )}

        {/* Categories */}
        <section className="mb-14">
          <SectionHeading
            title="Browse by category"
            description="Jump straight into the kind of store you are looking for."
            action={
              <Link to="/stores" className="text-sm font-semibold text-accent-600 hover:text-accent-700">
                All stores →
              </Link>
            }
          />
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-200/70" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {(data?.categories ?? []).map((category) => (
                <Link
                  key={category.id}
                  to={`/stores?category=${category.slug}`}
                  className="panel flex flex-col items-center gap-2 px-4 py-5 text-center transition-shadow hover:shadow-float"
                >
                  <span className="text-2xl" aria-hidden="true">
                    {categoryIcon(category.icon)}
                  </span>
                  <span className="text-sm font-medium text-navy-900">{category.name}</span>
                  {category.storeCount !== undefined && (
                    <span className="text-xs text-slate-500">{pluralise(category.storeCount, 'store')}</span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Featured */}
        <section className="mb-14">
          <SectionHeading title="Featured stores" description="Hand-picked by the MultiStore team." />
          {loading ? (
            <SkeletonGrid count={3} />
          ) : data?.featured.length ? (
            <StoreRow stores={data.featured} />
          ) : (
            <EmptyState icon="🏬" title="No featured stores yet" description="Approved stores will appear here." />
          )}
        </section>

        {/* Top rated */}
        <section className="mb-14">
          <SectionHeading title="Top rated" description="Highest average rating across all approved stores." />
          {loading ? (
            <SkeletonGrid count={6} />
          ) : data?.topRated.length ? (
            <StoreRow stores={data.topRated} />
          ) : (
            <EmptyState icon="⭐" title="No ratings yet" description="Once customers review stores, the leaderboard fills up." />
          )}
        </section>

        {/* Most reviewed */}
        <section className="mb-14">
          <SectionHeading title="Most reviewed" description="The stores customers talk about the most." />
          {loading ? (
            <SkeletonGrid count={6} />
          ) : data?.mostReviewed.length ? (
            <StoreRow stores={data.mostReviewed} />
          ) : (
            <EmptyState icon="💬" title="No reviews yet" />
          )}
        </section>

        {/* Newest */}
        <section>
          <SectionHeading title="Recently added" description="Freshly approved storefronts." />
          {loading ? (
            <SkeletonGrid count={6} />
          ) : data?.newest.length ? (
            <StoreRow stores={data.newest} />
          ) : (
            <EmptyState icon="🆕" title="Nothing new right now" />
          )}
        </section>

        {/* Owner CTA */}
        <section className="mt-16">
          <div className="panel flex flex-col items-start gap-6 p-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-navy-900">Own a store?</h2>
              <p className="mt-1 max-w-xl text-sm text-slate-600">
                Register as a store owner, build your storefront with your own colours and branding, and reply to
                customer reviews from one dashboard.
              </p>
            </div>
            <ButtonLink to="/register?role=STORE_OWNER" size="lg">
              List your store
            </ButtonLink>
          </div>
        </section>
      </div>
    </div>
  );
}

export default HomePage;

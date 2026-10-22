import { Link } from 'react-router-dom';
import { storesApi } from '../../lib/endpoints';
import { useAsyncData } from '../../hooks/useAsyncData';
import { STORE_STATUS_LABELS, pluralise } from '../../lib/format';
import { Alert, Badge, ButtonLink, Card, EmptyState, LoadingBlock, StatCard, statusToneName } from '../../components/ui';
import { StarRating } from '../../components/StarRating';
import { StoreLogo } from '../../components/StoreCard';

export function OwnerDashboardPage() {
  const { data: overview, loading, error } = useAsyncData(() => storesApi.ownerOverview(), []);
  const { data: mine } = useAsyncData(() => storesApi.mine(), []);

  if (loading && !overview) return <LoadingBlock label="Loading your dashboard..." />;

  const totals = overview?.totals;

  return (
    <div className="page-shell py-8 sm:py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">Owner dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Manage your storefronts, reply to reviews and track your ratings. You only ever see your own store data.
          </p>
        </div>
        <ButtonLink to="/owner/stores/new" size="lg">
          + New store
        </ButtonLink>
      </header>

      {error && <Alert tone="error" className="mb-6">{error}</Alert>}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="My stores" value={totals?.stores ?? 0} hint={`${totals?.approvedStores ?? 0} approved`} icon="🏬" />
        <StatCard label="Reviews received" value={totals?.reviews ?? 0} hint={`${totals?.publishedReviews ?? 0} published`} icon="💬" />
        <StatCard
          label="Average rating"
          value={totals && totals.reviews > 0 ? totals.averageRating.toFixed(2) : '—'}
          hint="Across your published reviews"
          icon="⭐"
          tone="warning"
        />
        <StatCard
          label="Awaiting reply"
          value={totals?.awaitingReply ?? 0}
          hint={`${totals?.openReports ?? 0} open reports`}
          icon="↩️"
          tone={totals?.awaitingReply ? 'danger' : 'success'}
        />
      </div>

      {!overview?.stores.length ? (
        <EmptyState
          icon="🏪"
          title="You have not created a store yet"
          description="Create your first storefront, choose a category and submit it for admin approval. Once approved it appears in the public directory."
          action={<ButtonLink to="/owner/stores/new">Create your first store</ButtonLink>}
        />
      ) : (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-navy-900">Your storefronts</h2>
          {overview.stores.map((store) => {
            const counts = mine?.items.find((item) => item.id === store.id)?.counts;
            return (
              <Card key={store.id} className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <StoreLogo name={store.name} logoUrl={store.logoUrl} size={52} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold text-navy-900">{store.name}</h3>
                      <Badge tone={statusToneName(store.status)}>{STORE_STATUS_LABELS[store.status] ?? store.status}</Badge>
                      {!store.isPublished && <Badge tone="neutral">Hidden from directory</Badge>}
                      {store.isFeatured && <Badge tone="accent">Featured</Badge>}
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {store.category?.name ?? 'Uncategorised'} · {store.city} · /stores/{store.slug}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span className="inline-flex items-center gap-2">
                        <StarRating value={store.avgRating} showValue />
                        <span className="text-slate-500">{pluralise(store.reviewCount, 'review')}</span>
                      </span>
                      {counts && <span className="text-xs text-slate-500">{pluralise(counts.images, 'photo')}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <ButtonLink to={`/owner/stores/${store.id}`} size="sm">
                    Manage
                  </ButtonLink>
                  <ButtonLink to={`/owner/stores/${store.id}?tab=reviews`} size="sm" variant="outline">
                    Reviews
                  </ButtonLink>
                  <ButtonLink to={`/owner/stores/${store.id}?tab=analytics`} size="sm" variant="outline">
                    Analytics
                  </ButtonLink>
                  {store.status === 'APPROVED' && store.isPublished && (
                    <Link
                      to={`/stores/${store.slug}`}
                      className="inline-flex h-9 items-center px-2 text-sm font-medium text-accent-600 hover:underline"
                    >
                      View public page →
                    </Link>
                  )}
                </div>
              </Card>
            );
          })}
        </section>
      )}
    </div>
  );
}

export default OwnerDashboardPage;

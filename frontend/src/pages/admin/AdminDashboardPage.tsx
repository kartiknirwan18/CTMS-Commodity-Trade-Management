import { Link } from 'react-router-dom';
import { adminApi } from '../../lib/endpoints';
import { useAsyncData } from '../../hooks/useAsyncData';
import { STORE_STATUS_LABELS, formatDate, pluralise } from '../../lib/format';
import { Alert, Badge, ButtonLink, Card, EmptyState, LoadingBlock, StatCard, statusToneName } from '../../components/ui';
import { RatingBreakdown } from '../../components/StarRating';
import { BarList, RatingDonut } from '../../components/charts';
import { StoreLogo } from '../../components/StoreCard';

export function AdminDashboardPage() {
  const { data: stats, loading, error } = useAsyncData(() => adminApi.stats(), []);

  if (loading && !stats) return <LoadingBlock label="Loading platform statistics..." />;
  if (error || !stats) return <Alert tone="error">{error ?? 'Could not load platform statistics'}</Alert>;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" value={stats.users.total} hint={`${stats.users.customers} customers · ${stats.users.owners} owners`} icon="👥" />
        <StatCard
          label="Stores"
          value={stats.stores.total}
          hint={`${stats.stores.APPROVED} approved · ${stats.stores.PENDING} pending`}
          icon="🏬"
          tone={stats.stores.PENDING > 0 ? 'warning' : 'default'}
        />
        <StatCard label="Reviews" value={stats.reviews.total} hint={`${stats.reviews.last30Days} in the last 30 days`} icon="💬" />
        <StatCard
          label="Open reports"
          value={stats.reviews.openReports}
          hint={stats.reviews.openReports ? 'Needs moderation' : 'Queue is clear'}
          icon="🚩"
          tone={stats.reviews.openReports ? 'danger' : 'success'}
        />
      </div>

      {stats.stores.PENDING > 0 && (
        <Alert tone="warning" title={`${pluralise(stats.stores.PENDING, 'store')} awaiting approval`}>
          New storefronts cannot appear publicly until an admin approves them.{' '}
          <Link to="/admin/stores?status=PENDING" className="font-semibold underline">
            Review the approval queue
          </Link>
          .
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Platform rating distribution</h2>
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <RatingDonut average={stats.reviews.averageRating} total={stats.reviews.published} />
            <RatingBreakdown rows={stats.distribution} total={stats.reviews.published} />
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Top stores by reviews</h2>
          <BarList
            className="mt-4"
            items={stats.topStores.map((store) => ({
              label: store.name,
              value: store.reviewCount,
              hint: `${store.reviewCount} · ${store.avgRating.toFixed(1)}★`,
            }))}
          />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Newest stores</h2>
            <ButtonLink to="/admin/stores" variant="ghost" size="sm">
              Manage all
            </ButtonLink>
          </div>
          {stats.latestStores.length ? (
            <ul className="mt-4 divide-y divide-slate-100">
              {stats.latestStores.map((store) => (
                <li key={store.id} className="flex items-center gap-3 py-3">
                  <StoreLogo name={store.name} logoUrl={store.logoUrl} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-navy-900">{store.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {store.owner.name} · {store.city} · {formatDate(store.createdAt)}
                    </p>
                  </div>
                  <Badge tone={statusToneName(store.status)}>{STORE_STATUS_LABELS[store.status] ?? store.status}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="🏬" title="No stores yet" className="mt-4" />
          )}
        </Card>

        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Operations snapshot</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">New stores (30 days)</dt>
              <dd className="font-semibold tabular-nums text-navy-900">{stats.newStores30d}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">Approved stores</dt>
              <dd className="font-semibold tabular-nums text-navy-900">{stats.stores.APPROVED}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">Rejected stores</dt>
              <dd className="font-semibold tabular-nums text-navy-900">{stats.stores.REJECTED}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">Suspended stores</dt>
              <dd className="font-semibold tabular-nums text-navy-900">{stats.stores.SUSPENDED}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">Suspended accounts</dt>
              <dd className="font-semibold tabular-nums text-navy-900">{stats.users.suspended}</dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap gap-2">
            <ButtonLink to="/admin/stores?status=PENDING" size="sm" variant="outline">
              Approval queue
            </ButtonLink>
            <ButtonLink to="/admin/reviews?status=HIDDEN" size="sm" variant="outline">
              Hidden reviews
            </ButtonLink>
            <ButtonLink to="/admin/reports?status=OPEN" size="sm" variant="outline">
              Open reports
            </ButtonLink>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default AdminDashboardPage;

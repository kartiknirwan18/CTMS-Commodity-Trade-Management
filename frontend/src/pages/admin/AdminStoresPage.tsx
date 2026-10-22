import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { assetUrl } from '../../lib/api';
import { adminApi } from '../../lib/endpoints';
import { useAsyncData, useDebouncedValue } from '../../hooks/useAsyncData';
import { STORE_STATUS_LABELS, formatDate, pluralise } from '../../lib/format';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  LoadingBlock,
  Modal,
  Pagination,
  Select,
  Tabs,
  Textarea,
  Toggle,
  cn,
  statusToneName,
  useToast,
} from '../../components/ui';
import { StarRating } from '../../components/StarRating';
import { StoreLogo } from '../../components/StoreCard';
import type { AdminStoreRow, StoreStatus } from '../../types';

const STATUS_TABS = [
  { id: 'PENDING', label: 'Pending' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'SUSPENDED', label: 'Suspended' },
  { id: 'ALL', label: 'All stores' },
];

export function AdminStoresPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const status = (searchParams.get('status') ?? 'PENDING') as StoreStatus | 'ALL';
  const storedSearch = searchParams.get('search') ?? '';
  const page = Number(searchParams.get('page') ?? '1') || 1;

  const [searchDraft, setSearchDraft] = useState(storedSearch);
  const debounced = useDebouncedValue(searchDraft, 350);

  const [target, setTarget] = useState<AdminStoreRow | null>(null);
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | 'SUSPENDED'>('APPROVED');
  const [note, setNote] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setSearchDraft(storedSearch), [storedSearch]);

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
    if (debounced !== storedSearch) updateParams({ search: debounced || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const { data, loading, error: loadError, reload } = useAsyncData(
    () =>
      adminApi.stores({
        status: status === 'ALL' ? undefined : status,
        search: storedSearch || undefined,
        page,
        pageSize: 10,
      }),
    [status, storedSearch, page],
    { keepPrevious: true },
  );

  const applyStatus = async (store: AdminStoreRow, next: StoreStatus, adminNote?: string) => {
    setBusyId(store.id);
    setError(null);
    try {
      await adminApi.setStoreStatus(store.id, next, adminNote);
      toast.show(`${store.name} marked as ${STORE_STATUS_LABELS[next] ?? next}`);
      setTarget(null);
      setNote('');
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the store');
    } finally {
      setBusyId(null);
    }
  };

  const toggleFeatured = async (store: AdminStoreRow) => {
    setBusyId(store.id);
    setError(null);
    try {
      await adminApi.setStoreFeatured(store.id, !store.isFeatured);
      toast.show(store.isFeatured ? 'Removed from featured' : 'Store featured');
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the store');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {loadError && <Alert tone="error">{loadError}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}

      <Tabs
        active={status}
        onChange={(id) => updateParams({ status: id === 'ALL' ? undefined : id })}
        tabs={STATUS_TABS.map((tab) => ({ ...tab, id: tab.id }))}
      />

      <Card className="flex flex-wrap items-end gap-3">
        <Input
          containerClassName="flex-1 min-w-[220px]"
          label="Search stores"
          type="search"
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder="Store name, city or owner email"
        />
        <p className="ml-auto text-sm text-slate-500">
          {loading && !data ? 'Loading...' : `${data?.total ?? 0} store${data?.total === 1 ? '' : 's'}`}
        </p>
      </Card>

      {loading && !data ? (
        <LoadingBlock label="Loading stores..." />
      ) : data?.items.length ? (
        <>
          <div className={cn('space-y-4', loading && 'opacity-60')}>
            {data.items.map((store) => (
              <Card key={store.id} className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  {store.bannerUrl ? (
                    <img
                      src={assetUrl(store.bannerUrl)}
                      alt=""
                      className="hidden h-16 w-24 shrink-0 rounded-xl object-cover sm:block"
                    />
                  ) : (
                    <div className="hidden sm:block">
                      <StoreLogo name={store.name} logoUrl={store.logoUrl} size={64} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold text-navy-900">{store.name}</h3>
                      <Badge tone={statusToneName(store.status)}>{STORE_STATUS_LABELS[store.status] ?? store.status}</Badge>
                      {store.isFeatured && <Badge tone="accent">Featured</Badge>}
                      {!store.isPublished && <Badge tone="neutral">Hidden</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {store.category?.name ?? 'Uncategorised'} · {store.city} · owner {store.owner.name} ({store.owner.email})
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span className="inline-flex items-center gap-2">
                        <StarRating value={store.avgRating} showValue />
                        <span className="text-slate-500">{pluralise(store.reviewCount, 'review')}</span>
                      </span>
                      <span className="text-xs text-slate-500">
                        Submitted {formatDate(store.createdAt)}
                        {store.approvedAt ? ` · approved ${formatDate(store.approvedAt)}` : ''}
                      </span>
                    </div>
                    {store.adminNote && (
                      <p className="mt-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-900 ring-1 ring-inset ring-amber-200">
                        Admin note: {store.adminNote}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {store.status === 'APPROVED' && (
                    <Toggle
                      checked={store.isFeatured}
                      disabled={busyId === store.id}
                      onChange={() => toggleFeatured(store)}
                      label="Featured"
                    />
                  )}
                  <Link
                    to={`/stores/${store.slug}`}
                    className="inline-flex h-9 items-center rounded-xl border border-slate-300 px-3 text-sm font-medium text-navy-800 hover:bg-slate-50"
                  >
                    Preview
                  </Link>
                  {store.status !== 'APPROVED' && (
                    <Button
                      size="sm"
                      disabled={busyId === store.id}
                      onClick={() => {
                        setDecision('APPROVED');
                        setTarget(store);
                      }}
                    >
                      Approve
                    </Button>
                  )}
                  {store.status === 'PENDING' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-rose-600"
                      disabled={busyId === store.id}
                      onClick={() => {
                        setDecision('REJECTED');
                        setTarget(store);
                      }}
                    >
                      Reject
                    </Button>
                  )}
                  {store.status === 'APPROVED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === store.id}
                      onClick={() => {
                        setDecision('SUSPENDED');
                        setTarget(store);
                      }}
                    >
                      Suspend
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>

          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={(next) => updateParams({ page: next }, false)} />
        </>
      ) : (
        <EmptyState
          icon="🏬"
          title={status === 'PENDING' ? 'No stores awaiting approval' : 'No stores match this filter'}
          description={status === 'PENDING' ? 'The approval queue is clear.' : 'Try a different status or search term.'}
        />
      )}

      <Modal
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title={
          decision === 'APPROVED'
            ? `Approve ${target?.name ?? 'store'}?`
            : decision === 'REJECTED'
              ? `Reject ${target?.name ?? 'store'}?`
              : `Suspend ${target?.name ?? 'store'}?`
        }
        description={
          decision === 'APPROVED'
            ? 'The store becomes publicly visible in the directory immediately.'
            : decision === 'REJECTED'
              ? 'The owner sees your note and can update the store to re-submit.'
              : 'The store is removed from the public directory until it is re-approved.'
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button
              variant={decision === 'APPROVED' ? 'primary' : 'danger'}
              loading={Boolean(busyId)}
              onClick={() => target && applyStatus(target, decision, note || undefined)}
            >
              {decision === 'APPROVED' ? 'Approve store' : decision === 'REJECTED' ? 'Reject store' : 'Suspend store'}
            </Button>
          </>
        }
      >
        <Textarea
          label={decision === 'APPROVED' ? 'Internal note (optional)' : 'Reason shared with the owner (recommended)'}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={4}
          maxLength={400}
        />
      </Modal>
    </div>
  );
}

export default AdminStoresPage;

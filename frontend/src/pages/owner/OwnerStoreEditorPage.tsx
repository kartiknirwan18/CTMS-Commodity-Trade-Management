import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { assetUrl, ApiError } from '../../lib/api';
import { fieldErrorMap, storesApi, type StoreFormPayload } from '../../lib/endpoints';
import { useAsyncData } from '../../hooks/useAsyncData';
import { STORE_STATUS_LABELS, formatDate, pluralise } from '../../lib/format';
import {
  Alert,
  Badge,
  Button,
  ButtonLink,
  Card,
  ConfirmDialog,
  EmptyState,
  LoadingBlock,
  Pagination,
  Select,
  StatCard,
  Tabs,
  Toggle,
  cn,
  statusToneName,
  useToast,
} from '../../components/ui';
import { RatingBreakdown } from '../../components/StarRating';
import { ReviewCard } from '../../components/ReviewCard';
import { StoreForm } from '../../components/StoreForm';
import { StoreThemeEditor } from '../../components/StoreThemeEditor';
import { RatingDonut, TrendChart } from '../../components/charts';
import type { StoreTheme } from '../../types';

const TABS = [
  { id: 'details', label: 'Store details' },
  { id: 'theme', label: 'Storefront theme' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'reviews', label: 'Review inbox' },
  { id: 'analytics', label: 'Analytics' },
];

const REVIEW_SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'highest', label: 'Highest rated' },
  { value: 'lowest', label: 'Lowest rated' },
];

export function OwnerStoreEditorPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') ?? 'details';

  const { data, loading, error, reload } = useAsyncData(() => storesApi.mineById(id), [id]);
  const { data: categories } = useAsyncData(() => storesApi.categories(), []);

  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [themeError, setThemeError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Review inbox state (kept here so the tab keeps its filters).
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewRating, setReviewRating] = useState('');
  const [reviewSort, setReviewSort] = useState('newest');
  const [reviewReplied, setReviewReplied] = useState('');

  const reviewParams = {
    page: reviewPage,
    rating: reviewRating ? Number(reviewRating) : undefined,
    sort: reviewSort as 'newest' | 'oldest' | 'highest' | 'lowest',
    replied: (reviewReplied || undefined) as 'true' | 'false' | undefined,
    pageSize: 6,
  };

  const { data: inbox, loading: inboxLoading, reload: reloadInbox } = useAsyncData(
    () => storesApi.reviews(id, reviewParams),
    [id, JSON.stringify(reviewParams)],
    { enabled: tab === 'reviews', keepPrevious: true },
  );

  const { data: analytics, loading: analyticsLoading } = useAsyncData(() => storesApi.analytics(id), [id], {
    enabled: tab === 'analytics',
  });

  if (loading && !data) return <LoadingBlock label="Loading your store..." />;

  if (error || !data) {
    return (
      <div className="page-shell py-16">
        <EmptyState
          icon="🔒"
          title="Store not found"
          description={error ?? 'This store does not exist, or it belongs to another owner.'}
          action={<ButtonLink to="/owner">Back to owner dashboard</ButtonLink>}
        />
      </div>
    );
  }

  const { store, summary } = data;

  const saveDetails = async (payload: StoreFormPayload) => {
    setBusy(true);
    setFormError(null);
    setFieldErrors({});
    try {
      await storesApi.update(store.id, payload);
      toast.show('Store details saved');
      await reload();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
        setFieldErrors(fieldErrorMap(err.errors));
      } else {
        setFormError('Could not save your store. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  const saveTheme = async (updates: Partial<StoreTheme>) => {
    setBusy(true);
    setThemeError(null);
    try {
      await storesApi.updateTheme(store.id, updates as Record<string, string | boolean>);
      await reload();
    } catch (err) {
      setThemeError(err instanceof Error ? err.message : 'Could not save the theme');
    } finally {
      setBusy(false);
    }
  };

  const uploadGallery = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      await storesApi.uploadGallery(store.id, Array.from(files));
      toast.show('Photos uploaded');
      await reload();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeImage = async (imageId: string) => {
    setBusy(true);
    try {
      await storesApi.removeImage(store.id, imageId);
      toast.show('Photo removed');
      await reload();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not remove the photo', 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleVisibility = async (isPublished: boolean) => {
    setBusy(true);
    try {
      await storesApi.setVisibility(store.id, isPublished);
      toast.show(isPublished ? 'Store is visible in the directory' : 'Store hidden from the directory');
      await reload();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not update visibility', 'error');
    } finally {
      setBusy(false);
    }
  };

  const deleteStore = async () => {
    setBusy(true);
    try {
      await storesApi.remove(store.id);
      toast.show('Store deleted');
      navigate('/owner', { replace: true });
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not delete the store', 'error');
      setConfirmDelete(false);
    } finally {
      setBusy(false);
    }
  };

  const trendPoints = (analytics?.trend ?? []).map((point) => ({
    label: point.month.slice(5),
    value: point.count,
  }));

  return (
    <div className="page-shell py-8 sm:py-12">
      <nav className="mb-5 text-sm text-slate-500">
        <Link to="/owner" className="hover:text-accent-600">
          Owner dashboard
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <span className="text-navy-800">{store.name}</span>
      </nav>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-navy-900">{store.name}</h1>
            <Badge tone={statusToneName(store.status)}>{STORE_STATUS_LABELS[store.status] ?? store.status}</Badge>
            {store.isFeatured && <Badge tone="accent">Featured</Badge>}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            /stores/{store.slug} · created {formatDate(store.createdAt)}
            {store.approvedAt ? ` · approved ${formatDate(store.approvedAt)}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink to={`/stores/${store.slug}`} variant="outline" size="sm">
            View public storefront
          </ButtonLink>
          <ButtonLink to="/owner/stores/new" variant="outline" size="sm">
            + New store
          </ButtonLink>
        </div>
      </header>

      {store.status === 'REJECTED' && store.adminNote && (
        <Alert tone="error" title="Your store was rejected" className="mb-5">
          {store.adminNote} - update your details and re-submit for approval.
        </Alert>
      )}
      {store.status === 'SUSPENDED' && (
        <Alert tone="warning" title="This store is suspended" className="mb-5">
          {store.adminNote || 'A platform admin has suspended this store. Contact support for details.'}
        </Alert>
      )}
      {store.status === 'PENDING' && (
        <Alert tone="info" title="Awaiting approval" className="mb-5">
          Your store is queued for admin review. You can keep editing it while you wait.
        </Alert>
      )}

      <Tabs
        className="mb-8"
        active={tab}
        onChange={(next) => {
          const params = new URLSearchParams(searchParams);
          params.set('tab', next);
          setSearchParams(params, { replace: true });
        }}
        tabs={TABS}
      />

      {tab === 'details' && (
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <StoreForm
              store={store}
              categories={categories?.items ?? []}
              busy={busy}
              serverError={formError}
              fieldErrors={fieldErrors}
              submitLabel="Save store details"
              onSubmit={saveDetails}
            />
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Card className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Visibility</h2>
              <Toggle
                label="Listed in the public directory"
                description="Hide your store without deleting anything. Only approved stores can be listed."
                checked={store.isPublished}
                disabled={busy || store.status !== 'APPROVED'}
                onChange={toggleVisibility}
              />
              {store.status !== 'APPROVED' && (
                <p className="text-xs text-slate-500">
                  Visibility becomes available once an admin approves your store.
                </p>
              )}
            </Card>

            <Card>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Store snapshot</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Average rating</dt>
                  <dd className="font-medium text-navy-800">{store.avgRating.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Published reviews</dt>
                  <dd className="font-medium text-navy-800">{summary.reviewTotal}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Photos</dt>
                  <dd className="font-medium text-navy-800">{store.images.length}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Pending reports</dt>
                  <dd className="font-medium text-navy-800">{summary.pendingReports}</dd>
                </div>
              </dl>
            </Card>

            <Card className="border-rose-200">
              <h2 className="text-sm font-semibold text-rose-700">Danger zone</h2>
              <p className="mt-2 text-xs text-slate-600">
                Deleting a store removes its reviews, replies and photos permanently.
              </p>
              <Button variant="danger" size="sm" className="mt-3" onClick={() => setConfirmDelete(true)}>
                Delete store
              </Button>
            </Card>
          </aside>
        </div>
      )}

      {tab === 'theme' && (
        <StoreThemeEditor
          store={store}
          theme={store.theme ?? {
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
          }}
          busy={busy}
          error={themeError}
          onSave={saveTheme}
        />
      )}

      {tab === 'gallery' && (
        <div className="space-y-6">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-navy-900">Store gallery</h2>
                <p className="text-sm text-slate-600">
                  {pluralise(store.images.length, 'photo')} uploaded. JPEG, PNG, WebP, GIF or AVIF, up to 5 MB each.
                </p>
              </div>
              <label className="cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-navy-800 hover:bg-slate-50">
                {busy ? 'Uploading...' : 'Upload photos'}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  disabled={busy}
                  onChange={(event) => uploadGallery(event.target.files)}
                />
              </label>
            </div>
          </Card>

          {store.images.length ? (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {store.images.map((image) => (
                <li key={image.id} className="panel group overflow-hidden">
                  <img src={assetUrl(image.url)} alt={image.caption ?? store.name} className="h-36 w-full object-cover" />
                  <div className="flex items-center justify-between gap-2 p-3">
                    <span className="truncate text-xs text-slate-500">{image.caption ?? 'No caption'}</span>
                    <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => removeImage(image.id)}>
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="🖼️" title="No photos yet" description="Upload a few photos to make your storefront stand out." />
          )}
        </div>
      )}

      {tab === 'reviews' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Reviews" value={inbox?.summary.total ?? summary.reviewTotal} icon="💬" />
            <StatCard
              label="Average rating"
              value={(inbox?.summary.average ?? store.avgRating).toFixed(2)}
              icon="⭐"
              tone="warning"
            />
            <StatCard label="Pending reports" value={summary.pendingReports} icon="🚩" tone={summary.pendingReports ? 'danger' : 'success'} />
          </div>

          <Card className="flex flex-wrap items-end gap-3">
            <Select
              label="Rating"
              value={reviewRating}
              onChange={(event) => {
                setReviewRating(event.target.value);
                setReviewPage(1);
              }}
              options={[
                { value: '', label: 'All ratings' },
                ...[5, 4, 3, 2, 1].map((star) => ({ value: String(star), label: `${star} stars` })),
              ]}
            />
            <Select
              label="Replies"
              value={reviewReplied}
              onChange={(event) => {
                setReviewReplied(event.target.value);
                setReviewPage(1);
              }}
              options={[
                { value: '', label: 'All reviews' },
                { value: 'false', label: 'Awaiting reply' },
                { value: 'true', label: 'Already replied' },
              ]}
            />
            <Select
              label="Sort"
              value={reviewSort}
              onChange={(event) => setReviewSort(event.target.value)}
              options={REVIEW_SORTS}
            />
          </Card>

          {inboxLoading && !inbox ? (
            <LoadingBlock label="Loading reviews..." />
          ) : inbox?.items.length ? (
            <>
              <div className={cn('space-y-4', inboxLoading && 'opacity-60')}>
                {inbox.items.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    onChanged={() => {
                      reloadInbox();
                      reload();
                    }}
                  />
                ))}
              </div>
              <Pagination
                page={inbox.page}
                totalPages={inbox.totalPages}
                total={inbox.total}
                onChange={setReviewPage}
              />
            </>
          ) : (
            <EmptyState
              icon="💬"
              title="No reviews match this filter"
              description="Once customers review your store they will show up here so you can reply."
            />
          )}
        </div>
      )}

      {tab === 'analytics' && (
        <div className="space-y-6">
          {analyticsLoading && !analytics ? (
            <LoadingBlock label="Crunching your numbers..." />
          ) : analytics ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Published reviews" value={analytics.totals.publishedReviews} icon="💬" hint={`${analytics.totals.totalReviews} total incl. moderated`} />
                <StatCard label="Average rating" value={analytics.totals.averageRating.toFixed(2)} icon="⭐" tone="warning" />
                <StatCard label="Reply rate" value={`${Math.round(analytics.totals.replyRate)}%`} icon="↩️" hint={`${analytics.totals.replies} replies sent`} tone="success" />
                <StatCard label="Last 30 days" value={analytics.totals.last30Days} icon="📈" tone="accent" hint={`${analytics.totals.hiddenOrRemoved} hidden or removed`} />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Rating distribution</h2>
                  <div className="mt-4">
                    <RatingBreakdown rows={analytics.distribution} total={analytics.totals.publishedReviews} />
                  </div>
                </Card>

                <Card>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Overall health</h2>
                  <div className="mt-4">
                    <RatingDonut average={analytics.totals.averageRating} total={analytics.totals.publishedReviews} />
                  </div>
                  <p className="mt-4 text-xs text-slate-500">
                    Average rating across your published reviews only. Hidden and removed reviews are excluded.
                  </p>
                </Card>
              </div>

              <Card>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Review volume trend</h2>
                <div className="mt-4">
                  <TrendChart points={trendPoints} />
                </div>
              </Card>
            </>
          ) : (
            <EmptyState icon="📊" title="No analytics available yet" />
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${store.name}?`}
        description="This permanently deletes the store, its reviews, replies and uploaded photos. This cannot be undone."
        confirmLabel="Delete store"
        loading={busy}
        onConfirm={deleteStore}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

export default OwnerStoreEditorPage;

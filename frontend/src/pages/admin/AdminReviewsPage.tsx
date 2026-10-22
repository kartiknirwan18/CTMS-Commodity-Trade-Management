import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminApi } from '../../lib/endpoints';
import { useAsyncData, useDebouncedValue } from '../../hooks/useAsyncData';
import { REVIEW_STATUS_LABELS } from '../../lib/format';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Modal,
  Input,
  LoadingBlock,
  Pagination,
  Select,
  Tabs,
  Textarea,
  cn,
  useToast,
} from '../../components/ui';
import { ReviewCard } from '../../components/ReviewCard';
import type { Review, ReviewStatus } from '../../types';

const STATUS_TABS = [
  { id: 'PUBLISHED', label: 'Published' },
  { id: 'HIDDEN', label: 'Hidden' },
  { id: 'REMOVED', label: 'Removed' },
  { id: 'ALL', label: 'All reviews' },
];

export function AdminReviewsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const status = (searchParams.get('status') ?? 'PUBLISHED') as ReviewStatus | 'ALL';
  const storedSearch = searchParams.get('search') ?? '';
  const rating = searchParams.get('rating') ?? '';
  const page = Number(searchParams.get('page') ?? '1') || 1;

  const [searchDraft, setSearchDraft] = useState(storedSearch);
  const debounced = useDebouncedValue(searchDraft, 350);

  const [target, setTarget] = useState<{ review: Review; status: ReviewStatus } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
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
      adminApi.reviews({
        status: status === 'ALL' ? undefined : status,
        search: storedSearch || undefined,
        rating: rating ? Number(rating) : undefined,
        page,
        pageSize: 8,
      }),
    [status, storedSearch, rating, page],
    { keepPrevious: true },
  );

  const moderate = async () => {
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.moderateReview(target.review.id, target.status, note || undefined);
      toast.show(`Review marked as ${REVIEW_STATUS_LABELS[target.status]}`);
      setTarget(null);
      setNote('');
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not moderate this review');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {loadError && <Alert tone="error">{loadError}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}

      <Tabs active={status} onChange={(id) => updateParams({ status: id === 'ALL' ? undefined : id })} tabs={STATUS_TABS} />

      <Card className="flex flex-wrap items-end gap-3">
        <Input
          containerClassName="flex-1 min-w-[220px]"
          label="Search reviews"
          type="search"
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder="Review text, store or customer name"
        />
        <Select
          label="Rating"
          value={rating}
          onChange={(event) => updateParams({ rating: event.target.value || undefined })}
          options={[
            { value: '', label: 'Any rating' },
            ...[5, 4, 3, 2, 1].map((star) => ({ value: String(star), label: `${star} stars` })),
          ]}
        />
        <p className="ml-auto pb-2 text-sm text-slate-500">
          {loading && !data ? 'Loading...' : `${data?.total ?? 0} review${data?.total === 1 ? '' : 's'}`}
        </p>
      </Card>

      {loading && !data ? (
        <LoadingBlock label="Loading reviews..." />
      ) : data?.items.length ? (
        <>
          <div className={cn('space-y-4', loading && 'opacity-60')}>
            {data.items.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                showStore
                onChanged={reload}
                actions={
                  <div className="ml-auto flex flex-wrap gap-2">
                    {review.status !== 'PUBLISHED' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setNote('');
                          setTarget({ review, status: 'PUBLISHED' });
                        }}
                      >
                        Restore
                      </Button>
                    )}
                    {review.status === 'PUBLISHED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setNote('');
                          setTarget({ review, status: 'HIDDEN' });
                        }}
                      >
                        Hide
                      </Button>
                    )}
                    {review.status !== 'REMOVED' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-600"
                        onClick={() => {
                          setNote('');
                          setTarget({ review, status: 'REMOVED' });
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                }
              />
            ))}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={(next) => updateParams({ page: next }, false)} />
        </>
      ) : (
        <EmptyState
          icon="🛡️"
          title={status === 'PUBLISHED' ? 'No published reviews match' : 'Nothing to moderate here'}
          description="Reviews hidden by moderators appear under the Hidden tab."
        />
      )}

      <Modal
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title={target ? `Set review to ${REVIEW_STATUS_LABELS[target.status]}` : 'Moderate review'}
        description="Hiding keeps the review in the database but removes it publicly. Removing excludes it from ratings as well."
        footer={
          <>
            <Button variant="outline" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button variant={target?.status === 'PUBLISHED' ? 'primary' : 'danger'} onClick={moderate} loading={busy}>
              Confirm
            </Button>
          </>
        }
      >
        <Textarea
          label="Moderation note (optional)"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          maxLength={400}
          placeholder="Why is this review being moderated?"
        />
      </Modal>
    </div>
  );
}

export default AdminReviewsPage;

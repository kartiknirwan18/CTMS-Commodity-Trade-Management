import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminApi } from '../../lib/endpoints';
import { useAsyncData } from '../../hooks/useAsyncData';
import { REPORT_REASON_LABELS, REPORT_STATUS_LABELS, formatDate, formatRelative } from '../../lib/format';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingBlock,
  Modal,
  Pagination,
  Tabs,
  Textarea,
  cn,
  statusToneName,
  useToast,
} from '../../components/ui';
import { StarRating } from '../../components/StarRating';
import type { ReviewReport } from '../../types';

const STATUS_TABS = [
  { id: 'OPEN', label: 'Open' },
  { id: 'RESOLVED', label: 'Resolved' },
  { id: 'DISMISSED', label: 'Dismissed' },
  { id: 'ALL', label: 'All reports' },
];

export function AdminReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const status = (searchParams.get('status') ?? 'OPEN') as 'OPEN' | 'RESOLVED' | 'DISMISSED' | 'ALL';
  const page = Number(searchParams.get('page') ?? '1') || 1;

  const [target, setTarget] = useState<{ report: ReviewReport; status: 'RESOLVED' | 'DISMISSED' } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, loading, error: loadError, reload } = useAsyncData(
    () => adminApi.reports({ status: status === 'ALL' ? undefined : status, page, pageSize: 8 }),
    [status, page],
    { keepPrevious: true },
  );

  const updateParams = (changes: Record<string, string | number | undefined>, resetPage = true) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => {
      if (value === undefined || value === '') next.delete(key);
      else next.set(key, String(value));
    });
    if (resetPage) next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const resolve = async () => {
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.updateReport(target.report.id, target.status);
      toast.show(`Report ${target.status.toLowerCase()}`);
      setTarget(null);
      setNote('');
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update this report');
    } finally {
      setBusy(false);
    }
  };

  /** Hides the reported review and closes the report in one step. */
  const hideReview = async (report: ReviewReport) => {
    if (!report.review) return;
    setBusyId(report.id);
    setError(null);
    try {
      await adminApi.moderateReview(report.review.id, 'HIDDEN', `Reported: ${REPORT_REASON_LABELS[report.reason] ?? report.reason}`);
      await adminApi.updateReport(report.id, 'RESOLVED');
      toast.show('Review hidden and report resolved');
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not hide the review');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {loadError && <Alert tone="error">{loadError}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}

      <Tabs active={status} onChange={(id) => updateParams({ status: id === 'ALL' ? undefined : id })} tabs={STATUS_TABS} />

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Reports are filed by customers against individual reviews. Resolve them after taking action, or dismiss them
          if the review is fine as-is.
        </p>
        <p className="shrink-0 text-sm text-slate-500">{data ? `${data.total} report${data.total === 1 ? '' : 's'}` : ''}</p>
      </div>

      {loading && !data ? (
        <LoadingBlock label="Loading reports..." />
      ) : data?.items.length ? (
        <>
          <div className={cn('space-y-4', loading && 'opacity-60')}>
            {data.items.map((report) => (
              <Card key={report.id} className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={statusToneName(report.status)}>{REPORT_STATUS_LABELS[report.status] ?? report.status}</Badge>
                  <Badge tone="danger">{REPORT_REASON_LABELS[report.reason] ?? report.reason}</Badge>
                  <span className="text-xs text-slate-500">
                    filed {formatRelative(report.createdAt)} · {formatDate(report.createdAt, true)}
                  </span>
                  <span className="ml-auto flex items-center gap-2 text-xs text-slate-500">
                    <Avatar name={report.reporter.name} size={22} />
                    {report.reporter.name}
                  </span>
                </div>

                {report.details && (
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 ring-1 ring-inset ring-slate-200">
                    “{report.details}”
                  </p>
                )}

                {report.review ? (
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold text-navy-900">{report.review.author.name}</span>
                      <StarRating value={report.review.rating} size="sm" />
                      <Badge tone={statusToneName(report.review.status)}>{report.review.status}</Badge>
                      <span className="text-xs text-slate-500">on {report.review.store?.name ?? 'unknown store'}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{report.review.comment}</p>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs">
                      <Link to={`/reviews/${report.review.id}`} className="font-medium text-accent-600 hover:underline">
                        Open review detail
                      </Link>
                      {report.review.store && (
                        <Link to={`/stores/${report.review.store.slug}`} className="font-medium text-accent-600 hover:underline">
                          View storefront
                        </Link>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">The reported review no longer exists.</p>
                )}

                {report.status === 'OPEN' && (
                  <div className="flex flex-wrap gap-2">
                    {report.review && report.review.status === 'PUBLISHED' && (
                      <Button size="sm" disabled={busyId === report.id} onClick={() => hideReview(report)}>
                        Hide review + resolve
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setNote('');
                        setTarget({ report, status: 'RESOLVED' });
                      }}
                    >
                      Resolve
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setNote('');
                        setTarget({ report, status: 'DISMISSED' });
                      }}
                    >
                      Dismiss
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={(next) => updateParams({ page: next }, false)} />
        </>
      ) : (
        <EmptyState
          icon="🚩"
          title={status === 'OPEN' ? 'No open reports' : 'No reports here'}
          description={status === 'OPEN' ? 'The moderation queue is clear.' : 'Try another status tab.'}
        />
      )}

      <Modal
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title={target?.status === 'RESOLVED' ? 'Resolve this report?' : 'Dismiss this report?'}
        description={
          target?.status === 'RESOLVED'
            ? 'Use this once you have taken action on the review.'
            : 'Use this when the review does not actually break the guidelines.'
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button variant={target?.status === 'RESOLVED' ? 'primary' : 'outline'} onClick={resolve} loading={busy}>
              {target?.status === 'RESOLVED' ? 'Mark resolved' : 'Dismiss report'}
            </Button>
          </>
        }
      >
        <Textarea
          label="Internal note (optional)"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          maxLength={400}
        />
      </Modal>
    </div>
  );
}

export default AdminReportsPage;

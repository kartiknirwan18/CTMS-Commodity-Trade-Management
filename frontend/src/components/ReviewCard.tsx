import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { assetUrl } from '../lib/api';
import { reviewsApi } from '../lib/endpoints';
import { REPORT_REASON_LABELS, REPORT_REASONS, formatDate, formatRelative, truncate } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { Alert, Avatar, Badge, Button, Field, Modal, Select, Textarea, cn, useToast } from './ui';
import { StarPicker, StarRating } from './StarRating';
import { StoreLogo } from './StoreCard';
import type { Review, ReviewReply } from '../types';

/** Converts a backend error into something safe to render. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong';
}

function ReviewImages({ images }: { images: string[] }) {
  const [active, setActive] = useState<string | null>(null);
  if (!images.length) return null;
  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2">
        {images.map((url) => (
          <button
            key={url}
            type="button"
            onClick={() => setActive(url)}
            className="h-20 w-20 overflow-hidden rounded-lg border border-slate-200"
          >
            <img src={assetUrl(url)} alt="Review attachment" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      <Modal open={Boolean(active)} onClose={() => setActive(null)} title="Review photo" size="lg">
        {active && <img src={assetUrl(active)} alt="Review attachment" className="w-full rounded-lg" />}
      </Modal>
    </>
  );
}

function ReplyBlock({ reply, canManage, onChanged }: { reply: ReviewReply; canManage: boolean; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(reply.comment);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await reviewsApi.updateReply(reply.id, draft);
      toast.show('Reply updated');
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await reviewsApi.deleteReply(reply.id);
      toast.show('Reply removed');
      onChanged();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-accent-200 bg-accent-50/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-700">
          Response from {reply.ownerName ?? 'the store owner'}
        </p>
        <span className="text-xs text-slate-500">{formatRelative(reply.createdAt)}</span>
      </div>
      {editing ? (
        <div className="mt-2 space-y-2">
          <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={3} error={error ?? undefined} />
          <div className="flex gap-2">
            <Button size="sm" onClick={save} loading={busy}>
              Save reply
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 whitespace-pre-line text-sm text-navy-800">{reply.comment}</p>
          {canManage && (
            <div className="mt-2 flex gap-3 text-xs font-medium">
              <button type="button" onClick={() => setEditing(true)} className="text-accent-700 hover:underline">
                Edit
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="text-rose-600 hover:underline disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export interface ReviewCardProps {
  review: Review;
  /** Reloads the parent list after a mutation. */
  onChanged?: () => void;
  /** Renders the store identity header (used on the central dashboard). */
  showStore?: boolean;
  /** Extra controls rendered in the footer, e.g. admin moderation. */
  actions?: ReactNode;
  /** Hides the comment beyond a couple of lines with a link to the detail page. */
  clampComment?: boolean;
}

export function ReviewCard({ review, onChanged, showStore = false, actions, clampComment = false }: ReviewCardProps) {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [helpful, setHelpful] = useState(review.viewer.helpfulByMe);
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState('');

  const [replying, setReplying] = useState(false);
  const [replyDraft, setReplyDraft] = useState('');

  const [editing, setEditing] = useState(false);
  const [editRating, setEditRating] = useState(review.rating);
  const [editTitle, setEditTitle] = useState(review.title ?? '');
  const [editComment, setEditComment] = useState(review.comment);

  const [confirmDelete, setConfirmDelete] = useState(false);

  const requireLogin = () => {
    navigate('/login', { state: { from: `/reviews/${review.id}` } });
  };

  const toggleHelpful = async () => {
    if (!isAuthenticated) return requireLogin();
    setBusy(true);
    setError(null);
    try {
      const result = await reviewsApi.toggleHelpful(review.id);
      setHelpful(result.voted);
      setHelpfulCount(result.helpfulCount);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  const submitReport = async () => {
    setBusy(true);
    setError(null);
    try {
      await reviewsApi.report(review.id, { reason: reportReason, details: reportDetails || undefined });
      toast.show('Thanks - our moderators will review this report');
      setReportOpen(false);
      setReportDetails('');
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  const submitReply = async () => {
    setBusy(true);
    setError(null);
    try {
      await reviewsApi.reply(review.id, replyDraft);
      toast.show('Reply published');
      setReplying(false);
      setReplyDraft('');
      onChanged?.();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  const submitEdit = async () => {
    setBusy(true);
    setError(null);
    try {
      await reviewsApi.update(review.id, { rating: editRating, title: editTitle, comment: editComment });
      toast.show('Review updated');
      setEditing(false);
      onChanged?.();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  const removeReview = async () => {
    setBusy(true);
    setError(null);
    try {
      await reviewsApi.remove(review.id);
      toast.show('Review deleted');
      setConfirmDelete(false);
      onChanged?.();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  const isOwnReview = Boolean(user && review.user.id === user.id);

  return (
    <article className="panel p-5 sm:p-6">
      {showStore && review.store && (
        <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-4">
          <StoreLogo name={review.store.name} logoUrl={review.store.logoUrl} size={40} />
          <div className="min-w-0 flex-1">
            <Link to={`/stores/${review.store.slug}`} className="block truncate text-sm font-semibold text-navy-900 hover:text-accent-600">
              {review.store.name}
            </Link>
            <p className="truncate text-xs text-slate-500">
              {review.store.category?.name ?? 'Uncategorised'}
              {review.store.city ? ` · ${review.store.city}` : ''}
            </p>
          </div>
          <StarRating value={review.store.avgRating} showValue />
        </div>
      )}

      <div className="flex items-start gap-3">
        <Avatar name={review.user.name} src={assetUrl(review.user.avatarUrl)} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm font-semibold text-navy-900">{review.user.name}</p>
            <span className="text-xs text-slate-400">·</span>
            <time className="text-xs text-slate-500" dateTime={review.createdAt} title={formatDate(review.createdAt, true)}>
              {formatRelative(review.createdAt)}
            </time>
            {review.isVerifiedVisit && <Badge tone="success">Verified visit</Badge>}
            {isOwnReview && <Badge tone="info">Your review</Badge>}
            {review.status !== 'PUBLISHED' && <Badge tone="warning">{review.status}</Badge>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StarRating value={review.rating} size="sm" />
            {review.title && <span className="text-sm font-medium text-navy-800">{review.title}</span>}
          </div>
        </div>
      </div>

      {editing ? (
        <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <Field label="Your rating" required>
            <StarPicker value={editRating} onChange={setEditRating} />
          </Field>
          <Field label="Headline" htmlFor={`edit-title-${review.id}`}>
            <input
              id={`edit-title-${review.id}`}
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              maxLength={120}
            />
          </Field>
          <Textarea
            label="Your review"
            value={editComment}
            onChange={(event) => setEditComment(event.target.value)}
            rows={4}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={submitEdit} loading={busy}>
              Save changes
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className={cn('mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700', clampComment && 'clamp-3')}>
            {clampComment ? truncate(review.comment, 260) : review.comment}
          </p>
          {clampComment && review.comment.length > 260 && (
            <Link to={`/reviews/${review.id}`} className="mt-1 inline-block text-sm font-medium text-accent-600 hover:underline">
              Read full review
            </Link>
          )}
          <ReviewImages images={review.images} />
        </>
      )}

      {error && (
        <Alert tone="error" className="mt-3">
          {error}
        </Alert>
      )}

      {review.reply && (
        <ReplyBlock reply={review.reply} canManage={Boolean(review.reply.canEdit)} onChanged={() => onChanged?.()} />
      )}

      {replying && !review.reply && (
        <div className="mt-4 space-y-2">
          <Textarea
            label="Reply as the store owner"
            value={replyDraft}
            onChange={(event) => setReplyDraft(event.target.value)}
            rows={3}
            placeholder="Thank the customer or address their feedback."
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={submitReply} loading={busy}>
              Publish reply
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setReplying(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        <Button size="sm" variant={helpful ? 'subtle' : 'outline'} onClick={toggleHelpful} disabled={busy}>
          👍 Helpful {helpfulCount > 0 && <span className="tabular-nums">({helpfulCount})</span>}
        </Button>

        {review.viewer.canReply && !review.reply && !replying && (
          <Button size="sm" variant="outline" onClick={() => setReplying(true)}>
            Reply
          </Button>
        )}

        {review.viewer.canEdit && !editing && (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}

        {review.viewer.canDelete && (
          <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        )}

        {review.viewer.canReport && (
          <Button size="sm" variant="ghost" onClick={() => setReportOpen(true)}>
            Report
          </Button>
        )}

        {review.store && (
          <Link
            to={`/stores/${review.store.slug}`}
            className="ml-auto text-xs font-medium text-slate-500 hover:text-accent-600"
          >
            View store →
          </Link>
        )}

        {actions}
      </div>

      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Report this review"
        description="Reports go to the platform moderation queue."
        footer={
          <>
            <Button variant="outline" onClick={() => setReportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitReport} loading={busy}>
              Submit report
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Reason"
            value={reportReason}
            onChange={(event) => setReportReason(event.target.value)}
            options={REPORT_REASONS.map((reason) => ({ value: reason, label: REPORT_REASON_LABELS[reason] }))}
          />
          <Textarea
            label="Additional details (optional)"
            value={reportDetails}
            onChange={(event) => setReportDetails(event.target.value)}
            rows={3}
            maxLength={500}
          />
        </div>
      </Modal>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this review?"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={removeReview} loading={busy}>
              Delete review
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          This permanently removes your review and recalculates the store rating. This cannot be undone.
        </p>
      </Modal>
    </article>
  );
}

export default ReviewCard;

import { useState } from 'react';
import { cn } from './ui';

const SIZES = { sm: 'text-sm', md: 'text-base', lg: 'text-xl' } as const;

/** Read-only star display with an optional numeric value. */
export function StarRating({
  value,
  size = 'sm',
  showValue = false,
  className,
}: {
  value: number;
  size?: keyof typeof SIZES;
  showValue?: boolean;
  className?: string;
}) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span className={cn('tracking-tight text-amber-500', SIZES[size])} aria-hidden="true">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star}>{rounded >= star ? '★' : rounded >= star - 0.5 ? '⯨' : '☆'}</span>
        ))}
      </span>
      {showValue && <span className="text-sm font-semibold tabular-nums text-navy-900">{value.toFixed(1)}</span>}
      <span className="sr-only">{value.toFixed(1)} out of 5</span>
    </span>
  );
}

const RATING_WORDS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very good',
  5: 'Excellent',
};

/** Interactive 1-5 star picker used by the review form. */
export function StarPicker({
  value,
  onChange,
  disabled = false,
  size = 'lg',
}: {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
  size?: keyof typeof SIZES;
}) {
  const [hovered, setHovered] = useState(0);
  const shown = hovered || value;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center" onMouseLeave={() => setHovered(0)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            aria-label={`${star} star${star === 1 ? '' : 's'}`}
            aria-pressed={value === star}
            onMouseEnter={() => setHovered(star)}
            onFocus={() => setHovered(star)}
            onClick={() => onChange(star)}
            className={cn(
              'px-1 leading-none transition-transform disabled:cursor-not-allowed',
              size === 'lg' ? 'text-3xl' : SIZES[size],
              shown >= star ? 'text-amber-500' : 'text-slate-300',
              !disabled && 'hover:scale-110',
            )}
          >
            ★
          </button>
        ))}
      </div>
      {shown > 0 && <span className="text-sm font-medium text-slate-600">{RATING_WORDS[shown]}</span>}
    </div>
  );
}

/** Horizontal 5→1 star distribution with percentages. */
export function RatingBreakdown({
  rows,
  total,
}: {
  rows: { stars: number; count: number; percentage: number }[];
  total?: number;
}) {
  const sum = total ?? rows.reduce((acc, row) => acc + row.count, 0);
  return (
    <ul className="space-y-2">
      {[5, 4, 3, 2, 1].map((stars) => {
        const row = rows.find((entry) => entry.stars === stars);
        const count = row?.count ?? 0;
        const percentage = sum > 0 ? (count / sum) * 100 : 0;
        return (
          <li key={stars} className="flex items-center gap-3 text-sm">
            <span className="w-10 shrink-0 tabular-nums text-slate-600">{stars} ★</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-amber-400" style={{ width: `${percentage}%` }} />
            </div>
            <span className="w-12 shrink-0 text-right tabular-nums text-slate-500">
              {count} <span className="hidden sm:inline">({Math.round(percentage)}%)</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default StarRating;

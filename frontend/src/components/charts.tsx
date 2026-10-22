import { cn } from './ui';

/** Lightweight SVG line/area chart - no charting dependency required. */
export function TrendChart({
  points,
  height = 160,
  className,
  formatValue = (value: number) => String(Math.round(value)),
}: {
  points: { label: string; value: number }[];
  height?: number;
  className?: string;
  formatValue?: (value: number) => string;
}) {
  if (!points.length) {
    return (
      <p className={cn('py-10 text-center text-sm text-slate-500', className)}>No activity recorded yet.</p>
    );
  }

  const width = 100;
  const max = Math.max(...points.map((point) => point.value), 1);
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const coords = points.map((point, index) => ({
    x: index * step,
    y: 100 - (point.value / max) * 92,
  }));
  const line = coords.map(({ x, y }) => `${x},${y}`).join(' ');
  const area = `0,100 ${line} ${width},100`;

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${width} 100`}
        preserveAspectRatio="none"
        style={{ height }}
        className="w-full overflow-visible"
        role="img"
        aria-label="Trend chart"
      >
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[25, 50, 75].map((grid) => (
          <line key={grid} x1="0" y1={grid} x2={width} y2={grid} stroke="#e2e8f0" strokeWidth="0.3" />
        ))}
        <polygon points={area} fill="url(#trend-fill)" />
        <polyline points={line} fill="none" stroke="#0891b2" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
        {coords.map(({ x, y }, index) => (
          <circle key={points[index].label} cx={x} cy={y} r="1.1" fill="#0b1220" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className="mt-2 flex justify-between text-[11px] text-slate-500">
        {points.map((point) => (
          <span key={point.label} className="flex-1 text-center">
            {point.label}
          </span>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-slate-400">
        <span>peak {formatValue(max)}</span>
        <span>total {formatValue(points.reduce((acc, point) => acc + point.value, 0))}</span>
      </div>
    </div>
  );
}

/** Simple vertical bar chart, used for per-store review volume. */
export function BarList({
  items,
  className,
}: {
  items: { label: string; value: number; hint?: string }[];
  className?: string;
}) {
  if (!items.length) {
    return <p className={cn('py-6 text-center text-sm text-slate-500', className)}>Nothing to show yet.</p>;
  }
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <ul className={cn('space-y-3', className)}>
      {items.map((item) => (
        <li key={item.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium text-navy-800">{item.label}</span>
            <span className="shrink-0 tabular-nums text-slate-500">{item.hint ?? item.value}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-accent-500" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Donut used for rating distribution summaries. */
export function RatingDonut({
  average,
  total,
  size = 128,
}: {
  average: number;
  total: number;
  size?: number;
}) {
  const percentage = Math.max(0, Math.min(100, (average / 5) * 100));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const dash = (percentage / 100) * circumference;

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`Average rating ${average.toFixed(1)}`}>
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          transform="rotate(-90 50 50)"
        />
        <text x="50" y="48" textAnchor="middle" className="fill-navy-900" style={{ fontSize: 20, fontWeight: 700 }}>
          {average.toFixed(1)}
        </text>
        <text x="50" y="64" textAnchor="middle" className="fill-slate-500" style={{ fontSize: 9 }}>
          of 5.0
        </text>
      </svg>
      <div>
        <p className="text-sm font-semibold text-navy-900">{total.toLocaleString()} reviews</p>
        <p className="text-sm text-slate-500">Platform average</p>
      </div>
    </div>
  );
}

export default TrendChart;

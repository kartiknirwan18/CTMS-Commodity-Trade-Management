import React from 'react'

/**
 * Centered spinner. Pass `label` for an accessible caption.
 */
export function Loader({ label = 'Loading…', size = 'md', inline = false }) {
  const spinnerClass = size === 'lg' ? 'spinner spinner--lg' : 'spinner'
  return (
    <div className={inline ? 'row' : 'loader'} role="status" aria-live="polite">
      <span className={spinnerClass} aria-hidden="true" />
      {label ? <span className="loader__label">{label}</span> : null}
    </div>
  )
}

/** A single shimmering bar. */
export function Skeleton({ width = '100%', height = 12, className = '' }) {
  return (
    <span
      className={`skeleton ${className}`.trim()}
      style={{ width, height }}
      aria-hidden="true"
    />
  )
}

/** Placeholder rows used while a table loads. */
export function TableSkeleton({ rows = 5, columns = 5 }) {
  return (
    <div className="skeleton-group" role="status" aria-live="polite">
      <span className="visually-hidden">Loading data…</span>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="row" style={{ gap: 12 }}>
          {Array.from({ length: columns }).map((__, colIndex) => (
            <Skeleton
              key={colIndex}
              width={colIndex === 0 ? '22%' : '100%'}
              height={14}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Placeholder grid used by the dashboard cards. */
export function CardSkeleton({ count = 4 }) {
  return (
    <div className="card-grid" role="status" aria-live="polite">
      <span className="visually-hidden">Loading summary…</span>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="summary-card">
          <Skeleton width="55%" height={11} />
          <Skeleton width="70%" height={24} />
          <Skeleton width="40%" height={11} />
        </div>
      ))}
    </div>
  )
}

export default Loader

import React from 'react'

/**
 * Compact KPI card used across the dashboard and report headers.
 * `value` is expected to already be formatted by the caller.
 */
export function SummaryCard({
  label,
  value,
  meta = null,
  icon = null,
  tone = 'default',
  loading = false,
  unavailable = false,
}) {
  const toneClass = tone === 'default' ? '' : ` summary-card--${tone}`

  return (
    <div className={`summary-card${toneClass}`}>
      <div className="summary-card__top">
        <span className="summary-card__label">{label}</span>
        {icon ? (
          <span className="summary-card__icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
      </div>
      <div
        className={`summary-card__value${
          unavailable ? ' summary-card__value--muted' : ''
        }`}
      >
        {loading ? <span className="skeleton" style={{ width: '68%', height: 26 }} /> : value}
      </div>
      {meta ? <div className="summary-card__meta">{meta}</div> : null}
    </div>
  )
}

export default SummaryCard

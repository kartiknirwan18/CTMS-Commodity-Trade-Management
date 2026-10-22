import React from 'react'
import { formatCurrency } from '../utils/format'

export const NOT_AVAILABLE_LABEL = 'Not Available'

/**
 * Renders a P&L amount, or the literal text "Not Available" when the backend
 * says the figure cannot be computed. Never fabricates a number.
 */
export function PnlAmount({
  value,
  available = true,
  note = null,
  showSign = false,
  className = '',
}) {
  if (!available) {
    return (
      <span
        className={`text-subtle ${className}`.trim()}
        title={note || 'The backend reported that this P&L figure is not available.'}
      >
        {NOT_AVAILABLE_LABEL}
      </span>
    )
  }

  if (value === null || value === undefined) {
    return <span className={`text-subtle ${className}`.trim()}>{NOT_AVAILABLE_LABEL}</span>
  }

  const numeric = Number(value)
  const tone = Number.isFinite(numeric)
    ? numeric < 0
      ? 'text-danger'
      : numeric > 0
        ? 'text-success'
        : ''
    : ''

  return (
    <span className={`num ${tone} ${className}`.trim()}>
      {showSign && Number.isFinite(numeric) && numeric > 0 ? '+' : ''}
      {formatCurrency(value)}
    </span>
  )
}

export default PnlAmount

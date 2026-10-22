import React from 'react'
import {
  CONTRACT_STATUS_LABELS,
  STATUS_VARIANTS,
  TRADE_STATUS_LABELS,
  TRADE_TYPE_LABELS,
} from '../utils/constants'

/** All labels known to the badge, so any enum value renders human-friendly text. */
const ALL_LABELS = {
  ...TRADE_STATUS_LABELS,
  ...CONTRACT_STATUS_LABELS,
  ...TRADE_TYPE_LABELS,
}

/**
 * Colored status pill. The visual variant is derived from the enum value
 * (see STATUS_VARIANTS) unless `variant` is passed explicitly.
 */
export function StatusBadge({ value, label, variant, dot = true, className = '' }) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-subtle">-</span>
  }

  const resolvedVariant = variant || STATUS_VARIANTS[value] || 'neutral'
  const resolvedLabel = label || ALL_LABELS[value] || String(value)

  return (
    <span className={`badge badge--${resolvedVariant} ${className}`.trim()}>
      {dot ? <span className="badge__dot" aria-hidden="true" /> : null}
      {resolvedLabel}
    </span>
  )
}

export default StatusBadge

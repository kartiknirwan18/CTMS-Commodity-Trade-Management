/**
 * Enum option lists and labels.
 * These wire values MUST match the backend enums exactly.
 */

export const COMMODITY_TYPE = {
  ENERGY: 'ENERGY',
  AGRICULTURE: 'AGRICULTURE',
  METALS: 'METALS',
  LIVESTOCK: 'LIVESTOCK',
  OTHER: 'OTHER',
}

export const COMMODITY_TYPE_VALUES = Object.values(COMMODITY_TYPE)

export const COMMODITY_TYPE_LABELS = {
  ENERGY: 'Energy',
  AGRICULTURE: 'Agriculture',
  METALS: 'Metals',
  LIVESTOCK: 'Livestock',
  OTHER: 'Other',
}

export const UNIT_OF_MEASUREMENT = {
  BARREL: 'BARREL',
  MMBTU: 'MMBTU',
  METRIC_TON: 'METRIC_TON',
  BUSHEL: 'BUSHEL',
  GALLON: 'GALLON',
  POUND: 'POUND',
  OTHER: 'OTHER',
}

export const UNIT_OF_MEASUREMENT_VALUES = Object.values(UNIT_OF_MEASUREMENT)

export const UNIT_OF_MEASUREMENT_LABELS = {
  BARREL: 'Barrel',
  MMBTU: 'MMBtu',
  METRIC_TON: 'Metric Ton',
  BUSHEL: 'Bushel',
  GALLON: 'Gallon',
  POUND: 'Pound',
  OTHER: 'Other',
}

export const TRADE_TYPE = {
  BUY: 'BUY',
  SELL: 'SELL',
}

export const TRADE_TYPE_VALUES = Object.values(TRADE_TYPE)

export const TRADE_TYPE_LABELS = {
  BUY: 'Buy',
  SELL: 'Sell',
}

export const TRADE_STATUS = {
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
}

export const TRADE_STATUS_VALUES = Object.values(TRADE_STATUS)

export const TRADE_STATUS_LABELS = {
  DRAFT: 'Draft',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
}

export const CONTRACT_STATUS = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
}

export const CONTRACT_STATUS_VALUES = Object.values(CONTRACT_STATUS)

export const CONTRACT_STATUS_LABELS = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

/** Maps an enum value to the StatusBadge visual variant. */
export const STATUS_VARIANTS = {
  DRAFT: 'neutral',
  CONFIRMED: 'success',
  ACTIVE: 'info',
  COMPLETED: 'primary',
  CANCELLED: 'danger',
  BUY: 'buy',
  SELL: 'sell',
}

/** Builds `{ value, label }` option lists for <select> controls. */
export function toOptions(values, labels) {
  return values.map((value) => ({ value, label: labels[value] || value }))
}

export const COMMODITY_TYPE_OPTIONS = toOptions(
  COMMODITY_TYPE_VALUES,
  COMMODITY_TYPE_LABELS,
)
export const UNIT_OF_MEASUREMENT_OPTIONS = toOptions(
  UNIT_OF_MEASUREMENT_VALUES,
  UNIT_OF_MEASUREMENT_LABELS,
)
export const TRADE_TYPE_OPTIONS = toOptions(TRADE_TYPE_VALUES, TRADE_TYPE_LABELS)
export const TRADE_STATUS_OPTIONS = toOptions(
  TRADE_STATUS_VALUES,
  TRADE_STATUS_LABELS,
)
export const CONTRACT_STATUS_OPTIONS = toOptions(
  CONTRACT_STATUS_VALUES,
  CONTRACT_STATUS_LABELS,
)

export const PAGE_SIZE_DEFAULT = 10
export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]
export const UPCOMING_DELIVERY_WINDOW_DAYS = 30

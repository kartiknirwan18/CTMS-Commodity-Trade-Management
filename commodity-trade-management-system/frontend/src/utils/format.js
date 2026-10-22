/**
 * Number / date formatting helpers.
 * All numbers go through Intl.NumberFormat. Dates render as YYYY-MM-DD.
 */

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
})

const integerFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
})

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const decimalFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})

function isNil(value) {
  return value === null || value === undefined || value === ''
}

function toNumber(value) {
  if (typeof value === 'number') return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** 15400 -> "15,400" */
export function formatNumber(value, fallback = '-') {
  if (isNil(value)) return fallback
  const n = toNumber(value)
  if (n === null) return fallback
  return numberFormatter.format(n)
}

/** 15400 -> "15,400" (no decimals) */
export function formatInteger(value, fallback = '-') {
  if (isNil(value)) return fallback
  const n = toNumber(value)
  if (n === null) return fallback
  return integerFormatter.format(n)
}

/** 1234567.89 -> "$1,234,567.89" */
export function formatCurrency(value, fallback = '-') {
  if (isNil(value)) return fallback
  const n = toNumber(value)
  if (n === null) return fallback
  return currencyFormatter.format(n)
}

/** 78.5 -> "78.50" ; 78.51234 -> "78.5123" */
export function formatDecimal(value, fallback = '-') {
  if (isNil(value)) return fallback
  const n = toNumber(value)
  if (n === null) return fallback
  return decimalFormatter.format(n)
}

/** Formats a quantity + unit label, e.g. "1,000 BARREL". */
export function formatQuantity(value, unit) {
  const formatted = formatNumber(value)
  if (formatted === '-') return formatted
  return unit ? `${formatted} ${unit}` : formatted
}

function pad(n) {
  return String(n).padStart(2, '0')
}

/**
 * Accepts "2026-10-01", "2026-10-01T09:00:00" or a Date and renders "YYYY-MM-DD".
 */
export function formatDate(value, fallback = '-') {
  if (!value) return fallback
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/)
    if (match) return match[1]
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return fallback
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return fallback
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Renders "YYYY-MM-DD HH:mm" */
export function formatDateTime(value, fallback = '-') {
  if (!value) return fallback
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) {
    // Local date-time strings without timezone are parsed inconsistently in some
    // engines; fall back to the raw string trimmed to minute precision.
    if (typeof value === 'string' && value.length >= 16) {
      return `${value.slice(0, 10)} ${value.slice(11, 16)}`
    }
    return fallback
  }
  return `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Local Date -> "YYYY-MM-DD" (used for API query params). */
export function toIsoDate(date) {
  if (!date) return ''
  if (typeof date === 'string') return formatDate(date, '')
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Today as YYYY-MM-DD. */
export function todayIso() {
  return toIsoDate(new Date())
}

/**
 * Escapes a value for CSV output.
 * Wraps in double quotes when it contains a delimiter, quote or newline.
 */
export function csvEscape(value) {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/** Builds a CSV string from headers + rows (arrays of values). */
export function toCsv(headers, rows) {
  const head = headers.map(csvEscape).join(',')
  const body = rows.map((row) => row.map(csvEscape).join(',')).join('\r\n')
  return body ? `${head}\r\n${body}` : head
}

/** Percentage helper, e.g. 0.256 -> "25.6%". */
export function formatPercent(value, fractionDigits = 1, fallback = '-') {
  if (isNil(value)) return fallback
  const n = toNumber(value)
  if (n === null) return fallback
  return `${(n * 100).toFixed(fractionDigits)}%`
}

export { isNil }

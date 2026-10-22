import { describe, expect, it } from 'vitest'
import {
  csvEscape,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDecimal,
  formatInteger,
  formatNumber,
  formatPercent,
  formatQuantity,
  toCsv,
  toIsoDate,
} from '../utils/format'

describe('format utilities', () => {
  describe('formatNumber', () => {
    it('formats numbers with thousands separators', () => {
      expect(formatNumber(15400)).toBe('15,400')
      expect(formatNumber(1234567.891)).toBe('1,234,567.89')
    })

    it('parses numeric strings', () => {
      expect(formatNumber('1000.0000')).toBe('1,000')
    })

    it('returns the fallback for nullish / non-numeric input', () => {
      expect(formatNumber(null)).toBe('-')
      expect(formatNumber(undefined)).toBe('-')
      expect(formatNumber('')).toBe('-')
      expect(formatNumber('abc')).toBe('-')
      expect(formatNumber(null, 'n/a')).toBe('n/a')
    })
  })

  describe('formatInteger', () => {
    it('drops decimals', () => {
      expect(formatInteger(42.7)).toBe('43')
      expect(formatInteger(0)).toBe('0')
    })
  })

  describe('formatCurrency', () => {
    it('formats USD amounts with two decimals', () => {
      expect(formatCurrency(1234567.89)).toBe('$1,234,567.89')
      expect(formatCurrency(0)).toBe('$0.00')
      expect(formatCurrency(-4500)).toBe('-$4,500.00')
    })

    it('returns the fallback when the value is missing', () => {
      expect(formatCurrency(null)).toBe('-')
    })
  })

  describe('formatDecimal', () => {
    it('always shows at least two decimals and up to four', () => {
      expect(formatDecimal(78.5)).toBe('78.50')
      expect(formatDecimal(78.512345)).toBe('78.5123')
    })
  })

  describe('formatQuantity', () => {
    it('appends the unit when present', () => {
      expect(formatQuantity(1000, 'BARREL')).toBe('1,000 BARREL')
      expect(formatQuantity(1000)).toBe('1,000')
      expect(formatQuantity(null, 'BARREL')).toBe('-')
    })
  })

  describe('formatDate', () => {
    it('renders ISO date-times as YYYY-MM-DD', () => {
      expect(formatDate('2026-10-01T09:00:00')).toBe('2026-10-01')
      expect(formatDate('2026-10-01')).toBe('2026-10-01')
    })

    it('returns the fallback for empty input', () => {
      expect(formatDate(null)).toBe('-')
      expect(formatDate('')).toBe('-')
    })
  })

  describe('formatDateTime', () => {
    it('renders date and minute precision for an ISO date-time', () => {
      const result = formatDateTime('2026-10-01T09:00:00')
      expect(result).toContain('2026-10-01')
      expect(result).toMatch(/\d{2}:\d{2}/)
    })

    it('returns the fallback for empty input', () => {
      expect(formatDateTime(null)).toBe('-')
    })
  })

  describe('toIsoDate', () => {
    it('converts a Date to YYYY-MM-DD using local components', () => {
      expect(toIsoDate(new Date(2026, 9, 1))).toBe('2026-10-01')
    })

    it('passes ISO strings through and returns "" for empty input', () => {
      expect(toIsoDate('2026-10-01T09:00:00')).toBe('2026-10-01')
      expect(toIsoDate(null)).toBe('')
    })
  })

  describe('csvEscape', () => {
    it('leaves simple values untouched', () => {
      expect(csvEscape('Crude Oil')).toBe('Crude Oil')
      expect(csvEscape(1000)).toBe('1000')
    })

    it('quotes values containing commas, quotes or newlines', () => {
      expect(csvEscape('a,b')).toBe('"a,b"')
      expect(csvEscape('say "hi"')).toBe('"say ""hi"""')
      expect(csvEscape('line1\nline2')).toBe('"line1\nline2"')
    })

    it('renders nullish values as empty strings', () => {
      expect(csvEscape(null)).toBe('')
      expect(csvEscape(undefined)).toBe('')
    })
  })

  describe('toCsv', () => {
    it('builds a header row and CRLF-separated data rows', () => {
      const csv = toCsv(['Name', 'Value'], [['Crude Oil', 78500]])
      expect(csv).toBe('Name,Value\r\nCrude Oil,78500')
    })

    it('escapes problematic cells', () => {
      const csv = toCsv(['Name'], [['Oil, sweet']])
      expect(csv).toBe('Name\r\n"Oil, sweet"')
    })
  })

  describe('formatPercent', () => {
    it('converts a fraction to a percentage string', () => {
      expect(formatPercent(0.256)).toBe('25.6%')
    })
  })
})

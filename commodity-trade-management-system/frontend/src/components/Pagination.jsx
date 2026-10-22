import React from 'react'
import { PAGE_SIZE_OPTIONS } from '../utils/constants'
import { formatInteger } from '../utils/format'

/**
 * Server-side pagination control.
 * `page` is zero-based to match the Spring Data page envelope.
 */
export function Pagination({
  page = 0,
  size = 10,
  totalElements = 0,
  totalPages = 0,
  onPageChange,
  onSizeChange,
  sizeOptions = PAGE_SIZE_OPTIONS,
  disabled = false,
}) {
  const safeTotalPages = Math.max(totalPages, totalElements > 0 ? 1 : 0)
  const firstItem = totalElements === 0 ? 0 : page * size + 1
  const lastItem = totalElements === 0 ? 0 : Math.min((page + 1) * size, totalElements)
  const isFirst = page <= 0
  const isLast = page >= safeTotalPages - 1

  return (
    <div className="pagination">
      <span>
        Showing <strong>{formatInteger(firstItem)}</strong>–
        <strong>{formatInteger(lastItem)}</strong> of{' '}
        <strong>{formatInteger(totalElements)}</strong>
      </span>

      <div className="pagination__controls">
        {onSizeChange ? (
          <label className="row" style={{ gap: 6 }}>
            <span className="visually-hidden">Rows per page</span>
            <span aria-hidden="true">Rows:</span>
            <select
              className="select"
              style={{ width: 'auto', minHeight: 30 }}
              value={size}
              onChange={(event) => onSizeChange(Number(event.target.value))}
              disabled={disabled}
              aria-label="Rows per page"
            >
              {sizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <button
          type="button"
          className="btn btn--sm"
          onClick={() => onPageChange?.(page - 1)}
          disabled={disabled || isFirst}
          aria-label="Previous page"
        >
          ‹ Prev
        </button>
        <span className="pagination__page" aria-live="polite">
          Page {safeTotalPages === 0 ? 0 : page + 1} of {safeTotalPages}
        </span>
        <button
          type="button"
          className="btn btn--sm"
          onClick={() => onPageChange?.(page + 1)}
          disabled={disabled || isLast}
          aria-label="Next page"
        >
          Next ›
        </button>
      </div>
    </div>
  )
}

export default Pagination

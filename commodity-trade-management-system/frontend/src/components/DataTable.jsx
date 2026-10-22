import React from 'react'
import EmptyState from './EmptyState'
import ErrorState from './ErrorState'
import { TableSkeleton } from './Loader'

function resolveRowKey(rowKey, row, index) {
  if (typeof rowKey === 'function') return rowKey(row, index)
  if (typeof rowKey === 'string') return row[rowKey]
  return index
}

/**
 * Generic, data-dense table.
 *
 * columns: [{ key, header, render?(row, index), align?, sortKey?, sortable?, className?, width? }]
 * Renders loading / error / empty states in place of the rows.
 */
export function DataTable({
  columns = [],
  rows = [],
  rowKey = 'id',
  loading = false,
  error = null,
  onRetry,
  onRowClick,
  sort = null,
  onSortChange,
  emptyTitle = 'No records found',
  emptyMessage = 'Try adjusting your filters, or add a new record to get started.',
  emptyAction = null,
  caption = null,
  footer = null,
  skeletonRows = 5,
  minWidth = 560,
}) {
  if (loading) {
    return (
      <div>
        <TableSkeleton rows={skeletonRows} columns={Math.max(columns.length, 3)} />
        {footer}
      </div>
    )
  }

  if (error) {
    return <ErrorState error={error} onRetry={onRetry} title="Could not load data" />
  }

  if (!rows || rows.length === 0) {
    return (
      <EmptyState title={emptyTitle} message={emptyMessage} action={emptyAction} />
    )
  }

  function handleSort(column) {
    if (!column.sortable || !onSortChange) return
    const sortKey = column.sortKey || column.key
    const isActive = sort?.key === sortKey
    const nextDir = isActive && sort.dir === 'asc' ? 'desc' : 'asc'
    onSortChange({ key: sortKey, dir: nextDir })
  }

  return (
    <div>
      <div className="table-wrap">
        <table className="data-table" style={{ minWidth }}>
          {caption ? (
            <caption className="visually-hidden">{caption}</caption>
          ) : null}
          <thead>
            <tr>
              {columns.map((column) => {
                const sortKey = column.sortKey || column.key
                const isActive = sort?.key === sortKey
                const alignClass =
                  column.align === 'right'
                    ? 'num'
                    : column.align === 'center'
                      ? 'nowrap'
                      : ''
                return (
                  <th
                    key={column.key}
                    scope="col"
                    className={alignClass}
                    style={column.width ? { width: column.width } : undefined}
                    aria-sort={
                      isActive
                        ? sort.dir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : column.sortable
                          ? 'none'
                          : undefined
                    }
                  >
                    {column.sortable && onSortChange ? (
                      <button
                        type="button"
                        className="data-table__sort"
                        onClick={() => handleSort(column)}
                      >
                        {column.header}
                        <span aria-hidden="true">
                          {isActive ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                        </span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={resolveRowKey(rowKey, row, index)}
                className={onRowClick ? 'is-clickable' : undefined}
                onClick={onRowClick ? () => onRowClick(row, index) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onRowClick(row, index)
                        }
                      }
                    : undefined
                }
              >
                {columns.map((column) => {
                  const alignClass =
                    column.align === 'right'
                      ? 'num'
                      : column.align === 'center'
                        ? 'nowrap'
                        : ''
                  const cellClass = [alignClass, column.className]
                    .filter(Boolean)
                    .join(' ')
                  return (
                    <td key={column.key} className={cellClass || undefined}>
                      {column.render
                        ? column.render(row, index)
                        : row[column.key] ?? '-'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  )
}

export default DataTable

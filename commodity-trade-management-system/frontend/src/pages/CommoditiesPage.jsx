import React, { useMemo, useState } from 'react'
import DataTable from '../components/DataTable'
import FilterBar from '../components/FilterBar'
import ConfirmDialog from '../components/ConfirmDialog'
import CommodityFormModal from '../components/forms/CommodityFormModal'
import {
  deleteCommodity,
  listCommodities,
  setCommodityStatus,
} from '../services/commodities'
import { useAsync } from '../hooks/useAsync'
import { useDebounce } from '../hooks/useDebounce'
import { useToast } from '../hooks/useToast'
import { normalizeError } from '../services/api'
import {
  COMMODITY_TYPE_LABELS,
  COMMODITY_TYPE_OPTIONS,
} from '../utils/constants'
import { formatDateTime } from '../utils/format'

const ACTIVE_FILTERS = [
  { value: '', label: 'All statuses' },
  { value: 'true', label: 'Active only' },
  { value: 'false', label: 'Inactive only' },
]

export function CommoditiesPage() {
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const debouncedSearch = useDebounce(search, 350)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [rowBusyId, setRowBusyId] = useState(null)

  const query = useAsync(
    () =>
      listCommodities({
        q: debouncedSearch,
        active: activeFilter,
        type: typeFilter,
      }),
    [debouncedSearch, activeFilter, typeFilter],
  )

  const rows = query.data || []

  function resetFilters() {
    setSearch('')
    setActiveFilter('')
    setTypeFilter('')
  }

  async function handleToggleStatus(commodity) {
    setRowBusyId(commodity.id)
    try {
      const updated = await setCommodityStatus(commodity.id, !commodity.active)
      toast.success(
        `"${updated.name}" is now ${updated.active ? 'active' : 'inactive'}.`,
        'Status updated',
      )
      query.refetch()
    } catch (error) {
      toast.error(normalizeError(error).message, 'Could not update status')
    } finally {
      setRowBusyId(null)
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await deleteCommodity(pendingDelete.id)
      toast.success(`"${pendingDelete.name}" was deleted.`, 'Commodity deleted')
      setPendingDelete(null)
      query.refetch()
    } catch (error) {
      const normalized = normalizeError(error)
      if (normalized.status === 409) {
        toast.error(
          normalized.message ||
            'This commodity is referenced by existing trades or contracts and cannot be deleted.',
          'Delete blocked',
        )
      } else {
        toast.error(normalized.message, 'Could not delete commodity')
      }
      setPendingDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  const columns = useMemo(
    () => [
      { key: 'name', header: 'Name', className: 'nowrap' },
      {
        key: 'type',
        header: 'Type',
        render: (row) => COMMODITY_TYPE_LABELS[row.type] || row.type,
        className: 'nowrap',
      },
      {
        key: 'unitOfMeasurement',
        header: 'Unit',
        className: 'nowrap',
        render: (row) => row.unitOfMeasurement || '-',
      },
      {
        key: 'description',
        header: 'Description',
        render: (row) => row.description || <span className="text-subtle">-</span>,
      },
      {
        key: 'active',
        header: 'Status',
        render: (row) => (
          <span className={`badge badge--${row.active ? 'success' : 'neutral'}`}>
            <span className="badge__dot" aria-hidden="true" />
            {row.active ? 'Active' : 'Inactive'}
          </span>
        ),
      },
      {
        key: 'createdAt',
        header: 'Created',
        className: 'nowrap text-subtle text-xs',
        render: (row) => formatDateTime(row.createdAt),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (row) => (
          <div className="btn-group" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => {
                setEditing(row)
                setFormOpen(true)
              }}
            >
              Edit
            </button>
            <button
              type="button"
              className="btn btn--sm"
              disabled={rowBusyId === row.id}
              onClick={() => handleToggleStatus(row)}
            >
              {rowBusyId === row.id ? '…' : row.active ? 'Deactivate' : 'Activate'}
            </button>
            <button
              type="button"
              className="btn btn--sm btn--danger"
              onClick={() => setPendingDelete(row)}
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rowBusyId],
  )

  return (
    <div className="page">
      <div className="page__header">
        <div className="page__header-text">
          <h1>Commodities</h1>
          <p>
            Reference data for every traded commodity. Deactivating a commodity keeps
            its history but removes it from new trade and contract forms.
          </p>
        </div>
        <div className="page__actions">
          <button type="button" className="btn" onClick={query.refetch}>
            ↻ Refresh
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            + New commodity
          </button>
        </div>
      </div>

      <section className="section">
        <FilterBar
          onReset={
            search || activeFilter || typeFilter ? resetFilters : undefined
          }
        >
          <div className="field" style={{ flex: '2 1 240px' }}>
            <label className="field__label" htmlFor="commodity-search">
              Search by name
            </label>
            <input
              id="commodity-search"
              className="input"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="e.g. crude"
              autoComplete="off"
            />
          </div>
          <div className="field field--narrow">
            <label className="field__label" htmlFor="commodity-active-filter">
              Status
            </label>
            <select
              id="commodity-active-filter"
              className="select"
              value={activeFilter}
              onChange={(event) => setActiveFilter(event.target.value)}
            >
              {ACTIVE_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field field--narrow">
            <label className="field__label" htmlFor="commodity-type-filter">
              Type
            </label>
            <select
              id="commodity-type-filter"
              className="select"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="">All types</option>
              {COMMODITY_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </FilterBar>

        <DataTable
          columns={columns}
          rows={rows}
          rowKey="id"
          loading={query.loading}
          error={query.error}
          onRetry={query.refetch}
          emptyTitle={search || activeFilter || typeFilter ? 'No matching commodities' : 'No commodities yet'}
          emptyMessage={
            search || activeFilter || typeFilter
              ? 'No commodity matches the current filters. Try clearing the search or status filter.'
              : 'Add your first commodity to start recording trades.'
          }
          emptyAction={
            search || activeFilter || typeFilter ? (
              <button type="button" className="btn btn--sm" onClick={resetFilters}>
                Clear filters
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => {
                  setEditing(null)
                  setFormOpen(true)
                }}
              >
                + New commodity
              </button>
            )
          }
          caption="Commodities"
          minWidth={860}
          footer={
            !query.loading && !query.error && rows.length > 0 ? (
              <div className="table-caption">
                {rows.length} commodit{rows.length === 1 ? 'y' : 'ies'} shown
              </div>
            ) : null
          }
        />
      </section>

      <CommodityFormModal
        open={formOpen}
        commodity={editing}
        onClose={() => setFormOpen(false)}
        onSaved={(saved) => {
          setFormOpen(false)
          toast.success(
            `"${saved?.name || editing?.name || 'Commodity'}" was saved.`,
            editing ? 'Commodity updated' : 'Commodity created',
          )
          query.refetch()
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete commodity"
        message={
          pendingDelete
            ? `Delete "${pendingDelete.name}"? This cannot be undone. Commodities referenced by trades or contracts cannot be deleted.`
            : ''
        }
        confirmLabel="Delete commodity"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
        loading={deleting}
      />
    </div>
  )
}

export default CommoditiesPage

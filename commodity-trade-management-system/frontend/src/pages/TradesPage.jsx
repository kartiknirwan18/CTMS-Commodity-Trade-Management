import React, { useMemo, useState } from 'react'
import DataTable from '../components/DataTable'
import FilterBar from '../components/FilterBar'
import Pagination from '../components/Pagination'
import ConfirmDialog from '../components/ConfirmDialog'
import StatusBadge from '../components/StatusBadge'
import TradeDetailDrawer from '../components/TradeDetailDrawer'
import TradeFormModal from '../components/forms/TradeFormModal'
import { getTrade, listTrades, setTradeStatus } from '../services/trades'
import { listCommodities } from '../services/commodities'
import { useAsync } from '../hooks/useAsync'
import { useDebounce } from '../hooks/useDebounce'
import { useToast } from '../hooks/useToast'
import { normalizeError } from '../services/api'
import {
  PAGE_SIZE_DEFAULT,
  TRADE_STATUS_OPTIONS,
  TRADE_TYPE_OPTIONS,
} from '../utils/constants'
import { formatCurrency, formatDate, formatInteger, formatNumber } from '../utils/format'

const EMPTY_FILTERS = {
  reference: '',
  commodityId: '',
  tradeType: '',
  status: '',
  from: '',
  to: '',
}

/** Authoritative total value from the backend, falling back to quantity × price. */
function totalValueOf(trade) {
  if (trade.totalValue !== null && trade.totalValue !== undefined) return trade.totalValue
  return Number(trade.quantity) * Number(trade.pricePerUnit)
}

export function TradesPage() {
  const toast = useToast()

  const [filters, setFilters] = useState({ ...EMPTY_FILTERS })
  const debouncedReference = useDebounce(filters.reference, 350)

  const [page, setPage] = useState(0)
  const [size, setSize] = useState(PAGE_SIZE_DEFAULT)
  const [sort, setSort] = useState({ key: 'tradeDate', dir: 'desc' })

  const [detailId, setDetailId] = useState(null)
  const [drawerTrade, setDrawerTrade] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [pendingCancel, setPendingCancel] = useState(null)
  const [cancelling, setCancelling] = useState(false)

  const sortParam = `${sort.key},${sort.dir}`

  const list = useAsync(
    () =>
      listTrades({
        page,
        size,
        sort: sortParam,
        reference: debouncedReference,
        commodityId: filters.commodityId,
        tradeType: filters.tradeType,
        status: filters.status,
        from: filters.from,
        to: filters.to,
      }),
    [
      page,
      size,
      sortParam,
      debouncedReference,
      filters.commodityId,
      filters.tradeType,
      filters.status,
      filters.from,
      filters.to,
    ],
  )

  const commoditiesQuery = useAsync(() => listCommodities({}), [])

  const rows = list.data?.content || []
  const totalElements = list.data?.totalElements ?? 0
  const totalPages = list.data?.totalPages ?? 0

  function updateFilter(field, value) {
    setFilters((prev) => ({ ...prev, [field]: value }))
    setPage(0)
  }

  function resetFilters() {
    setFilters({ ...EMPTY_FILTERS })
    setPage(0)
  }

  const hasFilters = Object.values(filters).some((value) => value !== '')

  async function openDetail(trade) {
    setDrawerTrade(trade)
    setDetailId(trade.id)
    try {
      const fresh = await getTrade(trade.id)
      setDrawerTrade(fresh)
    } catch (error) {
      toast.error(normalizeError(error).message, 'Could not refresh trade')
    }
  }

  function closeDetail() {
    setDetailId(null)
    setDrawerTrade(null)
  }

  async function handleConfirmCancel() {
    if (!pendingCancel) return
    setCancelling(true)
    try {
      const updated = await setTradeStatus(pendingCancel.id, 'CANCELLED')
      toast.success(
        `Trade ${updated?.tradeReference || pendingCancel.tradeReference} was cancelled.`,
        'Trade cancelled',
      )
      setPendingCancel(null)
      if (detailId === pendingCancel.id) closeDetail()
      list.refetch()
    } catch (error) {
      toast.error(normalizeError(error).message, 'Could not cancel trade')
      setPendingCancel(null)
    } finally {
      setCancelling(false)
    }
  }

  const columns = useMemo(
    () => [
      {
        key: 'tradeReference',
        header: 'Reference',
        sortable: true,
        className: 'mono nowrap',
        render: (row) => row.tradeReference || '-',
      },
      {
        key: 'tradeDate',
        header: 'Date',
        sortable: true,
        className: 'nowrap',
        render: (row) => formatDate(row.tradeDate),
      },
      {
        key: 'commodityName',
        header: 'Commodity',
        sortable: true,
        className: 'nowrap',
        render: (row) => row.commodityName || '-',
      },
      {
        key: 'tradeType',
        header: 'Type',
        render: (row) => <StatusBadge value={row.tradeType} />,
      },
      {
        key: 'quantity',
        header: 'Quantity',
        sortable: true,
        align: 'right',
        render: (row) => (
          <span>
            {formatNumber(row.quantity)}{' '}
            <span className="text-subtle text-xs">{row.unitOfMeasurement}</span>
          </span>
        ),
      },
      {
        key: 'pricePerUnit',
        header: 'Price / unit',
        sortable: true,
        align: 'right',
        render: (row) => formatCurrency(row.pricePerUnit),
      },
      {
        key: 'totalValue',
        header: 'Total value',
        sortable: true,
        align: 'right',
        render: (row) => (
          <span title={`${formatNumber(row.quantity)} × ${formatCurrency(row.pricePerUnit)}`}>
            {formatCurrency(totalValueOf(row))}
          </span>
        ),
      },
      {
        key: 'counterparty',
        header: 'Counterparty',
        className: 'nowrap',
        render: (row) => row.counterparty || '-',
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        render: (row) => <StatusBadge value={row.status} />,
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
              className="btn btn--sm btn--danger"
              disabled={row.status === 'CANCELLED'}
              onClick={() => setPendingCancel(row)}
            >
              Cancel
            </button>
          </div>
        ),
      },
    ],
    [],
  )

  const commodityOptions = commoditiesQuery.data || []

  return (
    <div className="page">
      <div className="page__header">
        <div className="page__header-text">
          <h1>Trades</h1>
          <p>
            Buy and sell trade ledger with server-side filtering, sorting and
            pagination. Total value is quantity × price per unit.
          </p>
        </div>
        <div className="page__actions">
          <button type="button" className="btn" onClick={list.refetch}>
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
            + New trade
          </button>
        </div>
      </div>

      <section className="section">
        <FilterBar onReset={hasFilters ? resetFilters : undefined}>
          <div className="field" style={{ flex: '2 1 200px' }}>
            <label className="field__label" htmlFor="trade-reference-filter">
              Reference
            </label>
            <input
              id="trade-reference-filter"
              className="input mono"
              type="search"
              value={filters.reference}
              onChange={(event) => updateFilter('reference', event.target.value)}
              placeholder="TRD-2026"
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="trade-commodity-filter">
              Commodity
            </label>
            <select
              id="trade-commodity-filter"
              className="select"
              value={filters.commodityId}
              onChange={(event) => updateFilter('commodityId', event.target.value)}
            >
              <option value="">All commodities</option>
              {commodityOptions.map((commodity) => (
                <option key={commodity.id} value={commodity.id}>
                  {commodity.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field field--narrow">
            <label className="field__label" htmlFor="trade-type-filter">
              Type
            </label>
            <select
              id="trade-type-filter"
              className="select"
              value={filters.tradeType}
              onChange={(event) => updateFilter('tradeType', event.target.value)}
            >
              <option value="">All types</option>
              {TRADE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field field--narrow">
            <label className="field__label" htmlFor="trade-status-filter">
              Status
            </label>
            <select
              id="trade-status-filter"
              className="select"
              value={filters.status}
              onChange={(event) => updateFilter('status', event.target.value)}
            >
              <option value="">All statuses</option>
              {TRADE_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field field--narrow">
            <label className="field__label" htmlFor="trade-from-filter">
              From
            </label>
            <input
              id="trade-from-filter"
              className="input"
              type="date"
              value={filters.from}
              onChange={(event) => updateFilter('from', event.target.value)}
            />
          </div>
          <div className="field field--narrow">
            <label className="field__label" htmlFor="trade-to-filter">
              To
            </label>
            <input
              id="trade-to-filter"
              className="input"
              type="date"
              value={filters.to}
              onChange={(event) => updateFilter('to', event.target.value)}
            />
          </div>
        </FilterBar>

        <DataTable
          columns={columns}
          rows={rows}
          rowKey="id"
          loading={list.loading}
          error={list.error}
          onRetry={list.refetch}
          onRowClick={openDetail}
          sort={sort}
          onSortChange={(next) => {
            setSort(next)
            setPage(0)
          }}
          emptyTitle={hasFilters ? 'No trades match your filters' : 'No trades recorded yet'}
          emptyMessage={
            hasFilters
              ? 'Adjust or clear the filters to see more results.'
              : 'Record your first buy or sell trade to populate the ledger.'
          }
          emptyAction={
            hasFilters ? (
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
                + New trade
              </button>
            )
          }
          caption="Trades"
          minWidth={1020}
          footer={
            <Pagination
              page={page}
              size={size}
              totalElements={totalElements}
              totalPages={totalPages}
              onPageChange={(next) => setPage(Math.max(next, 0))}
              onSizeChange={(next) => {
                setSize(next)
                setPage(0)
              }}
              disabled={list.loading}
            />
          }
        />
      </section>

      <p className="text-subtle text-xs">
        Showing {formatInteger(rows.length)} of {formatInteger(totalElements)} matching
        trades.
      </p>

      <TradeDetailDrawer
        open={Boolean(detailId)}
        trade={drawerTrade}
        onClose={closeDetail}
        onEdit={(trade) => {
          setEditing(trade)
          setFormOpen(true)
        }}
        onCancel={(trade) => setPendingCancel(trade)}
      />

      <TradeFormModal
        open={formOpen}
        trade={editing}
        onClose={() => setFormOpen(false)}
        onSaved={(saved) => {
          setFormOpen(false)
          toast.success(
            `Trade ${saved?.tradeReference || editing?.tradeReference || ''} was saved.`,
            editing ? 'Trade updated' : 'Trade created',
          )
          list.refetch()
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingCancel)}
        title="Cancel trade"
        message={
          pendingCancel
            ? `Cancel trade ${pendingCancel.tradeReference}? Cancelled trades are excluded from P&L matching.`
            : ''
        }
        confirmLabel="Cancel trade"
        cancelLabel="Keep trade"
        onConfirm={handleConfirmCancel}
        onCancel={() => setPendingCancel(null)}
        loading={cancelling}
      />
    </div>
  )
}

export default TradesPage

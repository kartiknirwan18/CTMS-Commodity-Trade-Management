import React, { useMemo, useState } from 'react'
import DataTable from '../components/DataTable'
import FilterBar from '../components/FilterBar'
import Pagination from '../components/Pagination'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import Loader from '../components/Loader'
import ContractFormModal from '../components/forms/ContractFormModal'
import { getUpcomingDeliveries, listContracts } from '../services/contracts'
import { listCommodities } from '../services/commodities'
import { useAsync } from '../hooks/useAsync'
import { useDebounce } from '../hooks/useDebounce'
import { useToast } from '../hooks/useToast'
import {
  CONTRACT_STATUS_OPTIONS,
  PAGE_SIZE_DEFAULT,
  UPCOMING_DELIVERY_WINDOW_DAYS,
} from '../utils/constants'
import { formatCurrency, formatDate, formatInteger, formatNumber } from '../utils/format'

const EMPTY_FILTERS = {
  reference: '',
  status: '',
  commodityId: '',
  from: '',
  to: '',
}

export function ContractsPage() {
  const toast = useToast()

  const [filters, setFilters] = useState({ ...EMPTY_FILTERS })
  const debouncedReference = useDebounce(filters.reference, 350)

  const [page, setPage] = useState(0)
  const [size, setSize] = useState(PAGE_SIZE_DEFAULT)
  const [sort, setSort] = useState({ key: 'contractDate', dir: 'desc' })

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deliveryWindowDays, setDeliveryWindowDays] = useState(UPCOMING_DELIVERY_WINDOW_DAYS)

  const sortParam = `${sort.key},${sort.dir}`

  const list = useAsync(
    () =>
      listContracts({
        page,
        size,
        sort: sortParam,
        reference: debouncedReference,
        status: filters.status,
        commodityId: filters.commodityId,
        from: filters.from,
        to: filters.to,
      }),
    [
      page,
      size,
      sortParam,
      debouncedReference,
      filters.status,
      filters.commodityId,
      filters.from,
      filters.to,
    ],
  )

  const commoditiesQuery = useAsync(() => listCommodities({}), [])
  const deliveries = useAsync(
    () => getUpcomingDeliveries(deliveryWindowDays),
    [deliveryWindowDays],
  )

  const rows = list.data?.content || []
  const totalElements = list.data?.totalElements ?? 0
  const totalPages = list.data?.totalPages ?? 0
  const deliveryRows = deliveries.data || []

  function updateFilter(field, value) {
    setFilters((prev) => ({ ...prev, [field]: value }))
    setPage(0)
  }

  function resetFilters() {
    setFilters({ ...EMPTY_FILTERS })
    setPage(0)
  }

  const hasFilters = Object.values(filters).some((value) => value !== '')
  const commodityOptions = commoditiesQuery.data || []

  const columns = useMemo(
    () => [
      {
        key: 'contractReference',
        header: 'Reference',
        sortable: true,
        className: 'mono nowrap',
        render: (row) => row.contractReference || '-',
      },
      {
        key: 'contractDate',
        header: 'Contract date',
        sortable: true,
        className: 'nowrap',
        render: (row) => formatDate(row.contractDate),
      },
      {
        key: 'commodityName',
        header: 'Commodity',
        className: 'nowrap',
        render: (row) => row.commodityName || '-',
      },
      { key: 'buyerName', header: 'Buyer', className: 'nowrap' },
      { key: 'sellerName', header: 'Seller', className: 'nowrap' },
      {
        key: 'contractQuantity',
        header: 'Quantity',
        sortable: true,
        align: 'right',
        render: (row) => (
          <span>
            {formatNumber(row.contractQuantity)}{' '}
            <span className="text-subtle text-xs">{row.unitOfMeasurement}</span>
          </span>
        ),
      },
      {
        key: 'contractValue',
        header: 'Value',
        sortable: true,
        align: 'right',
        render: (row) => formatCurrency(row.contractValue),
      },
      {
        key: 'deliveryDate',
        header: 'Delivery',
        sortable: true,
        className: 'nowrap',
        render: (row) => formatDate(row.deliveryDate),
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
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <div className="page">
      <div className="page__header">
        <div className="page__header-text">
          <h1>Contracts</h1>
          <p>
            Trade contracts with delivery scheduling. Delivery date must be on or after
            the contract date — enforced in the form and by the backend.
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
            + New contract
          </button>
        </div>
      </div>

      <section className="section">
        <FilterBar onReset={hasFilters ? resetFilters : undefined}>
          <div className="field" style={{ flex: '2 1 200px' }}>
            <label className="field__label" htmlFor="contract-reference-filter">
              Reference
            </label>
            <input
              id="contract-reference-filter"
              className="input mono"
              type="search"
              value={filters.reference}
              onChange={(event) => updateFilter('reference', event.target.value)}
              placeholder="CTR-2026"
              autoComplete="off"
            />
          </div>
          <div className="field field--narrow">
            <label className="field__label" htmlFor="contract-status-filter">
              Status
            </label>
            <select
              id="contract-status-filter"
              className="select"
              value={filters.status}
              onChange={(event) => updateFilter('status', event.target.value)}
            >
              <option value="">All statuses</option>
              {CONTRACT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field__label" htmlFor="contract-commodity-filter">
              Commodity
            </label>
            <select
              id="contract-commodity-filter"
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
            <label className="field__label" htmlFor="contract-from-filter">
              From
            </label>
            <input
              id="contract-from-filter"
              className="input"
              type="date"
              value={filters.from}
              onChange={(event) => updateFilter('from', event.target.value)}
            />
          </div>
          <div className="field field--narrow">
            <label className="field__label" htmlFor="contract-to-filter">
              To
            </label>
            <input
              id="contract-to-filter"
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
          sort={sort}
          onSortChange={(next) => {
            setSort(next)
            setPage(0)
          }}
          emptyTitle={hasFilters ? 'No contracts match your filters' : 'No contracts yet'}
          emptyMessage={
            hasFilters
              ? 'Adjust or clear the filters to see more results.'
              : 'Create your first contract to schedule a delivery.'
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
                + New contract
              </button>
            )
          }
          caption="Contracts"
          minWidth={1080}
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

      <section className="section">
        <div className="section__header">
          <div>
            <h2 className="section__title">Upcoming deliveries</h2>
            <span className="section__hint">
              Contracts with a delivery date in the selected window
            </span>
          </div>
          <label className="row" style={{ gap: 8 }}>
            <span className="text-sm text-muted">Window</span>
            <select
              className="select"
              style={{ width: 'auto' }}
              value={deliveryWindowDays}
              onChange={(event) => setDeliveryWindowDays(Number(event.target.value))}
              aria-label="Upcoming delivery window in days"
            >
              {[7, 14, 30, 60, 90].map((days) => (
                <option key={days} value={days}>
                  {days} days
                </option>
              ))}
            </select>
          </label>
        </div>

        {deliveries.loading ? (
          <Loader label="Loading upcoming deliveries…" />
        ) : deliveries.error ? (
          <ErrorState error={deliveries.error} onRetry={deliveries.refetch} />
        ) : deliveryRows.length === 0 ? (
          <EmptyState
            icon="🚚"
            title="No upcoming deliveries"
            message={`No active contract has a delivery date within the next ${deliveryWindowDays} days. Try widening the window.`}
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table" style={{ minWidth: 900 }}>
              <caption className="visually-hidden">Upcoming deliveries</caption>
              <thead>
                <tr>
                  <th scope="col">Reference</th>
                  <th scope="col">Commodity</th>
                  <th scope="col" className="num">
                    Quantity
                  </th>
                  <th scope="col">Delivery date</th>
                  <th scope="col" className="num">
                    Days until
                  </th>
                  <th scope="col">Location</th>
                  <th scope="col">Buyer / Seller</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {deliveryRows.map((row) => (
                  <tr key={row.contractId}>
                    <td className="mono">{row.contractReference}</td>
                    <td className="nowrap">{row.commodityName}</td>
                    <td className="num">
                      {formatNumber(row.contractQuantity)}{' '}
                      <span className="text-subtle text-xs">{row.unitOfMeasurement}</span>
                    </td>
                    <td className="nowrap">{formatDate(row.deliveryDate)}</td>
                    <td className="num">{formatInteger(row.daysUntilDelivery)}</td>
                    <td className="nowrap">{row.deliveryLocation || '-'}</td>
                    <td className="nowrap text-sm">
                      {row.buyerName} ← {row.sellerName}
                    </td>
                    <td>
                      <StatusBadge value={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ContractFormModal
        open={formOpen}
        contract={editing}
        onClose={() => setFormOpen(false)}
        onSaved={(saved) => {
          setFormOpen(false)
          toast.success(
            `Contract ${saved?.contractReference || editing?.contractReference || ''} was saved.`,
            editing ? 'Contract updated' : 'Contract created',
          )
          list.refetch()
          deliveries.refetch()
        }}
      />
    </div>
  )
}

export default ContractsPage

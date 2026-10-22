import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import SummaryCard from '../components/SummaryCard'
import DataTable from '../components/DataTable'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import StatusBadge from '../components/StatusBadge'
import PnlAmount from '../components/PnlAmount'
import DisclaimerBanner, { DEFAULT_PNL_DISCLAIMER } from '../components/DisclaimerBanner'
import Loader, { CardSkeleton, TableSkeleton } from '../components/Loader'
import BuySellBarChart from '../components/charts/BuySellBarChart'
import VolumeByCommodityChart from '../components/charts/VolumeByCommodityChart'
import TradeActivityLineChart from '../components/charts/TradeActivityLineChart'
import { useAsync } from '../hooks/useAsync'
import { getDashboardSummary, getPnlReport, getTradeActivity, getTradeVolumeByCommodity } from '../services/dashboard'
import { listTrades } from '../services/trades'
import { getUpcomingDeliveries } from '../services/contracts'
import {
  formatCurrency,
  formatDate,
  formatInteger,
  formatNumber,
  formatQuantity,
} from '../utils/format'
import { UPCOMING_DELIVERY_WINDOW_DAYS } from '../utils/constants'

const RECENT_TRADE_COLUMNS = [
  { key: 'tradeReference', header: 'Reference', className: 'mono nowrap' },
  { key: 'tradeDate', header: 'Date', render: (row) => formatDate(row.tradeDate), className: 'nowrap' },
  { key: 'commodityName', header: 'Commodity', className: 'nowrap' },
  {
    key: 'tradeType',
    header: 'Type',
    render: (row) => <StatusBadge value={row.tradeType} />,
  },
  {
    key: 'quantity',
    header: 'Quantity',
    align: 'right',
    render: (row) => formatQuantity(row.quantity, row.unitOfMeasurement),
  },
  {
    key: 'totalValue',
    header: 'Total value',
    align: 'right',
    render: (row) => formatCurrency(row.totalValue),
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <StatusBadge value={row.status} />,
  },
]

export function DashboardPage() {
  const [activityMetric, setActivityMetric] = useState('value')
  const [buySellMetric, setBuySellMetric] = useState('count')

  const summary = useAsync(() => getDashboardSummary(), [])
  const volume = useAsync(() => getTradeVolumeByCommodity(), [])
  const activity = useAsync(() => getTradeActivity(6), [])
  const recent = useAsync(() => listTrades({ page: 0, size: 5, sort: 'tradeDate,desc' }), [])
  const upcoming = useAsync(() => getUpcomingDeliveries(UPCOMING_DELIVERY_WINDOW_DAYS), [])
  const pnl = useAsync(() => getPnlReport(), [])

  function refreshAll() {
    summary.refetch()
    volume.refetch()
    activity.refetch()
    recent.refetch()
    upcoming.refetch()
    pnl.refetch()
  }

  const s = summary.data
  const recentRows = recent.data?.content || []
  const upcomingRows = upcoming.data || []
  const activityRows = activity.data || []
  const volumeRows = volume.data || []

  return (
    <div className="page">
      <div className="page__header">
        <div className="page__header-text">
          <h1>Dashboard</h1>
          <p>
            Live portfolio metrics calculated by the CTMS backend API. Every figure on
            this page is fetched from the REST API — nothing is hardcoded.
          </p>
        </div>
        <div className="page__actions">
          <button type="button" className="btn" onClick={refreshAll}>
            ↻ Refresh
          </button>
          <Link className="btn btn--primary" to="/trades">
            Go to trades
          </Link>
        </div>
      </div>

      {summary.error ? (
        <div className="section">
          <ErrorState
            error={summary.error}
            title="Could not load dashboard summary"
            onRetry={summary.refetch}
          />
        </div>
      ) : summary.loading && !s ? (
        <CardSkeleton count={8} />
      ) : s ? (
        <section aria-label="Key metrics">
          <div className="card-grid">
            <SummaryCard
              label="Total trades"
              value={formatInteger(s.totalTrades)}
              icon="⇄"
              meta={`${formatInteger(s.draftTrades)} draft · ${formatInteger(
                s.confirmedTrades,
              )} confirmed · ${formatInteger(s.cancelledTrades)} cancelled`}
            />
            <SummaryCard
              label="Buy trades"
              value={formatInteger(s.totalBuyTrades)}
              icon="▼"
              tone="success"
            />
            <SummaryCard
              label="Sell trades"
              value={formatInteger(s.totalSellTrades)}
              icon="▲"
              tone="danger"
            />
            <SummaryCard
              label="Total trade volume"
              value={formatNumber(s.totalTradeVolume)}
              icon="◧"
              tone="info"
              meta="Sum of all trade quantities (mixed units)"
            />
            <SummaryCard
              label="Total trade value"
              value={formatCurrency(s.totalTradeValue)}
              icon="$"
              tone="info"
              meta="Quantity × price per unit"
            />
            <SummaryCard
              label="Realized P&L"
              value={
                <PnlAmount
                  value={s.realizedPnl}
                  available={Boolean(s.realizedPnlAvailable)}
                  note={s.pnlMessage}
                />
              }
              icon="∑"
              tone="warning"
              unavailable={!s.realizedPnlAvailable}
              meta={
                s.realizedPnlAvailable
                  ? 'FIFO cost basis'
                  : 'Backend reported this figure is not available'
              }
            />
            <SummaryCard
              label="Active contracts"
              value={formatInteger(s.activeContracts)}
              icon="📄"
              meta={`${formatInteger(s.totalCommodities)} commodities · ${formatInteger(
                s.activeCommodities,
              )} active`}
            />
            <SummaryCard
              label="Upcoming deliveries"
              value={formatInteger(s.upcomingDeliveries)}
              icon="🚚"
              tone="info"
              meta={`Next ${formatInteger(
                s.upcomingDeliveryWindowDays ?? UPCOMING_DELIVERY_WINDOW_DAYS,
              )} days`}
            />
          </div>
        </section>
      ) : null}

      <DisclaimerBanner
        message={s?.pnlDisclaimer || DEFAULT_PNL_DISCLAIMER}
        method={pnl.data?.costBasisMethod}
      />

      <div className="grid-2">
        <section className="section">
          <div className="section__header">
            <div>
              <h2 className="section__title">Buy vs Sell activity</h2>
              <span className="section__hint">Last 6 months, grouped by month</span>
            </div>
            <select
              className="select"
              style={{ width: 'auto' }}
              value={buySellMetric}
              onChange={(event) => setBuySellMetric(event.target.value)}
              aria-label="Buy vs Sell metric"
            >
              <option value="count">Trade count</option>
              <option value="value">Trade value</option>
            </select>
          </div>
          <div className="section__body">
            {activity.loading && !activityRows.length ? (
              <Loader label="Loading chart…" />
            ) : activity.error ? (
              <ErrorState error={activity.error} onRetry={activity.refetch} />
            ) : (
              <BuySellBarChart data={activityRows} metric={buySellMetric} />
            )}
          </div>
        </section>

        <section className="section">
          <div className="section__header">
            <div>
              <h2 className="section__title">Trade activity over time</h2>
              <span className="section__hint">Monthly totals</span>
            </div>
            <select
              className="select"
              style={{ width: 'auto' }}
              value={activityMetric}
              onChange={(event) => setActivityMetric(event.target.value)}
              aria-label="Trade activity metric"
            >
              <option value="value">Total value</option>
              <option value="count">Trade count</option>
            </select>
          </div>
          <div className="section__body">
            {activity.loading && !activityRows.length ? (
              <Loader label="Loading chart…" />
            ) : activity.error ? (
              <ErrorState error={activity.error} onRetry={activity.refetch} />
            ) : (
              <TradeActivityLineChart data={activityRows} metric={activityMetric} />
            )}
          </div>
        </section>
      </div>

      <section className="section">
        <div className="section__header">
          <div>
            <h2 className="section__title">Trade volume by commodity</h2>
            <span className="section__hint">Buy vs sell quantity per commodity</span>
          </div>
          <Link className="btn btn--sm" to="/reports">
            Open reports
          </Link>
        </div>
        <div className="section__body">
          {volume.loading && !volumeRows.length ? (
            <Loader label="Loading volume…" />
          ) : volume.error ? (
            <ErrorState error={volume.error} onRetry={volume.refetch} />
          ) : (
            <VolumeByCommodityChart data={volumeRows} />
          )}
        </div>
      </section>

      <div className="split">
        <section className="section">
          <div className="section__header">
            <div>
              <h2 className="section__title">Recent trades</h2>
              <span className="section__hint">Latest 5 trades by trade date</span>
            </div>
            <Link className="btn btn--sm" to="/trades">
              View all
            </Link>
          </div>
          {recent.loading ? (
            <TableSkeleton rows={5} columns={6} />
          ) : (
            <DataTable
              columns={RECENT_TRADE_COLUMNS}
              rows={recentRows}
              rowKey="id"
              error={recent.error}
              onRetry={recent.refetch}
              emptyTitle="No trades recorded"
              emptyMessage="Create your first trade to populate the dashboard."
              emptyAction={
                <Link className="btn btn--primary btn--sm" to="/trades">
                  Go to trades
                </Link>
              }
              minWidth={680}
            />
          )}
        </section>

        <section className="section">
          <div className="section__header">
            <div>
              <h2 className="section__title">Upcoming deliveries</h2>
              <span className="section__hint">
                Next {UPCOMING_DELIVERY_WINDOW_DAYS} days
              </span>
            </div>
            <Link className="btn btn--sm" to="/contracts">
              View contracts
            </Link>
          </div>
          <div className="section__body">
            {upcoming.loading && !upcomingRows.length ? (
              <Loader label="Loading deliveries…" />
            ) : upcoming.error ? (
              <ErrorState error={upcoming.error} onRetry={upcoming.refetch} />
            ) : upcomingRows.length === 0 ? (
              <EmptyState
                icon="🚚"
                title="No upcoming deliveries"
                message={`No contracts have a delivery date within the next ${UPCOMING_DELIVERY_WINDOW_DAYS} days.`}
                action={
                  <Link className="btn btn--sm" to="/contracts">
                    Review contracts
                  </Link>
                }
              />
            ) : (
              <ul className="stack--sm" style={{ display: 'grid', gap: 12 }}>
                {upcomingRows.map((delivery) => (
                  <li
                    key={delivery.contractId}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      paddingBottom: 10,
                    }}
                  >
                    <div className="row row--between">
                      <span className="mono text-sm">{delivery.contractReference}</span>
                      <StatusBadge value={delivery.status} />
                    </div>
                    <div className="text-sm mt-2">{delivery.commodityName}</div>
                    <div className="kv-inline mt-2">
                      <span>
                        Delivery <strong>{formatDate(delivery.deliveryDate)}</strong>
                      </span>
                      <span>
                        In{' '}
                        <strong>
                          {formatInteger(delivery.daysUntilDelivery)} day
                          {Number(delivery.daysUntilDelivery) === 1 ? '' : 's'}
                        </strong>
                      </span>
                      <span>{formatQuantity(delivery.contractQuantity, delivery.unitOfMeasurement)}</span>
                    </div>
                    <div className="text-subtle text-xs mt-2">
                      {delivery.buyerName} ← {delivery.sellerName}
                      {delivery.deliveryLocation ? ` · ${delivery.deliveryLocation}` : ''}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default DashboardPage

import React, { useMemo, useState } from 'react'
import DisclaimerBanner, { DEFAULT_PNL_DISCLAIMER } from '../components/DisclaimerBanner'
import DataTable from '../components/DataTable'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import Loader from '../components/Loader'
import PnlAmount, { NOT_AVAILABLE_LABEL } from '../components/PnlAmount'
import BuySellBarChart from '../components/charts/BuySellBarChart'
import VolumeByCommodityChart from '../components/charts/VolumeByCommodityChart'
import TradeActivityLineChart from '../components/charts/TradeActivityLineChart'
import { useAsync } from '../hooks/useAsync'
import { useToast } from '../hooks/useToast'
import {
  getPnlReport,
  getTradeActivity,
  getTradeVolumeByCommodity,
} from '../services/dashboard'
import {
  formatCurrency,
  formatInteger,
  formatNumber,
  toCsv,
} from '../utils/format'

const TABS = [
  { id: 'pnl', label: 'P&L by commodity' },
  { id: 'volume', label: 'Volume by commodity' },
  { id: 'activity', label: 'Activity over time' },
]

const PERIOD_OPTIONS = [
  { value: 3, label: 'Last 3 months' },
  { value: 6, label: 'Last 6 months' },
  { value: 12, label: 'Last 12 months' },
]

function downloadCsv(filename, csvContent) {
  const blob = new Blob([`\uFEFF${csvContent}`], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function ReportsPage() {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('pnl')
  const [months, setMonths] = useState(6)

  const pnlQuery = useAsync(() => getPnlReport(), [])
  const volumeQuery = useAsync(() => getTradeVolumeByCommodity(), [])
  const activityQuery = useAsync(() => getTradeActivity(months), [months])

  const pnlItems = pnlQuery.data?.items || []
  const volumeRows = volumeQuery.data || []
  const activityRows = activityQuery.data || []

  const pnlColumns = useMemo(
    () => [
      { key: 'commodityName', header: 'Commodity', className: 'nowrap' },
      {
        key: 'unitOfMeasurement',
        header: 'Unit',
        className: 'nowrap text-subtle',
      },
      {
        key: 'buyQuantity',
        header: 'Buy qty',
        align: 'right',
        render: (row) => formatNumber(row.buyQuantity),
      },
      {
        key: 'sellQuantity',
        header: 'Sell qty',
        align: 'right',
        render: (row) => formatNumber(row.sellQuantity),
      },
      {
        key: 'matchedQuantity',
        header: 'Matched qty',
        align: 'right',
        render: (row) => formatNumber(row.matchedQuantity),
      },
      {
        key: 'openBuyQuantity',
        header: 'Open buy',
        align: 'right',
        render: (row) => formatNumber(row.openBuyQuantity),
      },
      {
        key: 'openSellQuantity',
        header: 'Open sell',
        align: 'right',
        render: (row) => formatNumber(row.openSellQuantity),
      },
      {
        key: 'realizedPnl',
        header: 'Realized P&L',
        align: 'right',
        render: (row) => (
          <PnlAmount value={row.realizedPnl} available={Boolean(row.realizedPnlAvailable)} />
        ),
      },
      {
        key: 'message',
        header: 'Notes',
        render: (row) =>
          row.message ? (
            <span className="text-subtle text-xs">{row.message}</span>
          ) : (
            <span className="text-subtle">-</span>
          ),
      },
    ],
    [],
  )

  const volumeColumns = useMemo(
    () => [
      { key: 'commodityName', header: 'Commodity', className: 'nowrap' },
      {
        key: 'unitOfMeasurement',
        header: 'Unit',
        className: 'nowrap text-subtle',
      },
      {
        key: 'tradeCount',
        header: 'Trades',
        align: 'right',
        render: (row) => formatInteger(row.tradeCount),
      },
      {
        key: 'buyQuantity',
        header: 'Buy qty',
        align: 'right',
        render: (row) => formatNumber(row.buyQuantity),
      },
      {
        key: 'sellQuantity',
        header: 'Sell qty',
        align: 'right',
        render: (row) => formatNumber(row.sellQuantity),
      },
      {
        key: 'totalQuantity',
        header: 'Total qty',
        align: 'right',
        render: (row) => formatNumber(row.totalQuantity),
      },
      {
        key: 'totalValue',
        header: 'Total value',
        align: 'right',
        render: (row) => formatCurrency(row.totalValue),
      },
    ],
    [],
  )

  const activityColumns = useMemo(
    () => [
      { key: 'label', header: 'Period', className: 'nowrap' },
      {
        key: 'tradeCount',
        header: 'Trades',
        align: 'right',
        render: (row) => formatInteger(row.tradeCount),
      },
      {
        key: 'buyCount',
        header: 'Buys',
        align: 'right',
        render: (row) => formatInteger(row.buyCount),
      },
      {
        key: 'sellCount',
        header: 'Sells',
        align: 'right',
        render: (row) => formatInteger(row.sellCount),
      },
      {
        key: 'buyValue',
        header: 'Buy value',
        align: 'right',
        render: (row) => formatCurrency(row.buyValue),
      },
      {
        key: 'sellValue',
        header: 'Sell value',
        align: 'right',
        render: (row) => formatCurrency(row.sellValue),
      },
      {
        key: 'totalValue',
        header: 'Total value',
        align: 'right',
        render: (row) => formatCurrency(row.totalValue),
      },
      {
        key: 'totalQuantity',
        header: 'Total qty',
        align: 'right',
        render: (row) => formatNumber(row.totalQuantity),
      },
    ],
    [],
  )

  const activeQuery =
    activeTab === 'pnl' ? pnlQuery : activeTab === 'volume' ? volumeQuery : activityQuery

  function handleExport() {
    try {
      if (activeTab === 'pnl') {
        const csv = toCsv(
          [
            'Commodity',
            'Unit',
            'Buy quantity',
            'Sell quantity',
            'Matched quantity',
            'Open buy quantity',
            'Open sell quantity',
            'Realized P&L',
            'Available',
            'Notes',
          ],
          pnlItems.map((row) => [
            row.commodityName,
            row.unitOfMeasurement,
            row.buyQuantity,
            row.sellQuantity,
            row.matchedQuantity,
            row.openBuyQuantity,
            row.openSellQuantity,
            row.realizedPnlAvailable ? row.realizedPnl : NOT_AVAILABLE_LABEL,
            row.realizedPnlAvailable ? 'Yes' : 'No',
            row.message,
          ]),
        )
        downloadCsv('ctms-pnl-by-commodity.csv', csv)
      } else if (activeTab === 'volume') {
        const csv = toCsv(
          [
            'Commodity',
            'Unit',
            'Trade count',
            'Buy quantity',
            'Sell quantity',
            'Total quantity',
            'Total value',
          ],
          volumeRows.map((row) => [
            row.commodityName,
            row.unitOfMeasurement,
            row.tradeCount,
            row.buyQuantity,
            row.sellQuantity,
            row.totalQuantity,
            row.totalValue,
          ]),
        )
        downloadCsv('ctms-volume-by-commodity.csv', csv)
      } else {
        const csv = toCsv(
          [
            'Period',
            'Label',
            'Trade count',
            'Buy count',
            'Sell count',
            'Buy value',
            'Sell value',
            'Total value',
            'Total quantity',
          ],
          activityRows.map((row) => [
            row.period,
            row.label,
            row.tradeCount,
            row.buyCount,
            row.sellCount,
            row.buyValue,
            row.sellValue,
            row.totalValue,
            row.totalQuantity,
          ]),
        )
        downloadCsv(`ctms-trade-activity-${months}m.csv`, csv)
      }
      toast.success('CSV export started — check your downloads.', 'Export ready')
    } catch (error) {
      toast.error(`Export failed: ${error.message}`, 'Export failed')
    }
  }

  const activeRowCount =
    activeTab === 'pnl' ? pnlItems.length : activeTab === 'volume' ? volumeRows.length : activityRows.length

  return (
    <div className="page">
      <div className="page__header">
        <div className="page__header-text">
          <h1>Reports</h1>
          <p>
            Profit &amp; loss, volume and activity reports derived from the trade ledger
            by the backend. Export any report to CSV for offline analysis.
          </p>
        </div>
        <div className="page__actions">
          <button
            type="button"
            className="btn"
            onClick={() => {
              pnlQuery.refetch()
              volumeQuery.refetch()
              activityQuery.refetch()
            }}
          >
            ↻ Refresh
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleExport}
            disabled={activeRowCount === 0}
          >
            ⭳ Export CSV
          </button>
        </div>
      </div>

      <DisclaimerBanner
        message={pnlQuery.data?.disclaimer || DEFAULT_PNL_DISCLAIMER}
        method={pnlQuery.data?.costBasisMethod}
      />

      <div className="grid-3">
        <section className="section">
          <div className="section__body">
            <span className="summary-card__label">Total realized P&amp;L</span>
            <div className="summary-card__value" style={{ fontSize: 22, marginTop: 4 }}>
              {pnlQuery.loading ? (
                <Loader inline label="" />
              ) : (
                <PnlAmount
                  value={pnlQuery.data?.totalRealizedPnl}
                  available={Boolean(pnlQuery.data?.realizedPnlAvailable)}
                />
              )}
            </div>
            <p className="text-subtle text-xs mt-2">
              {pnlQuery.data?.realizedPnlAvailable
                ? `Matched using ${pnlQuery.data?.costBasisMethod || 'FIFO'} cost basis.`
                : `${NOT_AVAILABLE_LABEL} — the backend reported no reliable realized P&L.`}
            </p>
          </div>
        </section>

        <section className="section">
          <div className="section__body">
            <span className="summary-card__label">Commodities reported</span>
            <div className="summary-card__value" style={{ fontSize: 22, marginTop: 4 }}>
              {pnlQuery.loading ? <Loader inline label="" /> : formatInteger(pnlItems.length)}
            </div>
            <p className="text-subtle text-xs mt-2">
              Rows in the current P&amp;L breakdown.
            </p>
          </div>
        </section>

        <section className="section">
          <div className="section__body">
            <span className="summary-card__label">Activity window</span>
            <div className="summary-card__value" style={{ fontSize: 22, marginTop: 4 }}>
              {formatInteger(activityRows.length)} period
              {activityRows.length === 1 ? '' : 's'}
            </div>
            <p className="text-subtle text-xs mt-2">
              Monthly buckets over the last {months} months.
            </p>
          </div>
        </section>
      </div>

      <section className="section">
        <div className="section__header">
          <div className="row" role="tablist" aria-label="Report selector">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`report-tab-${tab.id}`}
                aria-selected={activeTab === tab.id}
                aria-controls={`report-panel-${tab.id}`}
                className={activeTab === tab.id ? 'btn btn--primary btn--sm' : 'btn btn--sm'}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'activity' ? (
            <label className="row" style={{ gap: 8 }}>
              <span className="text-sm text-muted">Window</span>
              <select
                className="select"
                style={{ width: 'auto' }}
                value={months}
                onChange={(event) => setMonths(Number(event.target.value))}
                aria-label="Activity window in months"
              >
                {PERIOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <div
          id={`report-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`report-tab-${activeTab}`}
        >
          {activeTab === 'pnl' ? (
            pnlQuery.loading ? (
              <Loader label="Loading P&L report…" />
            ) : pnlQuery.error ? (
              <ErrorState error={pnlQuery.error} onRetry={pnlQuery.refetch} />
            ) : pnlItems.length === 0 ? (
              <EmptyState
                title="No P&L data yet"
                message="The P&L breakdown appears once confirmed buy and sell trades exist for a commodity."
              />
            ) : (
              <DataTable
                columns={pnlColumns}
                rows={pnlItems}
                rowKey="commodityId"
                caption="P&L by commodity"
                minWidth={1020}
              />
            )
          ) : null}

          {activeTab === 'volume' ? (
            volumeQuery.loading ? (
              <Loader label="Loading volume report…" />
            ) : volumeQuery.error ? (
              <ErrorState error={volumeQuery.error} onRetry={volumeQuery.refetch} />
            ) : volumeRows.length === 0 ? (
              <EmptyState
                title="No volume data yet"
                message="Volume by commodity appears once trades have been recorded."
              />
            ) : (
              <>
                <div className="section__body">
                  <VolumeByCommodityChart data={volumeRows} />
                </div>
                <DataTable
                  columns={volumeColumns}
                  rows={volumeRows}
                  rowKey="commodityId"
                  caption="Trade volume by commodity"
                  minWidth={880}
                />
              </>
            )
          ) : null}

          {activeTab === 'activity' ? (
            activityQuery.loading ? (
              <Loader label="Loading activity report…" />
            ) : activityQuery.error ? (
              <ErrorState error={activityQuery.error} onRetry={activityQuery.refetch} />
            ) : activityRows.length === 0 ? (
              <EmptyState
                title="No activity in this window"
                message="Widen the reporting window or record new trades."
              />
            ) : (
              <>
                <div className="section__body">
                  <TradeActivityLineChart data={activityRows} metric="value" />
                  <div className="mt-4">
                    <BuySellBarChart data={activityRows} metric="value" />
                  </div>
                </div>
                <DataTable
                  columns={activityColumns}
                  rows={activityRows}
                  rowKey="period"
                  caption="Trade activity over time"
                  minWidth={880}
                />
              </>
            )
          ) : null}
        </div>
      </section>

      <section className="section">
        <div className="section__header">
          <h2 className="section__title">Methodology &amp; definitions</h2>
        </div>
        <div className="section__body stack stack--sm">
          <h3 className="field__label">Realized P&amp;L — FIFO matching</h3>
          <p className="text-muted text-sm">
            Realized P&amp;L is computed by the backend using FIFO (First-In, First-Out)
            matching of confirmed buy and sell trades, per commodity and per unit of
            measurement. The oldest open buy lots are matched against each sell, and the
            difference between the sell price and the matched buy cost is realized.
          </p>

          <h3 className="field__label mt-4">Realized vs unrealized</h3>
          <p className="text-muted text-sm">
            <strong>Realized P&amp;L</strong> reflects only matched quantities — positions
            that have been closed by an opposing trade. <strong>Unrealized P&amp;L</strong>{' '}
            would require mark-to-market prices, which are not part of this system
            version, so it is reported as “{NOT_AVAILABLE_LABEL}”. Open positions are
            described in units instead.
          </p>

          <h3 className="field__label mt-4">Cost basis method</h3>
          <p className="text-muted text-sm">
            The cost basis method reported by the API is{' '}
            <strong>{pnlQuery.data?.costBasisMethod || 'FIFO'}</strong>.
          </p>

          <h3 className="field__label mt-4">CSV export</h3>
          <p className="text-muted text-sm">
            Export produces a CSV of exactly the report currently displayed above. The
            file is generated in your browser from the data already loaded — nothing is
            recomputed client-side.
          </p>

          <DisclaimerBanner
            className="mt-4"
            message={pnlQuery.data?.disclaimer || DEFAULT_PNL_DISCLAIMER}
          />
        </div>
      </section>
    </div>
  )
}

export default ReportsPage

import React, { useEffect, useRef } from 'react'
import StatusBadge from './StatusBadge'
import PnlAmount, { NOT_AVAILABLE_LABEL } from './PnlAmount'
import DisclaimerBanner from './DisclaimerBanner'
import ErrorState from './ErrorState'
import Loader from './Loader'
import { useAsync } from '../hooks/useAsync'
import { getTradePnl } from '../services/trades'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDecimal,
  formatNumber,
} from '../utils/format'

/**
 * Slide-in detail drawer for a single trade, including its P&L section
 * fetched from GET /api/trades/{id}/pnl.
 */
export function TradeDetailDrawer({ open, trade, onClose, onEdit, onCancel }) {
  const closeRef = useRef(null)
  const previousFocus = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const pnl = useAsync(() => getTradePnl(trade.id), [trade?.id], {
    immediate: Boolean(open && trade?.id),
  })

  useEffect(() => {
    if (!open) return undefined
    previousFocus.current = document.activeElement
    closeRef.current?.focus()

    function onKeyDown(event) {
      if (event.key === 'Escape') onCloseRef.current?.()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (previousFocus.current?.focus) previousFocus.current.focus()
    }
  }, [open])

  if (!open || !trade) return null

  const data = pnl.data

  return (
    <div
      className="drawer-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.()
      }}
    >
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="trade-detail-title"
      >
        <header className="drawer__header">
          <div>
            <h2 className="modal__title" id="trade-detail-title">
              {trade.tradeReference || `Trade #${trade.id}`}
            </h2>
            <div className="row" style={{ gap: 8, marginTop: 6 }}>
              <StatusBadge value={trade.tradeType} />
              <StatusBadge value={trade.status} />
            </div>
          </div>
          <button
            type="button"
            className="modal__close"
            onClick={onClose}
            aria-label="Close trade details"
            ref={closeRef}
          >
            &times;
          </button>
        </header>

        <div className="drawer__body">
          <section>
            <h3 className="field__label" style={{ marginBottom: 8 }}>
              Trade details
            </h3>
            <dl className="def-list">
              <dt>Reference</dt>
              <dd className="mono-value">{trade.tradeReference || '-'}</dd>
              <dt>Commodity</dt>
              <dd>
                {trade.commodityName || '-'}
                {trade.unitOfMeasurement ? (
                  <span className="text-subtle text-xs"> · {trade.unitOfMeasurement}</span>
                ) : null}
              </dd>
              <dt>Type</dt>
              <dd>
                <StatusBadge value={trade.tradeType} />
              </dd>
              <dt>Status</dt>
              <dd>
                <StatusBadge value={trade.status} />
              </dd>
              <dt>Quantity</dt>
              <dd className="num">{formatNumber(trade.quantity)}</dd>
              <dt>Price per unit</dt>
              <dd className="num">{formatCurrency(trade.pricePerUnit)}</dd>
              <dt>Total value</dt>
              <dd className="num">{formatCurrency(trade.totalValue)}</dd>
              <dt>Trade date</dt>
              <dd>{formatDate(trade.tradeDate)}</dd>
              <dt>Counterparty</dt>
              <dd>{trade.counterparty || '-'}</dd>
              <dt>Linked contract</dt>
              <dd className="mono-value">{trade.contractReference || 'None'}</dd>
              <dt>Created</dt>
              <dd>{formatDateTime(trade.createdAt)}</dd>
              <dt>Updated</dt>
              <dd>{formatDateTime(trade.updatedAt)}</dd>
            </dl>
          </section>

          <hr className="divider" />

          <section>
            <h3 className="field__label" style={{ marginBottom: 8 }}>
              Profit &amp; Loss
            </h3>

            {pnl.loading ? (
              <Loader label="Calculating P&L…" />
            ) : pnl.error ? (
              <ErrorState
                error={pnl.error}
                title="P&L unavailable"
                onRetry={pnl.refetch}
              />
            ) : data ? (
              <div className="stack stack--sm">
                <div className="card-grid" style={{ gap: 12 }}>
                  <div className="summary-card">
                    <span className="summary-card__label">Realized P&L</span>
                    <span className="summary-card__value" style={{ fontSize: 20 }}>
                      <PnlAmount
                        value={data.realizedPnl}
                        available={Boolean(data.realizedPnlAvailable)}
                      />
                    </span>
                    <span className="summary-card__meta">
                      {data.costBasisMethod
                        ? `Cost basis: ${data.costBasisMethod}`
                        : 'Cost basis not reported'}
                    </span>
                  </div>
                  <div className="summary-card">
                    <span className="summary-card__label">Unrealized P&L</span>
                    <span className="summary-card__value" style={{ fontSize: 20 }}>
                      <PnlAmount
                        value={data.unrealizedPnl}
                        available={Boolean(data.unrealizedPnlAvailable)}
                      />
                    </span>
                    <span className="summary-card__meta">
                      {data.unrealizedPnlAvailable
                        ? 'Mark-to-market'
                        : 'Not calculated in v1 — open positions are reported in units only.'}
                    </span>
                  </div>
                </div>

                <dl className="def-list">
                  <dt>Buy quantity</dt>
                  <dd className="num">{formatNumber(data.buyQuantity)}</dd>
                  <dt>Sell quantity</dt>
                  <dd className="num">{formatNumber(data.sellQuantity)}</dd>
                  <dt>Matched quantity</dt>
                  <dd className="num">{formatNumber(data.matchedQuantity)}</dd>
                  <dt>Open buy quantity</dt>
                  <dd className="num">{formatNumber(data.openBuyQuantity)}</dd>
                  <dt>Open sell quantity</dt>
                  <dd className="num">{formatNumber(data.openSellQuantity)}</dd>
                  <dt>Decimal precision</dt>
                  <dd>{formatDecimal(data.matchedQuantity)}</dd>
                </dl>

                {data.openPositionMessage ? (
                  <div className="alert alert--info" role="status">
                    <span className="alert__icon" aria-hidden="true">
                      ℹ
                    </span>
                    <div className="alert__body">{data.openPositionMessage}</div>
                  </div>
                ) : null}

                <DisclaimerBanner
                  message={data.disclaimer || undefined}
                  method={data.costBasisMethod}
                />

                {!data.realizedPnlAvailable ? (
                  <p className="text-subtle text-xs">
                    Realized P&amp;L is reported as {NOT_AVAILABLE_LABEL} by the backend
                    for this trade.
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>

        <footer className="drawer__footer">
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
          {onEdit ? (
            <button type="button" className="btn" onClick={() => onEdit(trade)}>
              Edit
            </button>
          ) : null}
          {onCancel && trade.status !== 'CANCELLED' ? (
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => onCancel(trade)}
            >
              Cancel trade
            </button>
          ) : null}
        </footer>
      </aside>
    </div>
  )
}

export default TradeDetailDrawer

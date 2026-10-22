import React from 'react'
import DisclaimerBanner, { DEFAULT_PNL_DISCLAIMER } from '../components/DisclaimerBanner'
import ErrorState from '../components/ErrorState'
import Loader from '../components/Loader'
import StatusBadge from '../components/StatusBadge'
import { useAsync } from '../hooks/useAsync'
import { API_BASE_URL, getHealth } from '../services/api'
import { formatDateTime } from '../utils/format'

const APP_INFO = [
  { label: 'Application', value: 'CTMS — Commodity Trade Management System' },
  { label: 'Frontend version', value: '1.0.0' },
  { label: 'UI stack', value: 'React 18 · Vite 5 · Recharts · React Router 6' },
  { label: 'Backend API', value: 'Spring Boot on http://localhost:8080' },
  { label: 'Cost basis method', value: 'FIFO (First-In, First-Out)' },
]

export function SettingsPage() {
  const health = useAsync(() => getHealth(), [], { immediate: false })

  const status = health.data?.status
  const isUp = status === 'UP'

  return (
    <div className="page">
      <div className="page__header">
        <div className="page__header-text">
          <h1>Settings</h1>
          <p>
            Connection details, backend health and the methodology behind the P&amp;L
            figures shown throughout the application.
          </p>
        </div>
      </div>

      <div className="grid-2">
        <section className="section">
          <div className="section__header">
            <h2 className="section__title">API connection</h2>
          </div>
          <div className="section__body stack stack--sm">
            <dl className="def-list">
              <dt>Base URL</dt>
              <dd className="mono-value">{API_BASE_URL}</dd>
              <dt>Frontend origin</dt>
              <dd className="mono-value">
                {typeof window !== 'undefined' ? window.location.origin : 'n/a'}
              </dd>
              <dt>Proxy target</dt>
              <dd className="mono-value">http://localhost:8080</dd>
              <dt>Health endpoint</dt>
              <dd className="mono-value">
                {API_BASE_URL.replace(/\/$/, '')}/health
              </dd>
            </dl>
            <p className="text-subtle text-xs">
              Set <code>VITE_API_BASE_URL</code> in a <code>.env</code> file to point the
              app at a different API host. In development, requests to{' '}
              <code>{API_BASE_URL}</code> are proxied to the Spring Boot backend by Vite.
            </p>
          </div>
        </section>

        <section className="section">
          <div className="section__header">
            <div>
              <h2 className="section__title">Backend health</h2>
              <span className="section__hint">GET {API_BASE_URL}/health</span>
            </div>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={health.refetch}
              disabled={health.loading}
            >
              {health.loading ? 'Checking…' : 'Run health check'}
            </button>
          </div>
          <div className="section__body">
            {health.loading ? (
              <Loader label="Contacting backend…" />
            ) : health.error ? (
              <ErrorState
                error={health.error}
                title="Backend unreachable"
                onRetry={health.refetch}
                retryLabel="Retry health check"
              />
            ) : health.data ? (
              <div className="stack stack--sm">
                <div className="row">
                  <span className={`badge badge--${isUp ? 'success' : 'danger'}`}>
                    <span className="badge__dot" aria-hidden="true" />
                    {status || 'UNKNOWN'}
                  </span>
                  {!isUp ? (
                    <span className="text-subtle text-sm">
                      Backend reported a non-UP status.
                    </span>
                  ) : null}
                </div>
                <dl className="def-list">
                  <dt>Status</dt>
                  <dd>{health.data.status || '-'}</dd>
                  <dt>Application</dt>
                  <dd>{health.data.application || '-'}</dd>
                  <dt>Database</dt>
                  <dd>{health.data.database || '-'}</dd>
                  <dt>Timestamp</dt>
                  <dd className="mono-value">{formatDateTime(health.data.timestamp)}</dd>
                </dl>
              </div>
            ) : (
              <div className="state state--empty">
                <span className="state__icon" aria-hidden="true">
                  ◎
                </span>
                <p className="state__title">No health check run yet</p>
                <p className="state__message">
                  Run a health check to verify the backend is reachable and its database
                  connection is UP.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="section">
        <div className="section__header">
          <h2 className="section__title">P&amp;L methodology</h2>
        </div>
        <div className="section__body stack stack--sm">
          <h3 className="field__label">Cost basis — FIFO</h3>
          <p className="text-muted text-sm">
            The backend matches confirmed buy and sell trades per commodity and per unit
            of measurement using FIFO (First-In, First-Out). Each sell is matched against
            the oldest open buy lots; realized P&amp;L is the sum of
            (sell price − matched buy price) × matched quantity.
          </p>

          <h3 className="field__label mt-4">Realized P&amp;L</h3>
          <p className="text-muted text-sm">
            Reported only for quantities that have been matched and closed. When the
            backend indicates the figure is not available, the UI renders{' '}
            <strong>“Not Available”</strong> instead of a number.
          </p>

          <h3 className="field__label mt-4">Unrealized P&amp;L</h3>
          <p className="text-muted text-sm">
            Unrealized P&amp;L requires mark-to-market prices, which are not part of
            version 1 of this system. It is therefore always reported as{' '}
            <strong>“Not Available”</strong>, and open positions are communicated in
            units (for example, “200 BARREL buy position remains open”).
          </p>

          <h3 className="field__label mt-4">Rounding</h3>
          <p className="text-muted text-sm">
            Currency values are formatted with two decimals; quantities up to four
            decimals. All figures arrive pre-computed from the API — the frontend only
            formats them for display.
          </p>

          <DisclaimerBanner
            className="mt-4"
            message={DEFAULT_PNL_DISCLAIMER}
            method="FIFO"
          />
        </div>
      </section>

      <section className="section">
        <div className="section__header">
          <h2 className="section__title">Application information</h2>
        </div>
        <div className="section__body">
          <dl className="def-list">
            {APP_INFO.map((item) => (
              <React.Fragment key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </React.Fragment>
            ))}
            <dt>Backend status</dt>
            <dd>
              {health.data ? (
                <StatusBadge
                  value={health.data.status || 'UNKNOWN'}
                  label={health.data.status || 'UNKNOWN'}
                  variant={isUp ? 'success' : 'danger'}
                />
              ) : (
                <span className="text-subtle">Not checked</span>
              )}
            </dd>
          </dl>
        </div>
      </section>
    </div>
  )
}

export default SettingsPage

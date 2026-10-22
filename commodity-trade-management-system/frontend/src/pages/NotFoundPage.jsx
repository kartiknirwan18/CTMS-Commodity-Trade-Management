import React from 'react'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="page">
      <section className="section">
        <div className="state">
          <span className="state__icon" aria-hidden="true">
            404
          </span>
          <p className="state__title">Page not found</p>
          <p className="state__message">
            The page you requested does not exist. Use the navigation to return to the
            dashboard, or jump straight to the trade ledger.
          </p>
          <div className="row mt-2">
            <Link className="btn btn--primary" to="/">
              Back to dashboard
            </Link>
            <Link className="btn" to="/trades">
              Go to trades
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default NotFoundPage

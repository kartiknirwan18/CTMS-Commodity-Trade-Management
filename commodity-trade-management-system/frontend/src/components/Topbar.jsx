import React from 'react'
import { API_BASE_URL } from '../services/api'

/**
 * Sticky application header. `onToggleSidebar` shows the mobile menu button.
 */
export function Topbar({ title = 'Dashboard', subtitle, onToggleSidebar, actions = null }) {
  return (
    <header className="topbar">
      <button
        type="button"
        className="btn btn--ghost btn--icon topbar__toggle"
        onClick={onToggleSidebar}
        aria-label="Toggle navigation menu"
      >
        ☰
      </button>

      <div className="topbar__headings">
        <span className="topbar__title">{title}</span>
        <span className="topbar__subtitle">
          {subtitle || `API endpoint: ${API_BASE_URL}`}
        </span>
      </div>

      <div className="topbar__actions">{actions}</div>
    </header>
  )
}

export default Topbar

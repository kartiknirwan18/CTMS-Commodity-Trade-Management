import React from 'react'
import { NavLink } from 'react-router-dom'

export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '▦', end: true },
  { to: '/commodities', label: 'Commodities', icon: '⛽' },
  { to: '/trades', label: 'Trades', icon: '⇄' },
  { to: '/contracts', label: 'Contracts', icon: '📄' },
  { to: '/reports', label: 'Reports', icon: '📊' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

/** Dark slate navigation rail. Becomes an off-canvas drawer under 900px. */
export function Sidebar({ open = false, onNavigate }) {
  return (
    <nav
      className={`sidebar${open ? ' is-open' : ''}`}
      aria-label="Main navigation"
    >
      <div className="sidebar__brand">
        <span className="sidebar__logo" aria-hidden="true">
          CT
        </span>
        <span className="sidebar__brand-text">
          <span className="sidebar__title">CTMS</span>
          <span className="sidebar__subtitle">Commodity Trade Management</span>
        </span>
      </div>

      <div className="sidebar__nav">
        <span className="sidebar__section-label">Workspace</span>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `nav-item${isActive ? ' is-active' : ''}`
            }
            onClick={onNavigate}
          >
            <span className="nav-item__icon" aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
      </div>

      <div className="sidebar__footer">
        v1.0.0 · Commodity Trade Management System
      </div>
    </nav>
  )
}

export default Sidebar

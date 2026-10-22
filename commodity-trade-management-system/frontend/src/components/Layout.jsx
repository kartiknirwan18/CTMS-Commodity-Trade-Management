import React, { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const ROUTE_TITLES = [
  { match: (p) => p === '/', title: 'Dashboard', subtitle: 'Portfolio overview and recent activity' },
  { match: (p) => p.startsWith('/commodities'), title: 'Commodities', subtitle: 'Reference data for traded commodities' },
  { match: (p) => p.startsWith('/trades'), title: 'Trades', subtitle: 'Buy and sell trade ledger' },
  { match: (p) => p.startsWith('/contracts'), title: 'Contracts', subtitle: 'Trade contracts and delivery schedule' },
  { match: (p) => p.startsWith('/reports'), title: 'Reports', subtitle: 'P&L, volume and activity analysis' },
  { match: (p) => p.startsWith('/settings'), title: 'Settings', subtitle: 'Configuration, health and methodology' },
]

function titleFor(pathname) {
  const found = ROUTE_TITLES.find((entry) => entry.match(pathname))
  return found || { title: 'CTMS', subtitle: 'Commodity Trade Management System' }
}

/**
 * App shell: dark sidebar + topbar + scrollable content region.
 * Under 900px the sidebar collapses into a drawer with a backdrop.
 */
export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { title, subtitle } = titleFor(location.pathname)

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />

      {sidebarOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation menu"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="main">
        <Topbar
          title={title}
          subtitle={subtitle}
          onToggleSidebar={() => setSidebarOpen((value) => !value)}
        />
        <main className="content" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout

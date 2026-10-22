import React from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ToastProvider from './components/Toast'
import DashboardPage from './pages/DashboardPage'
import CommoditiesPage from './pages/CommoditiesPage'
import TradesPage from './pages/TradesPage'
import ContractsPage from './pages/ContractsPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'
import NotFoundPage from './pages/NotFoundPage'

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="commodities" element={<CommoditiesPage />} />
            <Route path="trades" element={<TradesPage />} />
            <Route path="contracts" element={<ContractsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App

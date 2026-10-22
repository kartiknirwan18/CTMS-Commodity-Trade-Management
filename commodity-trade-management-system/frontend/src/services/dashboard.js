import { apiGet } from './api'

/** GET /api/dashboard/summary */
export function getDashboardSummary() {
  return apiGet('/dashboard/summary')
}

/** GET /api/dashboard/trade-volume -> [{ commodityId, commodityName, ... }] */
export function getTradeVolumeByCommodity() {
  return apiGet('/dashboard/trade-volume')
}

/** GET /api/dashboard/trade-activity?months=6 */
export function getTradeActivity(months = 6) {
  return apiGet('/dashboard/trade-activity', { params: { months } })
}

/** GET /api/dashboard/pnl */
export function getPnlReport() {
  return apiGet('/dashboard/pnl')
}

export default {
  getDashboardSummary,
  getTradeVolumeByCommodity,
  getTradeActivity,
  getPnlReport,
}

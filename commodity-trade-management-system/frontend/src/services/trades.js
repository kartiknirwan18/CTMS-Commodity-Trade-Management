import { apiGet, apiPatch, apiPost, apiPut } from './api'

const FILTER_KEYS = [
  'page',
  'size',
  'sort',
  'commodityId',
  'tradeType',
  'status',
  'from',
  'to',
  'reference',
]

function buildParams(params = {}) {
  const query = {}
  for (const key of FILTER_KEYS) {
    const value = params[key]
    if (value !== undefined && value !== null && value !== '') {
      query[key] = value
    }
  }
  return query
}

/** GET /api/trades -> page envelope { content, page, size, totalElements, ... } */
export function listTrades(params = {}) {
  return apiGet('/trades', { params: buildParams(params) })
}

/** GET /api/trades/{id} */
export function getTrade(id) {
  return apiGet(`/trades/${id}`)
}

/** POST /api/trades -> 201 Trade */
export function createTrade(payload) {
  return apiPost('/trades', payload)
}

/** PUT /api/trades/{id} -> 200 Trade */
export function updateTrade(id, payload) {
  return apiPut(`/trades/${id}`, payload)
}

/** PATCH /api/trades/{id}/status body { status } -> 200 Trade */
export function setTradeStatus(id, status) {
  return apiPatch(`/trades/${id}/status`, { status })
}

/** GET /api/trades/{id}/pnl -> PnlResponse */
export function getTradePnl(id) {
  return apiGet(`/trades/${id}/pnl`)
}

export default {
  listTrades,
  getTrade,
  createTrade,
  updateTrade,
  setTradeStatus,
  getTradePnl,
}

import { apiGet, apiPost, apiPut } from './api'

const FILTER_KEYS = [
  'page',
  'size',
  'sort',
  'status',
  'commodityId',
  'reference',
  'from',
  'to',
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

/** GET /api/contracts -> page envelope of Contract */
export function listContracts(params = {}) {
  return apiGet('/contracts', { params: buildParams(params) })
}

/** GET /api/contracts/{id} */
export function getContract(id) {
  return apiGet(`/contracts/${id}`)
}

/** POST /api/contracts -> 201 Contract */
export function createContract(payload) {
  return apiPost('/contracts', payload)
}

/** PUT /api/contracts/{id} -> 200 Contract */
export function updateContract(id, payload) {
  return apiPut(`/contracts/${id}`, payload)
}

/** GET /api/contracts/upcoming-deliveries?days=30 -> [UpcomingDelivery] */
export function getUpcomingDeliveries(days = 30) {
  return apiGet('/contracts/upcoming-deliveries', { params: { days } })
}

export default {
  listContracts,
  getContract,
  createContract,
  updateContract,
  getUpcomingDeliveries,
}

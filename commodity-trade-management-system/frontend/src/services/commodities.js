import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from './api'

/**
 * GET /api/commodities?q=&active=&type=
 * Returns a plain array of Commodity.
 */
export function listCommodities(params = {}) {
  const query = {}
  if (params.q) query.q = params.q
  if (params.active !== undefined && params.active !== null && params.active !== '')
    query.active = params.active
  if (params.type) query.type = params.type
  return apiGet('/commodities', { params: query })
}

/** GET /api/commodities/{id} */
export function getCommodity(id) {
  return apiGet(`/commodities/${id}`)
}

/** POST /api/commodities -> 201 Commodity */
export function createCommodity(payload) {
  return apiPost('/commodities', payload)
}

/** PUT /api/commodities/{id} -> 200 Commodity */
export function updateCommodity(id, payload) {
  return apiPut(`/commodities/${id}`, payload)
}

/** PATCH /api/commodities/{id}/status body { active } -> 200 Commodity */
export function setCommodityStatus(id, active) {
  return apiPatch(`/commodities/${id}/status`, { active })
}

/** DELETE /api/commodities/{id} -> 204 (or 409 when in use) */
export function deleteCommodity(id) {
  return apiDelete(`/commodities/${id}`)
}

export default {
  listCommodities,
  getCommodity,
  createCommodity,
  updateCommodity,
  setCommodityStatus,
  deleteCommodity,
}

import axios from 'axios'

/**
 * Base URL for every REST call.
 * Defaults to `/api`, which the Vite dev/preview server proxies to
 * http://localhost:8080 (see vite.config.js).
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

/**
 * Normalized API error.
 * The backend returns:
 * {
 *   "timestamp": "...", "status": 400, "error": "Bad Request",
 *   "message": "Validation failed", "path": "/api/trades",
 *   "fieldErrors": [{ "field": "quantity", "message": "..." }]
 * }
 */
export class ApiError extends Error {
  constructor({
    message,
    status = 0,
    fieldErrors = [],
    timestamp = null,
    path = null,
    isNetworkError = false,
    cause = null,
  }) {
    super(message || 'Request failed')
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = Array.isArray(fieldErrors) ? fieldErrors : []
    this.timestamp = timestamp
    this.path = path
    this.isNetworkError = isNetworkError
    this.cause = cause
  }

  /** fieldErrors array -> { [field]: message } */
  get fieldErrorMap() {
    return toFieldMap(this.fieldErrors)
  }
}

/** Converts a fieldErrors array into a lookup object. */
export function toFieldMap(fieldErrors) {
  const map = {}
  if (!Array.isArray(fieldErrors)) return map
  for (const entry of fieldErrors) {
    if (entry && entry.field) {
      map[entry.field] = entry.message || 'Invalid value'
    }
  }
  return map
}

/** Turns anything thrown by axios (or by us) into an ApiError. */
export function normalizeError(error) {
  if (error instanceof ApiError) return error

  if (axios.isAxiosError?.(error) || error?.isAxiosError) {
    const response = error.response

    if (!response) {
      return new ApiError({
        message:
          'Unable to reach the server. Check that the backend is running on port 8080.',
        status: 0,
        isNetworkError: true,
        cause: error,
      })
    }

    const data = response.data || {}
    const message =
      (typeof data === 'string' && data) ||
      data.message ||
      data.error ||
      `Request failed with status ${response.status}`

    return new ApiError({
      message,
      status: response.status,
      fieldErrors: Array.isArray(data.fieldErrors) ? data.fieldErrors : [],
      timestamp: data.timestamp || null,
      path: data.path || null,
      cause: error,
    })
  }

  return new ApiError({
    message: error?.message || 'Unexpected error',
    status: 0,
    cause: error,
  })
}

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(normalizeError(error)),
)

/** GET helper that unwraps `response.data`. */
export async function apiGet(url, config) {
  const response = await client.get(url, config)
  return response.data
}

export async function apiPost(url, body, config) {
  const response = await client.post(url, body, config)
  return response.data
}

export async function apiPut(url, body, config) {
  const response = await client.put(url, body, config)
  return response.data
}

export async function apiPatch(url, body, config) {
  const response = await client.patch(url, body, config)
  return response.data
}

export async function apiDelete(url, config) {
  const response = await client.delete(url, config)
  return response.data
}

/** GET /api/health */
export function getHealth() {
  return apiGet('/health')
}

export default client

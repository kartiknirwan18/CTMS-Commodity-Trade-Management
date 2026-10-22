import React from 'react'
import { toFieldMap } from '../services/api'

/**
 * Error state with a retry action.
 * Accepts either an Error (with `message` / `fieldErrors` / `status`) or a string.
 */
export function ErrorState({
  error,
  title = 'Something went wrong',
  onRetry,
  retryLabel = 'Try again',
}) {
  const message =
    typeof error === 'string'
      ? error
      : error?.message || 'An unexpected error occurred.'

  const fieldErrors = error?.fieldErrors
  const fieldMap = Array.isArray(fieldErrors) ? toFieldMap(fieldErrors) : null
  const fieldMessages = fieldMap ? Object.values(fieldMap) : []

  return (
    <div className="state state--error" role="alert">
      <span className="state__icon" aria-hidden="true">
        ⚠
      </span>
      <p className="state__title">{title}</p>
      <p className="state__message">{message}</p>
      {fieldMessages.length > 0 ? (
        <ul className="state__message text-sm" style={{ textAlign: 'left' }}>
          {fieldMessages.map((msg, index) => (
            <li key={index}>{msg}</li>
          ))}
        </ul>
      ) : null}
      {onRetry ? (
        <button type="button" className="btn btn--sm mt-2" onClick={onRetry}>
          {retryLabel}
        </button>
      ) : null}
    </div>
  )
}

export default ErrorState

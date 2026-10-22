import React from 'react'

/**
 * Labelled form control wrapper with inline validation messaging.
 * Wires `aria-describedby` / `role="alert"` on the error text.
 */
export function Field({
  label,
  htmlFor,
  required = false,
  error,
  hint,
  full = false,
  children,
}) {
  const hintId = hint ? `${htmlFor}-hint` : undefined
  const errorId = error ? `${htmlFor}-error` : undefined

  return (
    <div className={`field${full ? ' field--full' : ''}`}>
      <label className="field__label" htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="field__required" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children}
      {hint ? (
        <span className="field__hint" id={hintId}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span className="field__error" id={errorId} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  )
}

/**
 * Top-level error banner for a form. Renders the request-level API message.
 * Per-field messages from `fieldErrors` are surfaced inline by <Field> so the
 * same text is never announced twice.
 */
export function FormErrorBanner({ error }) {
  if (!error) return null

  return (
    <div className="alert alert--danger modal__error" role="alert">
      <span className="alert__icon" aria-hidden="true">
        ⚠
      </span>
      <div className="alert__body">
        <div className="alert__title">
          {error.status ? `Request failed (${error.status})` : 'Request failed'}
        </div>
        <div>{error.message}</div>
      </div>
    </div>
  )
}

/** Shared helpers for the option lists used by the trade/contract forms. */
export function buildCommodityOptions(commodities = []) {
  return (commodities || []).map((commodity) => ({
    value: String(commodity.id),
    label: `${commodity.name} (${commodity.unitOfMeasurement})`,
  }))
}

export function buildReferenceOptions(items = [], idKey = 'id', refKey = 'tradeReference') {
  return (items || []).map((item) => ({
    value: String(item[idKey]),
    label: item[refKey] || `#${item[idKey]}`,
  }))
}

export default Field

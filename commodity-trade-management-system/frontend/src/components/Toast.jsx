import React, { useCallback, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ToastContext } from '../hooks/useToast'

const DEFAULT_TITLE = {
  success: 'Success',
  error: 'Error',
  warning: 'Warning',
  info: 'Information',
}

const ICONS = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}

/** Presentational toast row. */
export function Toast({ toast, onDismiss }) {
  const { id, type = 'info', title, message } = toast
  return (
    <div
      className={`toast toast--${type}`}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      <span aria-hidden="true">{ICONS[type] || ICONS.info}</span>
      <div className="toast__body">
        <div className="toast__title">{title || DEFAULT_TITLE[type] || 'Notice'}</div>
        {message ? <div className="toast__message">{message}</div> : null}
      </div>
      <button
        type="button"
        className="toast__close"
        onClick={() => onDismiss(id)}
        aria-label="Dismiss notification"
      >
        &times;
      </button>
    </div>
  )
}

/**
 * Provides the toast API to the tree and renders the toast viewport.
 * API: { toasts, pushToast, success, error, warning, info, dismiss }
 */
export function ToastProvider({ children, autoDismissMs = 6000 }) {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef(new Map())
  const counterRef = useRef(0)

  const dismiss = useCallback((id) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const pushToast = useCallback(
    ({ type = 'info', title, message } = {}) => {
      counterRef.current += 1
      const id = counterRef.current
      setToasts((prev) => [...prev, { id, type, title, message }])
      if (autoDismissMs > 0) {
        const timer = setTimeout(() => dismiss(id), autoDismissMs)
        timersRef.current.set(id, timer)
      }
      return id
    },
    [autoDismissMs, dismiss],
  )

  const value = useMemo(
    () => ({
      toasts,
      pushToast,
      dismiss,
      success: (message, title) => pushToast({ type: 'success', message, title }),
      error: (message, title) => pushToast({ type: 'error', message, title }),
      warning: (message, title) => pushToast({ type: 'warning', message, title }),
      info: (message, title) => pushToast({ type: 'info', message, title }),
    }),
    [toasts, pushToast, dismiss],
  )

  const viewport =
    typeof document === 'undefined' ? null : (
      <div className="toast-viewport" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    )

  return (
    <ToastContext.Provider value={value}>
      {children}
      {viewport ? createPortal(viewport, document.body) : viewport}
    </ToastContext.Provider>
  )
}

export default ToastProvider

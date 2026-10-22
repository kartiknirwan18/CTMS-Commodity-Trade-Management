import { createContext, useContext } from 'react'

export const ToastContext = createContext(null)

const NOOP_TOAST = {
  toasts: [],
  pushToast: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
  warning: () => {},
  dismiss: () => {},
}

/**
 * Access the toast API: { toasts, success, error, info, warning, dismiss }.
 * Falls back to no-ops when rendered outside a <ToastProvider> so that
 * presentational components stay testable in isolation.
 */
export function useToast() {
  const ctx = useContext(ToastContext)
  return ctx || NOOP_TOAST
}

export default useToast

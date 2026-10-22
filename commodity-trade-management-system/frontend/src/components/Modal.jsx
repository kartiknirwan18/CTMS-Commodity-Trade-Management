import React, { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Accessible modal dialog.
 * - Esc closes, overlay click closes (configurable)
 * - Focus moves into the dialog on open and is restored on close
 * - Tab is trapped inside the dialog
 */
export function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer = null,
  size = 'md',
  closeOnOverlay = true,
  labelledById,
}) {
  const dialogRef = useRef(null)
  const previouslyFocused = useRef(null)
  const generatedId = useId()
  const titleId = labelledById || `modal-title-${generatedId}`

  // Keep a stable reference so the effect below only reacts to `open`.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return undefined

    previouslyFocused.current = document.activeElement

    const dialog = dialogRef.current
    if (dialog) {
      const first = dialog.querySelector(FOCUSABLE)
      if (first) first.focus()
      else dialog.focus()
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCloseRef.current?.()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return

      const nodes = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE)).filter(
        (node) => node.offsetParent !== null || node === document.activeElement,
      )
      if (nodes.length === 0) return

      const first = nodes[0]
      const last = nodes[nodes.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.body.style.overflow = previousOverflow
      if (previouslyFocused.current?.focus) previouslyFocused.current.focus()
    }
  }, [open])

  if (!open) return null

  const sizeClass = size === 'sm' ? 'modal modal--sm' : size === 'lg' ? 'modal modal--lg' : 'modal'

  const content = (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (closeOnOverlay && event.target === event.currentTarget) onClose?.()
      }}
    >
      <div
        ref={dialogRef}
        className={sizeClass}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="modal__header">
          <div>
            <h2 className="modal__title" id={titleId}>
              {title}
            </h2>
            {subtitle ? <p className="modal__subtitle">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className="modal__close"
            onClick={() => onClose?.()}
            aria-label="Close dialog"
          >
            &times;
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer ? <footer className="modal__footer">{footer}</footer> : null}
      </div>
    </div>
  )

  if (typeof document === 'undefined') return content
  return createPortal(content, document.body)
}

export default Modal

import React from 'react'
import Modal from './Modal'

/**
 * Confirmation dialog for destructive / irreversible actions.
 * Requires an explicit confirm click before `onConfirm` runs.
 */
export function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  details = null,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
  danger = true,
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={loading ? () => {} : onCancel}
      size="sm"
      footer={
        <>
          <button
            type="button"
            className="btn"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? 'btn btn--danger' : 'btn btn--primary'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="confirm__row">
        <span className="confirm__icon" aria-hidden="true">
          !
        </span>
        <div>
          <p className="confirm__text" style={{ marginTop: 0 }}>
            {message}
          </p>
          {details ? <div className="mt-2">{details}</div> : null}
        </div>
      </div>
    </Modal>
  )
}

export default ConfirmDialog

import React from 'react'

/**
 * Neutral empty state. `message` should tell the user what to do next.
 */
export function EmptyState({
  icon = '◍',
  title = 'Nothing to show',
  message,
  action = null,
}) {
  return (
    <div className="state state--empty">
      <span className="state__icon" aria-hidden="true">
        {icon}
      </span>
      <p className="state__title">{title}</p>
      {message ? <p className="state__message">{message}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

export default EmptyState

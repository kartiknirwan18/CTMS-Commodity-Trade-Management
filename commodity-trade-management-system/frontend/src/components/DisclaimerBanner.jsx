import React from 'react'

export const DEFAULT_PNL_DISCLAIMER =
  'Estimated P&L for demonstration purposes only - not official accounting or financial advice.'

/**
 * Warning-styled notice that must accompany any P&L figure shown in the UI.
 */
export function DisclaimerBanner({
  title = 'P&L Disclaimer',
  message = DEFAULT_PNL_DISCLAIMER,
  method,
  className = '',
}) {
  return (
    <div className={`disclaimer ${className}`.trim()} role="note">
      <span className="disclaimer__icon" aria-hidden="true">
        ⚠
      </span>
      <div>
        <strong>{title}</strong>
        <span>{message}</span>
        {method ? <span> Cost basis method: {method}.</span> : null}
      </div>
    </div>
  )
}

export default DisclaimerBanner

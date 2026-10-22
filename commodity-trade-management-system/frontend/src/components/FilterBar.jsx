import React from 'react'

/**
 * Layout container for search/filter controls.
 * Children are expected to be `.field` elements; `actions` renders on the right.
 */
export function FilterBar({ children, actions = null, onReset, className = '' }) {
  return (
    <div className={`filter-bar ${className}`.trim()} role="search">
      {children}
      {onReset || actions ? (
        <div className="filter-bar__actions">
          {actions}
          {onReset ? (
            <button type="button" className="btn btn--ghost" onClick={onReset}>
              Reset
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default FilterBar

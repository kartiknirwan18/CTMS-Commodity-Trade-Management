import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Runs an async function and tracks { data, loading, error } plus a refetch().
 *
 * @param {Function} asyncFn  async () => data
 * @param {Array} deps        dependency list that triggers a refetch
 * @param {Object} [options]
 * @param {boolean} [options.immediate=true] run on mount/deps change
 * @param {*} [options.initialData=null]
 */
export function useAsync(asyncFn, deps = [], options = {}) {
  const { immediate = true, initialData = null } = options

  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(Boolean(immediate))
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  const mountedRef = useRef(true)
  const fnRef = useRef(asyncFn)
  fnRef.current = asyncFn

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const run = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fnRef.current()
      if (mountedRef.current) setData(result)
      return result
    } catch (err) {
      if (mountedRef.current) setError(err)
      return undefined
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Skip the first run when `immediate` is false, but always honour an
    // explicit refetch() (reloadKey > 0).
    if (!immediate && reloadKey === 0) return undefined
    run()
    return undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey, immediate])

  /** Re-runs the async function; useful for retry buttons and refresh actions. */
  const refetch = useCallback(() => {
    setReloadKey((k) => k + 1)
  }, [])

  return { data, loading, error, refetch, setData }
}

export default useAsync

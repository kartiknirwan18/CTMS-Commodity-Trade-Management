import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../lib/api';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Small data-fetching hook.
 *
 * `deps` controls refetching exactly like a `useEffect` dependency list.
 * Stale responses are discarded so rapid filter changes cannot overwrite newer
 * results.
 */
export function useAsyncData<T>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
  options: { enabled?: boolean; keepPrevious?: boolean } = {},
) {
  const { enabled = true, keepPrevious = false } = options;
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: enabled, error: null });
  const requestId = useRef(0);

  const run = useCallback(async () => {
    const id = requestId.current + 1;
    requestId.current = id;
    setState((previous) => ({
      data: keepPrevious ? previous.data : null,
      loading: true,
      error: null,
    }));

    try {
      const data = await loader();
      if (requestId.current !== id) return;
      setState({ data, loading: false, error: null });
    } catch (error) {
      if (requestId.current !== id) return;
      const message =
        error instanceof ApiError ? error.message : 'Something went wrong while loading data';
      setState({ data: keepPrevious ? state.data : null, loading: false, error: message });
    }
    // `loader` is intentionally re-created by callers on every render; the
    // dependency list is controlled by `deps` instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keepPrevious, ...deps]);

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, run]);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    reload: run,
    setData: (data: T | null) => setState((previous) => ({ ...previous, data })),
  };
}

/** Debounces a rapidly changing value (search inputs, sliders). */
export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/** Tracks a window media query, used to adapt layouts on mobile. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const list = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(list.matches);
    list.addEventListener('change', handler);
    return () => list.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/** Locks body scrolling while a modal is open. */
export function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return undefined;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [locked]);
}

export default useAsyncData;

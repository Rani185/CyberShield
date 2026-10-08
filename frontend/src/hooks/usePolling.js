import { useEffect, useRef } from 'react';

/**
 * Polls `fn` every `intervalMs` milliseconds.
 *
 * @param {() => void} fn         — async or sync function to call
 * @param {number}     intervalMs — polling interval in ms
 * @param {boolean}    immediate  — if true (default), calls fn immediately on mount
 *
 * The hook captures the latest `fn` in a ref so that stale closures never
 * prevent updated state / props from being seen.
 */
export function usePolling(fn, intervalMs, immediate = true) {
  const savedFn = useRef(fn);

  // Keep ref in sync with latest fn
  useEffect(() => {
    savedFn.current = fn;
  }, [fn]);

  useEffect(() => {
    if (immediate) savedFn.current();
    const id = setInterval(() => savedFn.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, immediate]); // eslint-disable-line react-hooks/exhaustive-deps
}

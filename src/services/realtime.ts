import { useEffect, useRef } from 'react';
import { subscribeToEvents, type ChangeSignal } from './apiService';

/**
 * Live cross-role refresh.
 *
 * Every role reads the same PostgreSQL root, but each screen loads its data once
 * on mount. This hook re-runs the caller's loader whenever another user (or
 * another of your own sessions) changes anything the server deems relevant, and
 * whenever the tab becomes visible again after being backgrounded.
 *
 * `onChange` is kept in a ref so a new function identity each render does not
 * tear down and re-open the SSE stream.
 */
export function useRealtimeSignal(onChange: (signal: ChangeSignal | null) => void) {
  const handler = useRef(onChange);
  handler.current = onChange;

  useEffect(() => {
    const off = subscribeToEvents(signal => handler.current(signal));
    const onVisible = () => { if (document.visibilityState === 'visible') handler.current(null); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { off(); document.removeEventListener('visibilitychange', onVisible); };
  }, []);
}

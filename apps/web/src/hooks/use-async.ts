'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Minimal data-fetching hook with loading / error / data states and a
 * manual refetch. Keeps the API call in one place per feature screen.
 */
export function useAsync<T>(fetcher: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  // Monotonic request id — a response is only committed if it is still the
  // latest request, so a slow stale response can never overwrite the results
  // of a newer one (rapid filter changes), and unmounted components never
  // setState (the cleanup bumps the id to invalidate any in-flight request).
  const requestIdRef = useRef(0);

  const run = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      if (requestId === requestIdRef.current) setData(result);
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, deps);

  useEffect(() => {
    void run();
  }, [run]);

  // Invalidate in-flight requests when the component unmounts.
  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
    };
  }, []);

  return { data, loading, error, refetch: run };
}

import { useEffect, useRef, useState } from "react";

export interface PollingResult<T> {
  data: T | null;
  error: string | null;
  lastFetched: Date | null;
  refresh: () => void;
}

export function usePolling<T>(
  url: string,
  intervalMs: number,
): PollingResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchOnce = async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const r = await fetch(url, { cache: "no-store", signal: ctrl.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const body = (await r.json()) as T;
      setData(body);
      setError(null);
      setLastFetched(new Date());
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    void fetchOnce();
    const id = window.setInterval(fetchOnce, intervalMs);
    return () => {
      window.clearInterval(id);
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, intervalMs]);

  return { data, error, lastFetched, refresh: fetchOnce };
}

import { useCallback, useEffect, useRef, useState } from 'react';

export function useAsyncData<T>(requestFn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const requestFnRef = useRef(requestFn);

  useEffect(() => {
    requestFnRef.current = requestFn;
  }, [requestFn]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await requestFnRef.current();
      setData(result);
      return result;
    } catch (requestError) {
      setError(requestError);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, deps);

  return { data, loading, error, refresh };
}
import { useCallback, useEffect, useState } from 'react';

export function useAsyncData(loader, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const next = await loader();
      setData(next);
      return next;
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    reload().catch(() => undefined);
  }, [reload]);

  return { data, loading, error, reload, setData };
}

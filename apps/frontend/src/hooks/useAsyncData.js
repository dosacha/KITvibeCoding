import { useCallback, useEffect, useRef, useState } from 'react';

export function useAsyncData(loader, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // 진행 중인 요청 번호 추적 — deps 변경 시 구 응답을 무시한다.
  const reqIdRef = useRef(0);

  const reload = useCallback(async () => {
    const id = ++reqIdRef.current;
    setLoading(true);
    setError('');
    try {
      const next = await loader();
      if (id !== reqIdRef.current) return next; // 구 응답 무시
      setData(next);
      return next;
    } catch (err) {
      if (id !== reqIdRef.current) throw err;
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했어.');
      throw err;
    } finally {
      if (id === reqIdRef.current) setLoading(false);
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    reload().catch(() => undefined);
  }, [reload]);

  return { data, loading, error, reload, setData };
}

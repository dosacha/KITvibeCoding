import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 자동 소멸 플래시 메시지 훅.
 * @param {number} ttl 표시 시간(ms). 기본 3500ms.
 * @returns {{ message, isError, flash, flashError, clear }}
 */
export function useFlashMessage(ttl = 3500) {
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const timerRef = useRef(null);

  const clear = useCallback(() => {
    clearTimeout(timerRef.current);
    setMessage('');
    setIsError(false);
  }, []);

  const show = useCallback((msg, error = false) => {
    clearTimeout(timerRef.current);
    setMessage(msg);
    setIsError(error);
    timerRef.current = setTimeout(clear, ttl);
  }, [clear, ttl]);

  const flash = useCallback((msg) => show(msg, false), [show]);
  const flashError = useCallback((msg) => show(msg, true), [show]);

  // 언마운트 시 타이머 정리
  useEffect(() => () => clearTimeout(timerRef.current), []);

  return { message, isError, flash, flashError, clear };
}

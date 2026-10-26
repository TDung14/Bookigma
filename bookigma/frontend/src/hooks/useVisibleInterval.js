import { useEffect, useRef } from 'react';

/** Gọi callback theo chu kỳ khi tab đang hiển thị, và ngay khi người dùng quay lại tab. */
export default function useVisibleInterval(callback, intervalMs) {
  const latest = useRef(callback);

  useEffect(() => {
    latest.current = callback;
  }, [callback]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== 'hidden') latest.current();
    };
    const timer = setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [intervalMs]);
}

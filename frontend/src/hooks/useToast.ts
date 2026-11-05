import { useCallback, useEffect, useRef, useState } from 'react';

const DURATION_MS = 2300;

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const show = useCallback((text: string) => {
    setMessage(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), DURATION_MS);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { message, show };
}

export type ShowToast = ReturnType<typeof useToast>['show'];

import { useCallback, useEffect, useRef, useState } from "react";

type UseCountdownOptions = {
  onExpire?: () => void;
  tickMs?: number;
};

type UseCountdownResult = {
  isRunning: boolean;
  remainingMs: number;
  remainingSeconds: number;
  start: (seconds: number) => void;
  pause: () => void;
  reset: () => void;
};

export function useCountdown({
  onExpire,
  tickMs = 100,
}: UseCountdownOptions = {}): UseCountdownResult {
  const [deadlineMs, setDeadlineMs] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  const start = useCallback((seconds: number) => {
    const nextRemainingMs = Math.max(0, seconds) * 1000;

    if (nextRemainingMs === 0) {
      setDeadlineMs(null);
      setRemainingMs(0);
      setIsRunning(false);
      onExpireRef.current?.();
      return;
    }

    setDeadlineMs(Date.now() + nextRemainingMs);
    setRemainingMs(nextRemainingMs);
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setDeadlineMs((currentDeadlineMs) => {
      const nextRemainingMs =
        currentDeadlineMs === null ? 0 : Math.max(0, currentDeadlineMs - Date.now());
      setRemainingMs(nextRemainingMs);
      return null;
    });
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    setDeadlineMs(null);
    setRemainingMs(0);
    setIsRunning(false);
  }, []);

  useEffect(() => {
    if (!isRunning || deadlineMs === null) return;

    const updateRemaining = () => {
      const nextRemainingMs = Math.max(0, deadlineMs - Date.now());
      setRemainingMs(nextRemainingMs);

      if (nextRemainingMs > 0) return false;

      setDeadlineMs(null);
      setIsRunning(false);
      onExpireRef.current?.();
      return true;
    };

    if (updateRemaining()) return;

    const intervalId = window.setInterval(() => {
      if (updateRemaining()) {
        window.clearInterval(intervalId);
      }
    }, tickMs);

    return () => window.clearInterval(intervalId);
  }, [deadlineMs, isRunning, tickMs]);

  return {
    isRunning,
    remainingMs,
    remainingSeconds: remainingMs <= 0 ? 0 : Math.ceil(remainingMs / 1000),
    start,
    pause,
    reset,
  };
}

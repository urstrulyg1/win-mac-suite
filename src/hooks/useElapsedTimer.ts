import { useEffect, useRef, useState } from 'react';

/**
 * Drives a high-resolution elapsed-seconds counter while `active` is true.
 * Resets to 0 whenever the timer becomes active and freezes when inactive.
 */
export function useElapsedTimer(active: boolean): number {
  const [elapsed, setElapsed] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!active) return;

    startedAtRef.current = performance.now();
    setElapsed(0);

    const tick = () => {
      if (startedAtRef.current != null) {
        setElapsed((performance.now() - startedAtRef.current) / 1000);
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  return elapsed;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(sec)}`;
  return `${pad(m)}:${pad(sec)}`;
}

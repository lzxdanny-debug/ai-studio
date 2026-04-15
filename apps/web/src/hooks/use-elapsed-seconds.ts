import { useState, useEffect } from 'react';

/**
 * Returns elapsed seconds since the given startTime, updated every second.
 * Only runs while `active` is true (e.g. task is processing).
 */
export function useElapsedSeconds(
  startTime: string | Date | undefined,
  active = true,
): number {
  const [elapsed, setElapsed] = useState<number>(() => {
    if (!startTime) return 0;
    return Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
  });

  useEffect(() => {
    if (!active || !startTime) return;

    const base = new Date(startTime).getTime();
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - base) / 1000));
    }, 1000);

    return () => clearInterval(id);
  }, [startTime, active]);

  return elapsed;
}

/** Format elapsed seconds into "Xs" or "Xm Ys" */
export function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

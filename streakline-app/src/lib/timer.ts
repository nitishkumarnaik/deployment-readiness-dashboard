import type { ActiveTimer } from './types';

/** Wall-clock time for event handlers (kept out of render). */
export function clockNow(): number {
  return Date.now();
}

export function elapsedMs(timer: ActiveTimer, now: number): number {
  return timer.accumulatedMs + (timer.startedAt !== null ? Math.max(0, now - timer.startedAt) : 0);
}

/** "04:09" or "1:02:03" */
export function formatClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const two = (n: number) => (n < 10 ? `0${n}` : String(n));
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`;
}

/** Minutes to log for a finished session: rounded, at least 1. */
export function minutesToLog(ms: number): number {
  return Math.max(1, Math.round(ms / 60000));
}

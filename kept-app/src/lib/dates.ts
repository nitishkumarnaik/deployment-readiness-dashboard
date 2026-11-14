/**
 * Calendar helpers built on local "date keys" (YYYY-MM-DD).
 * Date keys avoid time-zone and daylight-saving surprises: every key is
 * converted to local noon before doing arithmetic.
 */

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 24 * 60 * 60 * 1000;

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function todayKey(now: Date = new Date()): string {
  return toDateKey(now);
}

export function addDays(key: string, n: number): string {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + n);
  return toDateKey(d);
}

/** Whole days from `b` to `a` (positive when `a` is later). */
export function diffDays(a: string, b: string): number {
  return Math.round((fromDateKey(a).getTime() - fromDateKey(b).getTime()) / DAY_MS);
}

/** 0 = Sunday … 6 = Saturday */
export function weekdayOf(key: string): number {
  return fromDateKey(key).getDay();
}

/** Start of the week containing `key`. Weeks start on Monday by default. */
export function startOfWeek(key: string, weekStartsOn = 1): string {
  const offset = (weekdayOf(key) - weekStartsOn + 7) % 7;
  return addDays(key, -offset);
}

export function weekDays(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/** "Mon 14 Nov" */
export function formatDay(key: string): string {
  const d = fromDateKey(key);
  return `${WEEKDAY_SHORT[d.getDay()]} ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

/** "14 Nov" */
export function formatShortDate(key: string): string {
  const d = fromDateKey(key);
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

/** "14 Nov 2026" */
export function formatLongDate(key: string): string {
  const d = fromDateKey(key);
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export function greetingFor(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

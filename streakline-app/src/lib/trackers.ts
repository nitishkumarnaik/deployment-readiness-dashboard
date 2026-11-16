import { addDays, diffDays } from './dates';
import type { Entry, Tracker } from './types';

export function amountOn(entries: Entry[], trackerId: string, dateKey: string): number {
  let sum = 0;
  for (const e of entries) if (e.trackerId === trackerId && e.dateKey === dateKey) sum += e.amount;
  return sum;
}

/** trackerId → dateKey → amount */
export function amountsByDay(entries: Entry[], trackerId: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of entries) {
    if (e.trackerId !== trackerId) continue;
    map.set(e.dateKey, (map.get(e.dateKey) ?? 0) + e.amount);
  }
  return map;
}

export function isComplete(tracker: Tracker, amount: number): boolean {
  return amount >= tracker.target;
}

/** 0 = nothing logged, 1 = some progress, 2 = goal met */
export function levelFor(tracker: Tracker, amount: number): 0 | 1 | 2 {
  if (amount <= 0) return 0;
  return amount >= tracker.target ? 2 : 1;
}

/**
 * Current streak of days meeting the goal. Today counts once it is met; until
 * then the streak is still alive and counts back from yesterday.
 */
export function currentStreak(tracker: Tracker, entries: Entry[], today: string): number {
  const byDay = amountsByDay(entries, tracker.id);
  let day = (byDay.get(today) ?? 0) >= tracker.target ? today : addDays(today, -1);
  let n = 0;
  while ((byDay.get(day) ?? 0) >= tracker.target) {
    n += 1;
    day = addDays(day, -1);
  }
  return n;
}

export function bestStreak(tracker: Tracker, entries: Entry[]): number {
  const byDay = amountsByDay(entries, tracker.id);
  const done = [...byDay.entries()].filter(([, a]) => a >= tracker.target).map(([d]) => d).sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of done) {
    run = prev && diffDays(d, prev) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/** Number of distinct days with anything logged. */
export function entryDays(tracker: Tracker, entries: Entry[]): number {
  const days = new Set<string>();
  for (const e of entries) if (e.trackerId === tracker.id) days.add(e.dateKey);
  return days.size;
}

/**
 * Share of days the goal was met over the last `days` days (today included),
 * counting only days since the tracker was created. Returns 0..1.
 */
export function consistency(tracker: Tracker, entries: Entry[], today: string, days = 7): number {
  const byDay = amountsByDay(entries, tracker.id);
  let counted = 0;
  let met = 0;
  for (let i = 0; i < days; i++) {
    const d = addDays(today, -i);
    if (d < tracker.createdOn) break;
    // Today only counts once it is met, so mornings don't drag the number down.
    const amount = byDay.get(d) ?? 0;
    if (d === today && amount < tracker.target) continue;
    counted += 1;
    if (amount >= tracker.target) met += 1;
  }
  return counted === 0 ? 0 : met / counted;
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)}m`;
  const h = min / 60;
  return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`;
}

/** Tile text, e.g. "1/1", "2/3", "30m/1h". */
export function progressLabel(tracker: Tracker, amount: number): string {
  if (tracker.kind === 'duration') return `${formatMinutes(amount)}/${formatMinutes(tracker.target)}`;
  return `${amount}/${tracker.target}`;
}

/** Sentence for feed posts, e.g. "90 min of Deep work". */
export function headlineFor(tracker: Tracker, amount: number): string {
  if (tracker.kind === 'duration') return `${Math.round(amount)} min of ${tracker.name}`;
  if (tracker.kind === 'count') return `${amount}× ${tracker.name}`;
  return tracker.name;
}

export function goalLabel(tracker: Tracker): string {
  if (tracker.kind === 'duration') return `${formatMinutes(tracker.target)} a day`;
  if (tracker.kind === 'count') return `${tracker.target}× a day`;
  return 'Once a day';
}

export function activeTrackers(trackers: Tracker[]): Tracker[] {
  return trackers.filter((t) => !t.archived).sort((a, b) => a.order - b.order);
}

/** Last 7 days (oldest first) as levels, for compact strips on posts. */
export function weekLevels(tracker: Tracker, entries: Entry[], today: string): number[] {
  const byDay = amountsByDay(entries, tracker.id);
  return Array.from({ length: 7 }, (_, i) => levelFor(tracker, byDay.get(addDays(today, i - 6)) ?? 0));
}

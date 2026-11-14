import { cycleDayFor, cycleDayWhen, peakDay, symptomProfile, type CycleProfile } from './cycle';
import { diffDays, weekDays } from './dates';
import type { AppData, Profile } from './types';
import { WORKOUTS } from './workouts';

export type DayKind = 'strength' | 'walk' | 'rest';

export interface PlanDay {
  dateKey: string;
  kind: DayKind;
  cycleDay: number | null;
  burden: number;
  reason: string;
  workoutId?: string;
  done: boolean;
}

/** Burden used for daily medications, where cycle position does not apply. */
const FLAT_BURDEN = 1;

/**
 * Builds the week's plan.
 *
 * - Days that already have a logged session count as strength days.
 * - Past days without a session are never scheduled after the fact; missed
 *   sessions move into the rest of the week instead (no shame, no red marks).
 * - Remaining strength sessions go on the lowest-burden days, avoiding
 *   back-to-back strength days when possible.
 * - The peak side-effect day of a weekly cycle becomes a rest day; the other
 *   days get a gentle walk.
 */
export function buildWeekPlan(weekStart: string, data: AppData, today: string, cp?: CycleProfile): PlanDay[] {
  const profile = data.profile as Profile;
  const cycle = cp ?? symptomProfile(data.checkins, data.doses, profile);
  const days = weekDays(weekStart);
  const sessionDays = new Set(data.sessions.map((s) => s.dateKey));

  const info = days.map((dateKey) => {
    const cycleDay = cycleDayFor(dateKey, profile, data.doses);
    const burden = cycleDay === null ? FLAT_BURDEN : cycle.burden[cycleDay];
    return { dateKey, cycleDay, burden };
  });

  const target = Math.max(0, profile.strengthDaysPerWeek);
  const fixed = new Set<number>();
  days.forEach((d, i) => {
    if (sessionDays.has(d)) fixed.add(i);
  });
  const strength = pickStrengthDays(
    info.map((d) => d.burden),
    (i) => diffDays(days[i], today) >= 0,
    fixed,
    target,
  );

  // The plan we would make with the whole week ahead. A day in it, or in the
  // easiest part of the cycle, is a "better day"; anything else is an honest catch-up.
  const ideal = pickStrengthDays(info.map((d) => d.burden), () => true, new Set(), target);
  const easyThreshold = [...cycle.burden].sort((a, b) => a - b)[2];

  const peak = profile.frequency === 'weekly' ? peakDay(cycle) : -1;

  // Rotate A → B → C, continuing from the last session before this week.
  const indexOf = (id: string) => Math.max(0, WORKOUTS.findIndex((w) => w.id === id));
  const before = data.sessions.filter((s) => s.dateKey < weekStart).sort((a, b) => (a.dateKey < b.dateKey ? -1 : 1));
  let next = before.length ? (indexOf(before[before.length - 1].workoutId) + 1) % WORKOUTS.length : 0;

  return info.map((d, i) => {
    const done = sessionDays.has(d.dateKey);
    if (strength.has(i)) {
      const session = data.sessions.find((s) => s.dateKey === d.dateKey);
      const workoutId = session?.workoutId ?? WORKOUTS[next].id;
      next = (indexOf(workoutId) + 1) % WORKOUTS.length;
      const reason = done
        ? 'Session done. Your muscles thank you.'
        : d.cycleDay === null
          ? '20 minutes of strength keeps your muscle working.'
          : ideal.has(i) || d.burden <= easyThreshold
            ? `Strength ${cycleDayWhen(d.cycleDay)}, usually one of your better days.`
            : `Catch-up session ${cycleDayWhen(d.cycleDay)}. The low-energy version still counts.`;
      return { ...d, kind: 'strength' as const, reason, workoutId, done };
    }
    if (d.cycleDay !== null && d.cycleDay === peak) {
      return {
        ...d,
        kind: 'rest' as const,
        reason: 'Side effects usually peak today. Rest, sip water and protect your protein floor.',
        done,
      };
    }
    return {
      ...d,
      kind: 'walk' as const,
      reason: 'A gentle 10–20 minute walk keeps you moving without draining your energy.',
      done,
    };
  });
}

/**
 * Greedy pick of strength days: lowest burden first, ties to the earlier day,
 * no back-to-back days unless there is no other way to reach the target.
 */
export function pickStrengthDays(
  burden: number[],
  available: (i: number) => boolean,
  fixed: Set<number>,
  target: number,
): Set<number> {
  const picked = new Set(fixed);
  const candidates = burden
    .map((b, i) => ({ b, i }))
    .filter((c) => !picked.has(c.i) && available(c.i))
    .sort((a, b) => a.b - b.b || a.i - b.i);
  const adjacent = (i: number) => picked.has(i - 1) || picked.has(i + 1);
  for (const strict of [true, false]) {
    for (const c of candidates) {
      if (picked.size >= target) break;
      if (picked.has(c.i)) continue;
      if (strict && adjacent(c.i)) continue;
      picked.add(c.i);
    }
  }
  return picked;
}

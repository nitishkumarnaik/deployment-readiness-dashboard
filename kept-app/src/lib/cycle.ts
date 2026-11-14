import { diffDays, weekdayOf, WEEKDAY_LONG } from './dates';
import type { CheckIn, DoseLog, Profile } from './types';

/**
 * Dose-cycle intelligence.
 *
 * Weekly GLP-1 users often feel side effects (nausea, fatigue, low appetite)
 * on particular days after their dose. Kept learns each person's pattern from
 * their own check-ins and uses it to place strength sessions on their better
 * days. Until there is enough data it falls back to a typical pattern, and it
 * blends the two per cycle day (shrinkage towards the prior), so a single bad
 * day never swings the plan.
 */

export const CYCLE_LENGTH = 7;

/** Typical symptom burden (0–3 scale) by day after a weekly dose; day 0 = dose day. */
export const PRIOR_BURDEN = [1.0, 1.6, 1.4, 1.0, 0.7, 0.5, 0.5];

/** How many "virtual" check-ins the prior is worth on each cycle day. */
export const PRIOR_WEIGHT = 2;

const MIN_CHECKINS_FOR_PERSONAL = 7;
const MIN_CYCLE_DAYS_COVERED = 4;

export function burdenOf(c: Pick<CheckIn, 'nausea' | 'fatigue' | 'lowAppetite'>): number {
  return (c.nausea + c.fatigue + c.lowAppetite) / 3;
}

export function sortedDoses(doses: DoseLog[]): DoseLog[] {
  return [...doses].sort((a, b) => (a.dateKey < b.dateKey ? -1 : a.dateKey > b.dateKey ? 1 : 0));
}

export function lastDoseOnOrBefore(doses: DoseLog[], dateKey: string): DoseLog | undefined {
  let found: DoseLog | undefined;
  for (const d of doses) {
    if (d.dateKey <= dateKey && (!found || d.dateKey > found.dateKey)) found = d;
  }
  return found;
}

/**
 * Day of the weekly cycle for a date (0 = dose day … 6), or null for daily
 * medications. Uses the most recent logged dose when it is recent enough,
 * which keeps the plan right when someone moves their dose day; otherwise
 * falls back to the scheduled weekday.
 */
export function cycleDayFor(dateKey: string, profile: Profile, doses: DoseLog[]): number | null {
  if (profile.frequency === 'daily') return null;
  const anchor = lastDoseOnOrBefore(doses, dateKey);
  if (anchor) {
    const d = diffDays(dateKey, anchor.dateKey);
    if (d < 21) return d % CYCLE_LENGTH;
  }
  return (weekdayOf(dateKey) - profile.doseWeekday + CYCLE_LENGTH) % CYCLE_LENGTH;
}

/** True when a weekly dose is due today and has not been logged. */
export function isDoseDue(today: string, profile: Profile, doses: DoseLog[]): boolean {
  const last = lastDoseOnOrBefore(doses, today);
  if (profile.frequency === 'daily') return !last || last.dateKey !== today;
  if (last && last.dateKey === today) return false;
  if (last) return diffDays(today, last.dateKey) >= CYCLE_LENGTH;
  return weekdayOf(today) === profile.doseWeekday;
}

export interface CycleProfile {
  /** Blended burden per cycle day, 0–3. */
  burden: number[];
  /** Number of the user's own check-ins on each cycle day. */
  counts: number[];
  personalized: boolean;
  totalCheckins: number;
}

export function symptomProfile(checkins: CheckIn[], doses: DoseLog[], profile: Profile): CycleProfile {
  const sums = new Array<number>(CYCLE_LENGTH).fill(0);
  const counts = new Array<number>(CYCLE_LENGTH).fill(0);
  let total = 0;
  if (profile.frequency === 'weekly') {
    for (const c of checkins) {
      const day = cycleDayFor(c.dateKey, profile, doses);
      if (day === null) continue;
      sums[day] += burdenOf(c);
      counts[day] += 1;
      total += 1;
    }
  }
  const burden = PRIOR_BURDEN.map((prior, i) => (prior * PRIOR_WEIGHT + sums[i]) / (PRIOR_WEIGHT + counts[i]));
  const covered = counts.filter((n) => n > 0).length;
  return {
    burden,
    counts,
    personalized: total >= MIN_CHECKINS_FOR_PERSONAL && covered >= MIN_CYCLE_DAYS_COVERED,
    totalCheckins: total,
  };
}

export function peakDay(cp: CycleProfile): number {
  return cp.burden.reduce((best, v, i, arr) => (v > arr[best] ? i : best), 0);
}

export function easiestDay(cp: CycleProfile): number {
  return cp.burden.reduce((best, v, i, arr) => (v < arr[best] ? i : best), 0);
}

export function cycleDayLabel(day: number): string {
  if (day === 0) return 'dose day';
  if (day === 1) return 'the day after your dose';
  return `${day} days after your dose`;
}

/** Adverbial form for sentences: "on dose day", "the day after your dose", "4 days after your dose". */
export function cycleDayWhen(day: number): string {
  return day === 0 ? 'on dose day' : cycleDayLabel(day);
}

/** Compact form for chips and list rows: "Dose day", "1 day after dose", "4 days after dose". */
export function cycleDayShort(day: number): string {
  if (day === 0) return 'Dose day';
  return `${day} day${day === 1 ? '' : 's'} after dose`;
}

/** Weekday name that a cycle day usually falls on, given the dose weekday. */
export function weekdayForCycleDay(day: number, doseWeekday: number): string {
  return WEEKDAY_LONG[(doseWeekday + day) % 7];
}

export function cycleInsight(cp: CycleProfile, profile: Profile): string {
  if (profile.frequency === 'daily') {
    return 'You take a daily medication, so Kept spaces your strength sessions evenly through the week.';
  }
  if (!cp.personalized) {
    const left = Math.max(0, MIN_CHECKINS_FOR_PERSONAL - cp.totalCheckins);
    return (
      'Many people feel side effects most in the first couple of days after a dose, so that is what Kept assumes for now. ' +
      `Check in on ${left > 0 ? `${left} more day${left === 1 ? '' : 's'}` : 'a few more days of your cycle'} and your plan will follow your own pattern.`
    );
  }
  const peak = peakDay(cp);
  const easy = easiestDay(cp);
  return (
    `Your side effects are usually strongest ${cycleDayWhen(peak)} (${weekdayForCycleDay(peak, profile.doseWeekday)}) ` +
    `and lightest ${cycleDayWhen(easy)} (${weekdayForCycleDay(easy, profile.doseWeekday)}). ` +
    'Kept puts your strength sessions on your better days.'
  );
}

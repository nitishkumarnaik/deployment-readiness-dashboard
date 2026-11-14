import { addDays, diffDays, startOfWeek, weekDays } from './dates';
import { proteinByDay } from './protein';
import type { AppData } from './types';

/**
 * Muscle Score (0–100): one number that answers "am I protecting my muscle
 * this week?"
 *   50 pts  days the protein floor was met
 *   40 pts  strength sessions vs. weekly goal
 *   10 pts  check-ins (they power the personal plan)
 * For the current week it is a pace score over the days elapsed so far.
 */

export interface WeekScore {
  weekStart: string;
  score: number;
  proteinDays: number;
  sessions: number;
  checkins: number;
  daysCounted: number;
  sessionGoal: number;
  inProgress: boolean;
}

export function weekScore(weekStart: string, data: AppData, today: string): WeekScore {
  const profile = data.profile;
  const sessionGoal = profile?.strengthDaysPerWeek ?? 3;
  const target = profile?.proteinTargetG ?? Infinity;
  const startedOn = profile?.startedOn ?? weekStart;

  const days = weekDays(weekStart).filter((d) => d <= today && d >= startedOn);
  const daysCounted = days.length;
  const daySet = new Set(days);
  const byDay = proteinByDay(data.protein);

  const proteinDays = days.filter((d) => (byDay.get(d) ?? 0) >= target).length;
  const sessions = new Set(data.sessions.filter((s) => daySet.has(s.dateKey)).map((s) => s.dateKey)).size;
  const checkins = data.checkins.filter((c) => daySet.has(c.dateKey)).length;

  let score = 0;
  if (daysCounted > 0) {
    const proteinPart = proteinDays / daysCounted;
    const expectedSessions = Math.max(0.5, (sessionGoal * daysCounted) / 7);
    const strengthPart = Math.min(1, sessions / expectedSessions);
    const checkinPart = Math.min(1, checkins / Math.min(3, daysCounted));
    score = Math.round(50 * proteinPart + 40 * strengthPart + 10 * checkinPart);
  }

  return {
    weekStart,
    score,
    proteinDays,
    sessions,
    checkins,
    daysCounted,
    sessionGoal,
    inProgress: diffDays(addDays(weekStart, 6), today) > 0,
  };
}

/** Scores for the most recent `weeks` weeks (oldest first), skipping weeks before the user started. */
export function scoreHistory(data: AppData, today: string, weeks = 8): WeekScore[] {
  const current = startOfWeek(today);
  const startedWeek = data.profile ? startOfWeek(data.profile.startedOn) : current;
  const out: WeekScore[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const ws = addDays(current, -7 * w);
    if (ws < startedWeek) continue;
    out.push(weekScore(ws, data, today));
  }
  return out;
}

export function scoreLabel(score: number): string {
  if (score >= 80) return 'Strong';
  if (score >= 50) return 'Building';
  return 'Getting started';
}

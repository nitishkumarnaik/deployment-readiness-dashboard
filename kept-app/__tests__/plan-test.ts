import { addDays } from '../src/lib/dates';
import { buildWeekPlan } from '../src/lib/plan';
import type { CheckIn, DoseLog, Level, SessionLog } from '../src/lib/types';
import { checkin, makeData } from './helpers';

const WEEK = '2026-11-16'; // Monday
const session = (dateKey: string, workoutId = 'A'): SessionLog => ({
  id: dateKey,
  dateKey,
  workoutId,
  lowEnergy: false,
  exercisesDone: 5,
  exercisesTotal: 5,
  minutes: 20,
  at: dateKey,
});

describe('buildWeekPlan', () => {
  test('places strength on low-burden days, never back to back, rest on the peak day', () => {
    // Sunday dose: prior peak is day 1 = Monday.
    const data = makeData({}, { doseWeekday: 0, strengthDaysPerWeek: 3 });
    const plan = buildWeekPlan(WEEK, data, WEEK);
    const strength = plan.filter((d) => d.kind === 'strength').map((d) => d.dateKey);
    expect(strength).toHaveLength(3);
    for (let i = 1; i < plan.length; i++) {
      expect(plan[i].kind === 'strength' && plan[i - 1].kind === 'strength').toBe(false);
    }
    expect(plan[0].kind).toBe('rest'); // Monday = day after dose
    // Easiest prior days are 5 and 6 after a Sunday dose (Fri, Sat) and day 4 (Thu).
    expect(strength).toContain('2026-11-20'); // Friday
  });

  test('follows a personal pattern instead of the prior', () => {
    // User is worst on day 4-5 (Thu/Fri) and fine on Mon/Tue.
    const pattern: Level[] = [0, 0, 0, 1, 3, 3, 1];
    const checkins: CheckIn[] = [];
    const doses: DoseLog[] = [];
    for (let w = 0; w < 3; w++) {
      const sunday = addDays('2026-10-25', w * 7);
      doses.push({ id: sunday, dateKey: sunday, amount: '1 mg', at: sunday });
      pattern.forEach((lvl, i) => checkins.push(checkin(addDays(sunday, i), lvl)));
    }
    const data = makeData({ checkins, doses }, { doseWeekday: 0, strengthDaysPerWeek: 2 });
    const plan = buildWeekPlan(WEEK, data, WEEK);
    const strength = plan.filter((d) => d.kind === 'strength').map((d) => d.dateKey);
    expect(strength).not.toContain('2026-11-19'); // Thursday
    expect(strength).not.toContain('2026-11-20'); // Friday
    const rest = plan.filter((d) => d.kind === 'rest').map((d) => d.dateKey);
    expect(rest).toHaveLength(1);
    expect(['2026-11-19', '2026-11-20']).toContain(rest[0]);
  });

  test('missed days are not scheduled after the fact; sessions move later in the week', () => {
    const data = makeData({}, { doseWeekday: 0, strengthDaysPerWeek: 3 });
    const today = '2026-11-19'; // Thursday
    const plan = buildWeekPlan(WEEK, data, today);
    for (const d of plan) {
      if (d.dateKey < today) expect(d.kind).not.toBe('strength');
    }
    // Thu..Sun = 4 days, 3 sessions without back-to-back is impossible, so it relaxes spacing.
    expect(plan.filter((d) => d.kind === 'strength')).toHaveLength(3);
  });

  test('a session forced onto a hard day is labelled as a catch-up, not a "better day"', () => {
    const data = makeData({}, { doseWeekday: 0, strengthDaysPerWeek: 2 });
    const plan = buildWeekPlan(WEEK, data, '2026-11-21'); // Saturday: only Sat and Sun left
    const sunday = plan.find((d) => d.dateKey === '2026-11-22');
    expect(sunday?.kind).toBe('strength');
    expect(sunday?.reason).toMatch(/^Catch-up session on dose day/);
    const saturday = plan.find((d) => d.dateKey === '2026-11-21');
    expect(saturday?.reason).toMatch(/usually one of your better days/);
  });

  test('logged sessions count toward the goal and rotate workouts', () => {
    const data = makeData({ sessions: [session('2026-11-13', 'B'), session('2026-11-17', 'C')] }, { strengthDaysPerWeek: 3 });
    const plan = buildWeekPlan(WEEK, data, '2026-11-18');
    const strength = plan.filter((d) => d.kind === 'strength');
    expect(strength).toHaveLength(3);
    const tue = plan.find((d) => d.dateKey === '2026-11-17');
    expect(tue?.done).toBe(true);
    expect(tue?.workoutId).toBe('C');
    // Next planned session after C is A.
    const nextPlanned = strength.find((d) => !d.done);
    expect(nextPlanned?.workoutId).toBe('A');
  });

  test('daily medication spreads sessions evenly with no rest day', () => {
    const data = makeData({}, { frequency: 'daily', strengthDaysPerWeek: 3 });
    const plan = buildWeekPlan(WEEK, data, WEEK);
    expect(plan.filter((d) => d.kind === 'strength').map((d) => d.dateKey)).toEqual(['2026-11-16', '2026-11-18', '2026-11-20']);
    expect(plan.some((d) => d.kind === 'rest')).toBe(false);
  });
});

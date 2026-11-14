import {
  cycleDayFor,
  cycleInsight,
  easiestDay,
  isDoseDue,
  peakDay,
  PRIOR_BURDEN,
  symptomProfile,
} from '../src/lib/cycle';
import { addDays } from '../src/lib/dates';
import type { CheckIn, DoseLog, Level } from '../src/lib/types';
import { checkin, makeProfile } from './helpers';

const dose = (dateKey: string): DoseLog => ({ id: dateKey, dateKey, amount: '0.5 mg', at: dateKey });

describe('cycleDayFor', () => {
  const profile = makeProfile({ doseWeekday: 0 }); // Sunday

  test('falls back to the scheduled weekday when no doses are logged', () => {
    expect(cycleDayFor('2026-11-15', profile, [])).toBe(0); // Sunday
    expect(cycleDayFor('2026-11-16', profile, [])).toBe(1); // Monday
    expect(cycleDayFor('2026-11-14', profile, [])).toBe(6); // Saturday
  });

  test('follows the last logged dose when the user moved their dose day', () => {
    const doses = [dose('2026-11-11')]; // a Wednesday
    expect(cycleDayFor('2026-11-11', profile, doses)).toBe(0);
    expect(cycleDayFor('2026-11-13', profile, doses)).toBe(2);
    // Projects forward into next week.
    expect(cycleDayFor('2026-11-18', profile, doses)).toBe(0);
  });

  test('returns null for daily medications', () => {
    expect(cycleDayFor('2026-11-14', makeProfile({ frequency: 'daily' }), [])).toBeNull();
  });
});

describe('isDoseDue', () => {
  const profile = makeProfile({ doseWeekday: 0 });

  test('due on the scheduled day when nothing is logged', () => {
    expect(isDoseDue('2026-11-15', profile, [])).toBe(true);
    expect(isDoseDue('2026-11-14', profile, [])).toBe(false);
  });

  test('not due once logged today, due again a week later', () => {
    const doses = [dose('2026-11-15')];
    expect(isDoseDue('2026-11-15', profile, doses)).toBe(false);
    expect(isDoseDue('2026-11-20', profile, doses)).toBe(false);
    expect(isDoseDue('2026-11-22', profile, doses)).toBe(true);
  });

  test('daily: due every day until logged', () => {
    const daily = makeProfile({ frequency: 'daily' });
    expect(isDoseDue('2026-11-15', daily, [dose('2026-11-14')])).toBe(true);
    expect(isDoseDue('2026-11-15', daily, [dose('2026-11-15')])).toBe(false);
  });
});

describe('symptomProfile', () => {
  const profile = makeProfile({ doseWeekday: 0 });

  test('with no check-ins it equals the prior and is not personalized', () => {
    const cp = symptomProfile([], [], profile);
    expect(cp.burden).toEqual(PRIOR_BURDEN);
    expect(cp.personalized).toBe(false);
    expect(peakDay(cp)).toBe(1);
  });

  test('learns a personal pattern that differs from the prior', () => {
    // This user feels worst on day 4 after a Sunday dose (Thursday), fine on day 1.
    const pattern: Level[] = [0, 0, 1, 2, 3, 1, 0];
    const checkins: CheckIn[] = [];
    const doses: DoseLog[] = [];
    for (let week = 0; week < 3; week++) {
      const sunday = addDays('2026-10-25', week * 7);
      doses.push(dose(sunday));
      pattern.forEach((lvl, i) => checkins.push(checkin(addDays(sunday, i), lvl)));
    }
    const cp = symptomProfile(checkins, doses, profile);
    expect(cp.personalized).toBe(true);
    expect(cp.totalCheckins).toBe(21);
    expect(peakDay(cp)).toBe(4);
    expect([0, 6]).toContain(easiestDay(cp));
    expect(cycleInsight(cp, profile)).toContain('4 days after your dose (Thursday)');
  });

  test('a single bad day is shrunk towards the prior', () => {
    const cp = symptomProfile([checkin('2026-11-20', 3)], [], profile); // Friday = day 5
    expect(cp.burden[5]).toBeCloseTo((PRIOR_BURDEN[5] * 2 + 3) / 3);
    expect(cp.personalized).toBe(false);
  });
});

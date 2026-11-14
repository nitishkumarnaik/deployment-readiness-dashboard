import { cycleDayFor } from './cycle';
import { addDays, diffDays, weekdayOf } from './dates';
import { QUICK_ADDS } from './protein';
import type { AppData, CheckIn, DoseLog, Level, Profile, ProteinEntry, SessionLog, WeightEntry } from './types';
import { WORKOUTS } from './workouts';

/** Small deterministic PRNG so demo data looks the same every time. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PATTERN = [1.2, 2.2, 1.8, 1.1, 0.6, 0.4, 0.4];

function level(x: number): Level {
  return Math.max(0, Math.min(3, Math.round(x))) as Level;
}

/** Three weeks of realistic sample data so people (and app reviewers) can explore. */
export function buildDemoData(today: string, days = 21): AppData {
  const rand = mulberry32(42);
  const startedOn = addDays(today, -(days - 1));
  const doseWeekday = 0;
  const profile: Profile = {
    name: 'Alex',
    medication: 'semaglutide',
    frequency: 'weekly',
    doseWeekday,
    currentDose: '1 mg',
    units: 'kg',
    startWeightKg: 96,
    goalWeightKg: 82,
    proteinGPerKg: 1.2,
    proteinTargetG: 100,
    strengthDaysPerWeek: 3,
    remindersEnabled: false,
    startedOn,
  };

  const doses: DoseLog[] = [];
  const checkins: CheckIn[] = [];
  const protein: ProteinEntry[] = [];
  const weights: WeightEntry[] = [];
  const sessions: SessionLog[] = [];
  const sites = ['abdomen-left', 'abdomen-right', 'thigh-left', 'thigh-right'] as const;

  for (let i = 0; i < days; i++) {
    const day = addDays(startedOn, i);
    if (weekdayOf(day) === doseWeekday) {
      doses.push({ id: `d${i}`, dateKey: day, amount: '1 mg', site: sites[doses.length % sites.length], at: `${day}T09:00:00` });
    }
  }

  for (let i = 0; i < days; i++) {
    const day = addDays(startedOn, i);
    const isToday = day === today;
    const cd = cycleDayFor(day, profile, doses) ?? 0;
    const b = PATTERN[cd];

    if (!isToday && rand() > 0.15) {
      checkins.push({
        dateKey: day,
        nausea: level(b + (rand() - 0.5)),
        fatigue: level(b * 0.8 + (rand() - 0.5)),
        lowAppetite: level(b * 1.1 + (rand() - 0.5)),
        at: `${day}T20:00:00`,
      });
    }

    const goal = isToday ? 55 : 88 + Math.round(rand() * 40) - Math.round(b * 8);
    let total = 0;
    let n = 0;
    while (total < goal && n < 6) {
      const q = QUICK_ADDS[Math.floor(rand() * 5)];
      protein.push({ id: `p${i}-${n}`, dateKey: day, grams: q.grams, label: q.label, at: `${day}T${10 + n * 2}:00:00` });
      total += q.grams;
      n += 1;
    }

    if (i % 3 === 0 || isToday) {
      const kg = 96 - diffDays(day, startedOn) * 0.16 + (rand() - 0.5) * 0.6;
      weights.push({ dateKey: day, kg: Math.round(kg * 10) / 10 });
    }

    if (!isToday && (cd === 3 || cd === 4 || cd === 6) && rand() > 0.2) {
      const w = WORKOUTS[sessions.length % WORKOUTS.length];
      const low = b > 1;
      sessions.push({
        id: `s${i}`,
        dateKey: day,
        workoutId: w.id,
        lowEnergy: low,
        exercisesDone: w.exercises.length,
        exercisesTotal: w.exercises.length,
        minutes: low ? w.lowMinutes : w.minutes,
        at: `${day}T18:00:00`,
      });
    }
  }

  return { version: 1, profile, doses, protein, checkins, weights, sessions };
}

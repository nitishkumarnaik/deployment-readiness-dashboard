import { EMPTY_DATA, type AppData, type CheckIn, type Level, type Profile } from '../src/lib/types';

export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    name: 'Test',
    medication: 'semaglutide',
    frequency: 'weekly',
    doseWeekday: 0, // Sunday
    currentDose: '0.5 mg',
    units: 'kg',
    startWeightKg: 100,
    goalWeightKg: 85,
    proteinGPerKg: 1.2,
    proteinTargetG: 100,
    strengthDaysPerWeek: 3,
    remindersEnabled: false,
    startedOn: '2026-10-01',
    ...overrides,
  };
}

export function makeData(overrides: Partial<AppData> = {}, profile: Partial<Profile> = {}): AppData {
  return { ...EMPTY_DATA, profile: makeProfile(profile), ...overrides };
}

export function checkin(dateKey: string, level: Level): CheckIn {
  return { dateKey, nausea: level, fatigue: level, lowAppetite: level, at: `${dateKey}T20:00:00` };
}

import { EMPTY_DATA, type AppData, type Entry, type Tracker } from '../src/lib/types';

export function tracker(overrides: Partial<Tracker> = {}): Tracker {
  return {
    id: 't1',
    name: 'Deep work',
    emoji: '🎧',
    segment: 'focus',
    kind: 'duration',
    target: 90,
    visibility: 'public',
    order: 0,
    archived: false,
    createdOn: '2026-10-01',
    ...overrides,
  };
}

let n = 0;
export function entry(trackerId: string, dateKey: string, amount: number): Entry {
  n += 1;
  return { id: `e${n}`, trackerId, dateKey, amount, at: `${dateKey}T10:00:00.000Z`, source: 'tap' };
}

export function data(overrides: Partial<AppData> = {}): AppData {
  return {
    ...EMPTY_DATA,
    profile: { name: 'Alex', handle: 'alex', emoji: '🌀', startedOn: '2026-10-01', autoShare: true },
    ...overrides,
  };
}

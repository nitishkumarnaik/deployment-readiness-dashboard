import { buildGrid } from '../src/lib/grid';
import { formatClock, minutesToLog, elapsedMs } from '../src/lib/timer';
import { bestStreak, consistency, currentStreak, entryDays, formatMinutes, levelFor, progressLabel } from '../src/lib/trackers';
import { entry, tracker } from './helpers';

const T = tracker({ kind: 'count', target: 2 });

describe('streaks', () => {
  test('current streak counts back from today once today is met', () => {
    const entries = [entry('t1', '2026-11-16', 2), entry('t1', '2026-11-15', 1), entry('t1', '2026-11-15', 1), entry('t1', '2026-11-14', 2), entry('t1', '2026-11-12', 2)];
    expect(currentStreak(T, entries, '2026-11-16')).toBe(3);
  });

  test('an unfinished today keeps yesterday’s streak alive', () => {
    const entries = [entry('t1', '2026-11-16', 1), entry('t1', '2026-11-15', 2), entry('t1', '2026-11-14', 2)];
    expect(currentStreak(T, entries, '2026-11-16')).toBe(2);
  });

  test('best streak finds the longest run', () => {
    const days = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-05', '2026-11-06'];
    expect(bestStreak(T, days.map((d) => entry('t1', d, 2)))).toBe(3);
  });

  test('entry days counts distinct days with anything logged', () => {
    expect(entryDays(T, [entry('t1', '2026-11-01', 1), entry('t1', '2026-11-01', 1), entry('t1', '2026-11-02', 1), entry('t2', '2026-11-03', 1)])).toBe(2);
  });
});

describe('consistency', () => {
  test('ignores an unfinished today and days before the tracker existed', () => {
    const t = tracker({ kind: 'check', target: 1, createdOn: '2026-11-13' });
    // 13, 14 done, 15 missed, 16 (today) not yet done
    const entries = [entry('t1', '2026-11-13', 1), entry('t1', '2026-11-14', 1)];
    expect(consistency(t, entries, '2026-11-16', 7)).toBeCloseTo(2 / 3);
  });

  test('today counts once it is met', () => {
    const t = tracker({ kind: 'check', target: 1, createdOn: '2026-11-15' });
    expect(consistency(t, [entry('t1', '2026-11-15', 1), entry('t1', '2026-11-16', 1)], '2026-11-16')).toBe(1);
  });
});

describe('labels', () => {
  test('progress labels by kind', () => {
    expect(progressLabel(tracker({ kind: 'duration', target: 30 }), 30)).toBe('30m/30m');
    expect(progressLabel(tracker({ kind: 'duration', target: 90 }), 45)).toBe('45m/1.5h');
    expect(progressLabel(tracker({ kind: 'count', target: 3 }), 1)).toBe('1/3');
    expect(formatMinutes(120)).toBe('2h');
  });

  test('levels', () => {
    expect(levelFor(T, 0)).toBe(0);
    expect(levelFor(T, 1)).toBe(1);
    expect(levelFor(T, 3)).toBe(2);
  });
});

describe('contribution grid', () => {
  test('columns are Sunday-to-Saturday weeks ending with this week; future days flagged', () => {
    const grid = buildGrid('2026-11-16', 3, () => 2); // Monday
    expect(grid).toHaveLength(3);
    expect(grid[2].weekStart).toBe('2026-11-15');
    expect(grid[0].weekStart).toBe('2026-11-01');
    const thisWeek = grid[2].cells;
    expect(thisWeek[1]).toMatchObject({ dateKey: '2026-11-16', future: false, level: 2 });
    expect(thisWeek[2]).toMatchObject({ dateKey: '2026-11-17', future: true, level: 0 });
  });

  test('month labels mark the week a month starts in', () => {
    const grid = buildGrid('2026-11-16', 8, () => 0);
    const labels = grid.map((c) => c.monthLabel).filter(Boolean);
    expect(labels).toEqual(expect.arrayContaining(['Oct', 'Nov']));
    const novCol = grid.find((c) => c.monthLabel === 'Nov')!;
    expect(novCol.cells.some((c) => c.dateKey === '2026-11-01')).toBe(true);
  });
});

describe('timer', () => {
  test('elapsed time across pause and resume', () => {
    expect(elapsedMs({ trackerId: 't', startedAt: 1_000, accumulatedMs: 60_000 }, 61_000)).toBe(120_000);
    expect(elapsedMs({ trackerId: 't', startedAt: null, accumulatedMs: 60_000 }, 999_999)).toBe(60_000);
  });

  test('clock and minutes', () => {
    expect(formatClock(249_000)).toBe('04:09');
    expect(formatClock(3_723_000)).toBe('1:02:03');
    expect(minutesToLog(20_000)).toBe(1);
    expect(minutesToLog(89.6 * 60_000)).toBe(90);
  });
});

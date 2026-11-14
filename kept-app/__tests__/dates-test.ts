import { addDays, diffDays, formatDay, startOfWeek, weekDays, weekdayOf } from '../src/lib/dates';

describe('dates', () => {
  test('addDays crosses month and year boundaries', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  test('diffDays is stable across daylight-saving changes', () => {
    // US and EU clocks change in late March and late October / early November.
    expect(diffDays('2026-03-30', '2026-03-28')).toBe(2);
    expect(diffDays('2026-11-02', '2026-10-24')).toBe(9);
  });

  test('weekdayOf and startOfWeek (Monday start)', () => {
    expect(weekdayOf('2026-11-14')).toBe(6); // Saturday
    expect(startOfWeek('2026-11-14')).toBe('2026-11-09');
    expect(startOfWeek('2026-11-09')).toBe('2026-11-09');
    expect(startOfWeek('2026-11-15')).toBe('2026-11-09'); // Sunday belongs to the week that started Monday
  });

  test('weekDays returns 7 consecutive days', () => {
    expect(weekDays('2026-11-09')).toEqual([
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
    ]);
  });

  test('formatDay', () => {
    expect(formatDay('2026-11-14')).toBe('Sat 14 Nov');
  });
});

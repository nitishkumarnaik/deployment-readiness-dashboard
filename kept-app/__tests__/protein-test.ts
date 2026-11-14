import { proteinByDay, proteinForDay, proteinStreak, suggestedProteinTarget } from '../src/lib/protein';
import type { ProteinEntry } from '../src/lib/types';

const e = (dateKey: string, grams: number): ProteinEntry => ({ id: `${dateKey}-${grams}-${Math.random()}`, dateKey, grams, label: 'x', at: dateKey });

describe('protein', () => {
  test('suggested target rounds to 5 g and stays within bounds', () => {
    expect(suggestedProteinTarget(82, 1.2)).toBe(100); // 98.4 -> 100
    expect(suggestedProteinTarget(70, 1.2)).toBe(85); // 84 -> 85
    expect(suggestedProteinTarget(30, 1.0)).toBe(60); // floor
    expect(suggestedProteinTarget(200, 2.0)).toBe(220); // ceiling
  });

  test('sums by day', () => {
    const entries = [e('2026-11-14', 25), e('2026-11-14', 30), e('2026-11-13', 12)];
    expect(proteinForDay(entries, '2026-11-14')).toBe(55);
    expect(proteinByDay(entries).get('2026-11-13')).toBe(12);
  });

  test('streak counts back from today when today is met', () => {
    const entries = [e('2026-11-14', 100), e('2026-11-13', 110), e('2026-11-12', 100), e('2026-11-11', 40)];
    expect(proteinStreak(entries, 100, '2026-11-14')).toBe(3);
  });

  test('streak stays alive while today is still in progress', () => {
    const entries = [e('2026-11-14', 20), e('2026-11-13', 110), e('2026-11-12', 100)];
    expect(proteinStreak(entries, 100, '2026-11-14')).toBe(2);
  });

  test('streak is zero when yesterday was missed', () => {
    const entries = [e('2026-11-14', 20), e('2026-11-12', 100)];
    expect(proteinStreak(entries, 100, '2026-11-14')).toBe(0);
  });
});

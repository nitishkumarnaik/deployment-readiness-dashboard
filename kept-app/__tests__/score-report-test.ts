import { buildDemoData } from '../src/lib/demo';
import { clinicianSummary } from '../src/lib/report';
import { scoreHistory, scoreLabel, weekScore } from '../src/lib/score';
import type { ProteinEntry, SessionLog } from '../src/lib/types';
import { migrate, reducer } from '../src/state/reducer';
import { checkin, makeData } from './helpers';

const WEEK = '2026-11-09';
const p = (dateKey: string, grams: number): ProteinEntry => ({ id: dateKey + grams, dateKey, grams, label: 'x', at: dateKey });
const s = (dateKey: string): SessionLog => ({ id: dateKey, dateKey, workoutId: 'A', lowEnergy: false, exercisesDone: 5, exercisesTotal: 5, minutes: 20, at: dateKey });

describe('Muscle Score', () => {
  test('perfect completed week scores 100', () => {
    const days = ['09', '10', '11', '12', '13', '14', '15'].map((d) => `2026-11-${d}`);
    const data = makeData({
      protein: days.map((d) => p(d, 120)),
      sessions: [s('2026-11-10'), s('2026-11-12'), s('2026-11-14')],
      checkins: days.map((d) => checkin(d, 0)),
    });
    const ws = weekScore(WEEK, data, '2026-11-20');
    expect(ws.score).toBe(100);
    expect(ws.inProgress).toBe(false);
  });

  test('empty week scores 0', () => {
    expect(weekScore(WEEK, makeData(), '2026-11-20').score).toBe(0);
  });

  test('current week is scored on pace, not on the full week', () => {
    // Monday, protein met, no session yet, one check-in.
    const data = makeData({ protein: [p('2026-11-09', 110)], checkins: [checkin('2026-11-09', 1)] });
    const ws = weekScore(WEEK, data, '2026-11-09');
    expect(ws.inProgress).toBe(true);
    expect(ws.daysCounted).toBe(1);
    expect(ws.score).toBe(60); // 50 protein + 0 strength + 10 check-in
  });

  test('history skips weeks before the user started', () => {
    const data = makeData({}, { startedOn: '2026-11-04' });
    const hist = scoreHistory(data, '2026-11-14', 8);
    expect(hist.map((h) => h.weekStart)).toEqual(['2026-11-02', '2026-11-09']);
  });

  test('labels', () => {
    expect(scoreLabel(85)).toBe('Strong');
    expect(scoreLabel(60)).toBe('Building');
    expect(scoreLabel(10)).toBe('Getting started');
  });
});

describe('clinician summary', () => {
  test('reports logged facts and never gives advice', () => {
    const data = buildDemoData('2026-11-14');
    const text = clinicianSummary(data, '2026-11-14', 30);
    expect(text).toContain('Medication: Semaglutide, weekly (Sunday)');
    expect(text).toMatch(/Doses logged: 3/);
    expect(text).toMatch(/Weight: \d+\.\d kg \(25 Oct\) to \d+\.\d kg \(14 Nov\), −\d+\.\d kg/);
    expect(text).toMatch(/Strength sessions: \d+ \(goal 3\/week\)/);
    expect(text).toContain('Not medical advice');
    expect(text).not.toMatch(/increase your dose|decrease your dose|you should/i);
  });
});

describe('reducer', () => {
  test('one check-in and one weight per day', () => {
    let state = makeData();
    state = reducer(state, { type: 'checkIn', checkin: checkin('2026-11-14', 1) });
    state = reducer(state, { type: 'checkIn', checkin: checkin('2026-11-14', 3) });
    expect(state.checkins).toHaveLength(1);
    expect(state.checkins[0].nausea).toBe(3);
    state = reducer(state, { type: 'logWeight', entry: { dateKey: '2026-11-14', kg: 90 } });
    state = reducer(state, { type: 'logWeight', entry: { dateKey: '2026-11-14', kg: 89.5 } });
    expect(state.weights).toEqual([{ dateKey: '2026-11-14', kg: 89.5 }]);
  });

  test('migrate tolerates missing or junk fields', () => {
    expect(migrate(null).profile).toBeNull();
    const m = migrate({ profile: null, doses: 'oops' });
    expect(m.doses).toEqual([]);
    expect(m.version).toBe(1);
  });

  test('reset clears everything', () => {
    const state = reducer(buildDemoData('2026-11-14'), { type: 'reset' });
    expect(state.profile).toBeNull();
    expect(state.protein).toHaveLength(0);
  });
});

import { router } from 'expo-router';

import { useStore } from '../state/store';
import { success, tap } from './feedback';
import { amountOn } from './trackers';
import type { Tracker } from './types';
import { useToday } from './useToday';

/**
 * One tap logs progress: check toggles, count adds one, time opens the focus
 * timer. Long press (handled by callers) opens the tracker's details.
 */
export function useTrackerTap() {
  const { data, dispatch } = useStore();
  const today = useToday();
  return (t: Tracker) => {
    const nowIso = new Date().toISOString();
    if (t.kind === 'duration') {
      tap();
      router.push({ pathname: '/focus', params: { tracker: t.id } });
      return;
    }
    const amount = amountOn(data.entries, t.id, today);
    if (t.kind === 'check') {
      if (amount < 1) success();
      else tap();
      dispatch({ type: 'setCheck', trackerId: t.id, dateKey: today, done: amount < 1, nowIso });
      return;
    }
    if (amount + 1 === t.target) success();
    else tap();
    dispatch({ type: 'log', trackerId: t.id, dateKey: today, amount: 1, source: 'tap', nowIso });
  };
}

export function openTracker(t: Tracker) {
  router.push({ pathname: '/tracker/[id]', params: { id: t.id } });
}

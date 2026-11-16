import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { todayKey } from './dates';

/** Today's date key, refreshed when the app returns to the foreground (e.g. after midnight). */
export function useToday(): string {
  const [today, setToday] = useState(() => todayKey());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setToday(todayKey());
    });
    const timer = setInterval(() => setToday(todayKey()), 60_000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, []);
  return today;
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';

import { EMPTY_DATA, type AppData } from '../lib/types';
import { reducer, type Action } from './reducer';

/**
 * Local-first store. Everything lives on the device in AsyncStorage: no
 * account, no server, no analytics. That keeps health data private and lets
 * the App Store privacy label say "Data Not Collected".
 */

export const STORAGE_KEY = 'kept:data:v1';

interface StoreValue {
  data: AppData;
  ready: boolean;
  dispatch: (action: Action) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, EMPTY_DATA);
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        if (raw) {
          try {
            dispatch({ type: 'hydrate', data: JSON.parse(raw) });
          } catch {
            // Corrupt data: start fresh rather than crash.
          }
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (cancelled) return;
        hydrated.current = true;
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => undefined);
  }, [data]);

  const value = useMemo(() => ({ data, ready, dispatch }), [data, ready]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

import {
  EMPTY_DATA,
  type AppData,
  type CheckIn,
  type DoseLog,
  type Profile,
  type ProteinEntry,
  type SessionLog,
  type WeightEntry,
} from '../lib/types';

export type Action =
  | { type: 'hydrate'; data: AppData }
  | { type: 'setProfile'; profile: Profile }
  | { type: 'updateProfile'; patch: Partial<Profile> }
  | { type: 'addProtein'; entry: ProteinEntry }
  | { type: 'removeProtein'; id: string }
  | { type: 'logDose'; dose: DoseLog }
  | { type: 'removeDose'; id: string }
  | { type: 'checkIn'; checkin: CheckIn }
  | { type: 'logWeight'; entry: WeightEntry }
  | { type: 'logSession'; session: SessionLog }
  | { type: 'reset' };

export function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'hydrate':
      return migrate(action.data);
    case 'setProfile':
      return { ...state, profile: action.profile };
    case 'updateProfile':
      return state.profile ? { ...state, profile: { ...state.profile, ...action.patch } } : state;
    case 'addProtein':
      return { ...state, protein: [...state.protein, action.entry] };
    case 'removeProtein':
      return { ...state, protein: state.protein.filter((p) => p.id !== action.id) };
    case 'logDose':
      return { ...state, doses: [...state.doses, action.dose] };
    case 'removeDose':
      return { ...state, doses: state.doses.filter((d) => d.id !== action.id) };
    case 'checkIn':
      // One check-in per day: a new one replaces the old.
      return {
        ...state,
        checkins: [...state.checkins.filter((c) => c.dateKey !== action.checkin.dateKey), action.checkin],
      };
    case 'logWeight':
      return {
        ...state,
        weights: [...state.weights.filter((w) => w.dateKey !== action.entry.dateKey), action.entry],
      };
    case 'logSession':
      return { ...state, sessions: [...state.sessions, action.session] };
    case 'reset':
      return EMPTY_DATA;
    default:
      return state;
  }
}

/** Accepts stored data from any earlier version and fills in missing fields. */
export function migrate(raw: unknown): AppData {
  if (!raw || typeof raw !== 'object') return EMPTY_DATA;
  const r = raw as Partial<AppData>;
  return {
    version: 1,
    profile: r.profile ?? null,
    doses: Array.isArray(r.doses) ? r.doses : [],
    protein: Array.isArray(r.protein) ? r.protein : [],
    checkins: Array.isArray(r.checkins) ? r.checkins : [],
    weights: Array.isArray(r.weights) ? r.weights : [],
    sessions: Array.isArray(r.sessions) ? r.sessions : [],
  };
}

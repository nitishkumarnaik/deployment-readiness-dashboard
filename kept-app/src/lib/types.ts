export type Units = 'kg' | 'lb';
export type Frequency = 'weekly' | 'daily';
export type MedicationId = 'semaglutide' | 'tirzepatide' | 'liraglutide' | 'dulaglutide' | 'other';

/** 0 = none, 1 = mild, 2 = moderate, 3 = strong */
export type Level = 0 | 1 | 2 | 3;

export type InjectionSite =
  | 'abdomen-left'
  | 'abdomen-right'
  | 'thigh-left'
  | 'thigh-right'
  | 'arm-left'
  | 'arm-right';

export interface Profile {
  name: string;
  medication: MedicationId;
  frequency: Frequency;
  /** 0 = Sunday … 6 = Saturday. Only used for weekly medications. */
  doseWeekday: number;
  /** Free text, e.g. "0.5 mg". Kept never suggests doses. */
  currentDose: string;
  units: Units;
  startWeightKg: number;
  goalWeightKg: number;
  proteinGPerKg: number;
  proteinTargetG: number;
  /** 2–4 strength sessions per week. */
  strengthDaysPerWeek: number;
  remindersEnabled: boolean;
  /** Local date key (YYYY-MM-DD) of the day the user set up the app. */
  startedOn: string;
}

export interface DoseLog {
  id: string;
  dateKey: string;
  amount: string;
  site?: InjectionSite;
  at: string;
}

export interface ProteinEntry {
  id: string;
  dateKey: string;
  grams: number;
  label: string;
  at: string;
}

export interface CheckIn {
  dateKey: string;
  nausea: Level;
  fatigue: Level;
  lowAppetite: Level;
  at: string;
}

export interface WeightEntry {
  dateKey: string;
  kg: number;
}

export interface SessionLog {
  id: string;
  dateKey: string;
  workoutId: string;
  lowEnergy: boolean;
  exercisesDone: number;
  exercisesTotal: number;
  minutes: number;
  at: string;
}

export interface AppData {
  version: 1;
  profile: Profile | null;
  doses: DoseLog[];
  protein: ProteinEntry[];
  checkins: CheckIn[];
  weights: WeightEntry[];
  sessions: SessionLog[];
}

export const EMPTY_DATA: AppData = {
  version: 1,
  profile: null,
  doses: [],
  protein: [],
  checkins: [],
  weights: [],
  sessions: [],
};

export const MEDICATIONS: { id: MedicationId; label: string; usual: Frequency }[] = [
  { id: 'semaglutide', label: 'Semaglutide', usual: 'weekly' },
  { id: 'tirzepatide', label: 'Tirzepatide', usual: 'weekly' },
  { id: 'dulaglutide', label: 'Dulaglutide', usual: 'weekly' },
  { id: 'liraglutide', label: 'Liraglutide', usual: 'daily' },
  { id: 'other', label: 'Other / not listed', usual: 'weekly' },
];

export function medicationLabel(id: MedicationId): string {
  return MEDICATIONS.find((m) => m.id === id)?.label ?? 'Medication';
}

export const SITES: { id: InjectionSite; label: string }[] = [
  { id: 'abdomen-left', label: 'Belly L' },
  { id: 'abdomen-right', label: 'Belly R' },
  { id: 'thigh-left', label: 'Thigh L' },
  { id: 'thigh-right', label: 'Thigh R' },
  { id: 'arm-left', label: 'Arm L' },
  { id: 'arm-right', label: 'Arm R' },
];

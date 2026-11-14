import { addDays } from './dates';
import type { ProteinEntry } from './types';

export const PROTEIN_MIN_G = 60;
export const PROTEIN_MAX_G = 220;
export const DEFAULT_G_PER_KG = 1.2;

/**
 * Daily protein floor from goal weight. The multiplier is user-adjustable
 * (1.0–2.0 g/kg); the app tells users to confirm the number with their
 * clinician or dietitian.
 */
export function suggestedProteinTarget(goalWeightKg: number, gPerKg: number = DEFAULT_G_PER_KG): number {
  const raw = goalWeightKg * gPerKg;
  const rounded = Math.round(raw / 5) * 5;
  return Math.min(PROTEIN_MAX_G, Math.max(PROTEIN_MIN_G, rounded));
}

export function proteinByDay(entries: ProteinEntry[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of entries) map.set(e.dateKey, (map.get(e.dateKey) ?? 0) + e.grams);
  return map;
}

export function proteinForDay(entries: ProteinEntry[], dateKey: string): number {
  return entries.reduce((sum, e) => (e.dateKey === dateKey ? sum + e.grams : sum), 0);
}

/**
 * Consecutive days the target was met. Today counts once it is met; if it
 * is not met yet, the streak is still alive and counts from yesterday.
 */
export function proteinStreak(entries: ProteinEntry[], target: number, today: string): number {
  const byDay = proteinByDay(entries);
  let day = (byDay.get(today) ?? 0) >= target ? today : addDays(today, -1);
  let streak = 0;
  while ((byDay.get(day) ?? 0) >= target) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}

export interface QuickAdd {
  id: string;
  label: string;
  grams: number;
}

/** Approximate protein per typical serving. One tap logs it. */
export const QUICK_ADDS: QuickAdd[] = [
  { id: 'shake', label: 'Protein shake', grams: 25 },
  { id: 'chicken', label: 'Chicken or fish', grams: 30 },
  { id: 'yogurt', label: 'Greek yogurt', grams: 15 },
  { id: 'eggs', label: '2 eggs', grams: 12 },
  { id: 'cottage', label: 'Cottage cheese', grams: 14 },
  { id: 'tofu', label: 'Tofu or tempeh', grams: 18 },
  { id: 'beans', label: 'Beans or lentils', grams: 12 },
  { id: 'milk', label: 'Glass of milk', grams: 8 },
];

/** Shown when the user reports low appetite: small, soft, protein-dense options. */
export const LOW_APPETITE_IDEAS = [
  'Sip a protein shake slowly over an hour',
  'A small cup of Greek yogurt or skyr',
  'Cottage cheese with fruit',
  'Silken tofu blended into a smoothie',
  'A glass of milk or soy milk',
  'Eat protein first, before anything else on the plate',
];

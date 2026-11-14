import type { Units } from './types';

const LB_PER_KG = 2.20462;

export function kgToUnits(kg: number, units: Units): number {
  return units === 'lb' ? kg * LB_PER_KG : kg;
}

export function unitsToKg(value: number, units: Units): number {
  return units === 'lb' ? value / LB_PER_KG : value;
}

export function formatWeight(kg: number, units: Units): string {
  return `${kgToUnits(kg, units).toFixed(1)} ${units}`;
}

/** Signed change, e.g. "−3.3 kg" or "+0.4 lb". Uses a true minus sign. */
export function formatWeightChange(deltaKg: number, units: Units): string {
  const v = kgToUnits(Math.abs(deltaKg), units).toFixed(1);
  if (Number(v) === 0) return `0.0 ${units}`;
  return `${deltaKg < 0 ? '−' : '+'}${v} ${units}`;
}

/** Parses user input like "92,4" or " 203.5 " into a number, or null. */
export function parseNumber(input: string): number | null {
  const n = Number(input.replace(',', '.').trim());
  return Number.isFinite(n) && input.trim() !== '' ? n : null;
}

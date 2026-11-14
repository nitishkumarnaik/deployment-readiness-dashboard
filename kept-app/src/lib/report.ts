import { cycleDayWhen, peakDay, sortedDoses, symptomProfile } from './cycle';
import { addDays, formatLongDate, formatShortDate, WEEKDAY_LONG } from './dates';
import { proteinByDay } from './protein';
import { medicationLabel, type AppData } from './types';
import { formatWeight, formatWeightChange } from './units';

/**
 * Plain-text summary a user can share with their doctor, nurse or dietitian.
 * It reports what the user logged; it never interprets or recommends doses.
 */
export function clinicianSummary(data: AppData, today: string, days = 30): string {
  const p = data.profile;
  if (!p) return '';
  const from = addDays(today, -(days - 1));
  const inRange = (k: string) => k >= from && k <= today;
  const lines: string[] = [];

  lines.push(`Kept summary: ${formatLongDate(from)} to ${formatLongDate(today)} (last ${days} days)`);
  lines.push('');

  const schedule = p.frequency === 'weekly' ? `weekly (${WEEKDAY_LONG[p.doseWeekday]})` : 'daily';
  lines.push(`Medication: ${medicationLabel(p.medication)}, ${schedule}. Current dose: ${p.currentDose || 'not recorded'}`);

  const doses = sortedDoses(data.doses).filter((d) => inRange(d.dateKey));
  if (doses.length === 0) {
    lines.push('Doses logged: none');
  } else {
    const list = doses.map((d) => `${formatShortDate(d.dateKey)} (${d.amount || 'dose'})`).join(', ');
    lines.push(`Doses logged: ${doses.length}: ${list}`);
  }

  const weights = [...data.weights].filter((w) => inRange(w.dateKey)).sort((a, b) => (a.dateKey < b.dateKey ? -1 : 1));
  if (weights.length >= 2) {
    const first = weights[0];
    const last = weights[weights.length - 1];
    lines.push(
      `Weight: ${formatWeight(first.kg, p.units)} (${formatShortDate(first.dateKey)}) to ${formatWeight(last.kg, p.units)} (${formatShortDate(last.dateKey)}), ${formatWeightChange(last.kg - first.kg, p.units)}`,
    );
  } else if (weights.length === 1) {
    lines.push(`Weight: ${formatWeight(weights[0].kg, p.units)} (${formatShortDate(weights[0].dateKey)})`);
  } else {
    lines.push('Weight: no entries');
  }

  const byDay = proteinByDay(data.protein);
  const loggedDays = [...byDay.entries()].filter(([k]) => inRange(k));
  if (loggedDays.length > 0) {
    const avg = Math.round(loggedDays.reduce((s, [, g]) => s + g, 0) / loggedDays.length);
    const met = loggedDays.filter(([, g]) => g >= p.proteinTargetG).length;
    lines.push(
      `Protein: average ${avg} g/day on ${loggedDays.length} logged days (target ${p.proteinTargetG} g). Target met on ${met} days.`,
    );
  } else {
    lines.push('Protein: no entries');
  }

  const sessions = data.sessions.filter((s) => inRange(s.dateKey));
  const low = sessions.filter((s) => s.lowEnergy).length;
  lines.push(
    `Strength sessions: ${sessions.length} (goal ${p.strengthDaysPerWeek}/week)${low ? `, ${low} done as low-energy versions` : ''}`,
  );

  const checkins = data.checkins.filter((c) => inRange(c.dateKey));
  if (checkins.length > 0) {
    const avg = (key: 'nausea' | 'fatigue' | 'lowAppetite') =>
      (checkins.reduce((s, c) => s + c[key], 0) / checkins.length).toFixed(1);
    lines.push(`Side effects (0 = none, 3 = strong), average of ${checkins.length} check-ins:`);
    lines.push(`  Nausea ${avg('nausea')}, fatigue ${avg('fatigue')}, low appetite ${avg('lowAppetite')}`);
    if (p.frequency === 'weekly') {
      const cp = symptomProfile(data.checkins, data.doses, p);
      if (cp.personalized) lines.push(`  Usually strongest ${cycleDayWhen(peakDay(cp))}`);
    }
  } else {
    lines.push('Side effects: no check-ins');
  }

  lines.push('');
  lines.push('Logged by the patient in the Kept app. Not medical advice; for discussion with the care team.');
  return lines.join('\n');
}

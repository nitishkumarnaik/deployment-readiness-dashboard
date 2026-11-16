import { addDays, fromDateKey, weekdayOf } from './dates';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface GridCell {
  dateKey: string;
  level: 0 | 1 | 2;
  future: boolean;
}

export interface GridColumn {
  weekStart: string;
  /** Month name when a month begins in this column (or for the first column). */
  monthLabel: string | null;
  cells: GridCell[];
}

/**
 * Contribution grid: one column per week (Sunday → Saturday), ending with the
 * week that contains `today`. Days after today are marked `future`.
 */
export function buildGrid(today: string, weeks: number, levelOf: (dateKey: string) => 0 | 1 | 2): GridColumn[] {
  const lastWeekStart = addDays(today, -weekdayOf(today));
  const firstWeekStart = addDays(lastWeekStart, -7 * (weeks - 1));
  const columns: GridColumn[] = [];
  let prevMonth = -1;
  for (let w = 0; w < weeks; w++) {
    const weekStart = addDays(firstWeekStart, 7 * w);
    const cells: GridCell[] = [];
    let monthLabel: string | null = null;
    for (let d = 0; d < 7; d++) {
      const dateKey = addDays(weekStart, d);
      const future = dateKey > today;
      cells.push({ dateKey, future, level: future ? 0 : levelOf(dateKey) });
      const date = fromDateKey(dateKey);
      if (w === 0 && d === 0) {
        prevMonth = date.getMonth();
        monthLabel = MONTH_SHORT[prevMonth];
      } else if (date.getDate() === 1) {
        prevMonth = date.getMonth();
        monthLabel = MONTH_SHORT[prevMonth];
      }
    }
    columns.push({ weekStart, monthLabel, cells });
  }
  // Months start at least four columns apart, so only the first column's label
  // can collide with the next one; drop it when it would.
  if (columns.length > 1 && columns[1].monthLabel) columns[0].monthLabel = null;
  return columns;
}

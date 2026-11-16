import { StyleSheet, Text, View } from 'react-native';

import type { GridColumn } from '../lib/grid';
import { c } from '../theme';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * Week-column contribution grid: empty, partial (grey) and complete (white)
 * squares, with month labels on top and weekday letters on the right.
 */
export function ContributionGrid({ columns, cell = 11, gap = 3, showDays = true, label }: { columns: GridColumn[]; cell?: number; gap?: number; showDays?: boolean; label?: string }) {
  const done = columns.reduce((n, col) => n + col.cells.filter((x) => x.level === 2).length, 0);
  return (
    <View accessibilityRole="image" accessibilityLabel={label ?? `${done} days completed in the last ${columns.length} weeks`}>
      <View style={{ flexDirection: 'row', gap, marginBottom: 4, height: 12 }}>
        {columns.map((col) => (
          <View key={col.weekStart} style={{ width: cell, overflow: 'visible' }}>
            {col.monthLabel ? <Text style={styles.month}>{col.monthLabel}</Text> : null}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap }}>
        {columns.map((col) => (
          <View key={col.weekStart} style={{ gap }}>
            {col.cells.map((x) => (
              <View
                key={x.dateKey}
                style={{
                  width: cell,
                  height: cell,
                  borderRadius: Math.max(2, cell / 4),
                  backgroundColor: x.future ? 'transparent' : x.level === 2 ? c.cellDone : x.level === 1 ? c.cellPartial : c.cellEmpty,
                }}
              />
            ))}
          </View>
        ))}
        {showDays ? (
          <View style={{ gap, marginLeft: 4 }}>
            {DAY_LETTERS.map((d, i) => (
              <Text key={i} style={[styles.day, { height: cell, lineHeight: cell }]}>
                {d}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** How many week columns fit in a given width. */
export function weeksThatFit(width: number, cell = 11, gap = 3, daysColumn = 14): number {
  return Math.max(4, Math.floor((width - daysColumn) / (cell + gap)));
}

const styles = StyleSheet.create({
  month: { position: 'absolute', left: 0, top: 0, width: 32, color: c.muted, fontSize: 10 },
  day: { color: c.faint, fontSize: 8, fontWeight: '600' },
});

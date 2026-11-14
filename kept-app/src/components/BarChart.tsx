import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '../theme';

export interface Bar {
  key: string;
  label: string;
  value: number;
  /** Optional colour override, e.g. to highlight the current week. */
  color?: string;
  /** Text read by screen readers for this bar. */
  a11y?: string;
}

/**
 * Minimal bar chart built from Views: no native chart dependency, works on
 * iOS, Android and web. Optional dashed target line.
 */
export function BarChart({
  bars,
  max,
  target,
  height = 120,
  color,
  showValues = false,
}: {
  bars: Bar[];
  max: number;
  target?: number;
  height?: number;
  color?: string;
  showValues?: boolean;
}) {
  const c = useColors();
  const top = Math.max(max, target ?? 0, 1);
  return (
    <View accessibilityRole="image" accessibilityLabel={bars.map((b) => b.a11y ?? `${b.label}: ${b.value}`).join(', ')}>
      <View style={[styles.plot, { height }]}>
        {target !== undefined ? (
          <View
            style={[styles.target, { bottom: (target / top) * height, borderColor: c.accent }]}
            importantForAccessibility="no-hide-descendants"
          />
        ) : null}
        {bars.map((b) => {
          const h = Math.max(b.value > 0 ? 4 : 2, (b.value / top) * height);
          return (
            <View key={b.key} style={styles.col}>
              {showValues ? (
                <Text style={[styles.value, { color: c.muted }]}>{b.value > 0 ? Math.round(b.value) : ''}</Text>
              ) : null}
              <View
                style={{
                  height: h,
                  width: '70%',
                  maxWidth: 28,
                  borderRadius: 6,
                  backgroundColor: b.value > 0 ? (b.color ?? color ?? c.primary) : c.track,
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {bars.map((b) => (
          <Text key={b.key} style={[styles.label, { color: c.muted }]} numberOfLines={1}>
            {b.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { flexDirection: 'row', alignItems: 'flex-end', position: 'relative' },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  target: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1.5, borderStyle: 'dashed' },
  labels: { flexDirection: 'row', marginTop: 6 },
  label: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600' },
  value: { fontSize: 10, marginBottom: 2 },
});

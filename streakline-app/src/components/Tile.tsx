import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getSegment } from '../lib/segments';
import { progressLabel } from '../lib/trackers';
import type { Tracker } from '../lib/types';
import { c, radius } from '../theme';

/**
 * The tap-to-log tile. Dark when nothing is logged, fills up from the bottom
 * as you make progress, and turns light grey when the day's goal is met.
 */
export function Tile({
  tracker,
  amount,
  streak,
  width,
  onPress,
  onLongPress,
  running,
}: {
  tracker: Tracker;
  amount: number;
  streak: number;
  width: number;
  onPress: () => void;
  onLongPress?: () => void;
  running?: boolean;
}) {
  const progress = Math.min(1, amount / tracker.target);
  const done = progress >= 1;
  const seg = getSegment(tracker.segment);
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={`${tracker.name}, ${progressLabel(tracker, amount)}${done ? ', done' : ''}${streak ? `, ${streak} day streak` : ''}`}
      accessibilityHint={tracker.kind === 'duration' ? 'Opens the focus timer. Long press for details.' : 'Logs progress. Long press for details.'}
      style={({ pressed }) => [styles.tile, { width, backgroundColor: done ? c.tileDone : c.tile, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
    >
      {!done && progress > 0 ? <View style={[styles.fill, { height: `${progress * 100}%` }]} /> : null}
      <View style={styles.top}>
        {streak > 0 ? (
          <View style={styles.badge}>
            <Ionicons name="flash" size={10} color={c.text} />
            <Text style={styles.badgeText}>{streak}</Text>
          </View>
        ) : (
          <View />
        )}
        {running ? <View style={styles.live} /> : <View style={[styles.dot, { backgroundColor: seg.color }]} />}
      </View>
      <Text style={styles.emoji}>{tracker.emoji}</Text>
      <Text style={styles.progress} numberOfLines={1} adjustsFontSizeToFit>
        {progressLabel(tracker, amount)}
      </Text>
      <Text style={[styles.name, done && { color: '#E6E6EA' }]} numberOfLines={1}>
        {tracker.name.toLowerCase()}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { height: 112, borderRadius: radius.lg, padding: 8, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end', gap: 1 },
  fill: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: c.tileFill },
  top: { position: 'absolute', top: 7, left: 8, right: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 1, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 999, paddingHorizontal: 5, paddingVertical: 1 },
  badgeText: { color: c.text, fontSize: 10, fontWeight: '700' },
  dot: { width: 6, height: 6, borderRadius: 3, opacity: 0.9 },
  live: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.live },
  emoji: { fontSize: 26, marginBottom: 2 },
  progress: { color: c.text, fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  name: { color: c.muted, fontSize: 11, fontWeight: '500' },
});

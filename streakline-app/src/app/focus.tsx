import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Chip, Muted, ProgressBar, Row } from '../components/ui';
import { success, tap } from '../lib/feedback';
import { getSegment } from '../lib/segments';
import { clockNow, elapsedMs, formatClock } from '../lib/timer';
import { amountOn, formatMinutes } from '../lib/trackers';
import { useNow } from '../lib/useNow';
import { useToday } from '../lib/useToday';
import { useStore } from '../state/store';
import { c, space } from '../theme';

export default function FocusScreen() {
  const params = useLocalSearchParams<{ tracker?: string }>();
  const { data, dispatch } = useStore();
  const today = useToday();
  const timer = data.timer;
  const trackerId = timer?.trackerId ?? params.tracker;
  const t = data.trackers.find((x) => x.id === trackerId);
  const running = !!timer && timer.startedAt !== null;
  const now = useNow(running);

  if (!t) {
    return (
      <SafeAreaView style={styles.safe}>
        <Muted>That tracker no longer exists.</Muted>
        <Button title="Close" variant="secondary" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const seg = getSegment(t.segment);
  const elapsed = timer ? elapsedMs(timer, now) : 0;
  const logged = amountOn(data.entries, t.id, today);
  const withSession = logged + elapsed / 60000;
  const otherRequested = timer && params.tracker && params.tracker !== timer.trackerId;

  const start = () => {
    tap();
    dispatch({ type: 'timerStart', trackerId: t.id, nowMs: clockNow() });
  };
  const finish = () => {
    success();
    dispatch({ type: 'timerFinish', dateKey: today, nowMs: clockNow(), nowIso: new Date().toISOString() });
    router.back();
  };
  const quickLog = (min: number) => {
    success();
    dispatch({ type: 'log', trackerId: t.id, dateKey: today, amount: min, source: 'manual', nowIso: new Date().toISOString() });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Row style={{ justifyContent: 'space-between', width: '100%' }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10}>
          <Ionicons name="chevron-down" size={28} color={c.text} />
        </Pressable>
        <Chip label={seg.name} dot={seg.color} />
        <View style={{ width: 28 }} />
      </Row>

      <View style={styles.center}>
        {otherRequested ? <Muted style={{ textAlign: 'center' }}>Finish this session before starting another.</Muted> : null}
        <Text style={{ fontSize: 44 }}>{t.emoji}</Text>
        <Text style={styles.name}>{t.name}</Text>
        <Text style={styles.clock} accessibilityRole="timer" accessibilityLabel={`Elapsed ${formatClock(elapsed)}`}>
          {formatClock(elapsed)}
        </Text>
        <Row gap={6}>
          <View style={[styles.dot, { backgroundColor: running ? c.live : timer ? c.faint : c.surface2 }]} />
          <Muted>{running ? 'In deep focus' : timer ? 'Paused' : 'Ready when you are'}</Muted>
        </Row>
        <View style={{ width: '80%', gap: 6, marginTop: space.lg }}>
          <ProgressBar value={withSession / t.target} />
          <Muted style={{ textAlign: 'center', fontSize: 13 }}>
            {formatMinutes(Math.floor(withSession))} of {formatMinutes(t.target)} today
          </Muted>
        </View>
      </View>

      <View style={{ width: '100%', gap: space.sm }}>
        {!timer ? (
          <Button title="Start focus" icon="play" onPress={start} />
        ) : (
          <Row>
            {running ? (
              <Button title="Pause" icon="pause" variant="secondary" style={{ flex: 1 }} onPress={() => dispatch({ type: 'timerPause', nowMs: clockNow() })} />
            ) : (
              <Button title="Resume" icon="play" variant="secondary" style={{ flex: 1 }} onPress={() => dispatch({ type: 'timerResume', nowMs: clockNow() })} />
            )}
            <Button title="Finish & log" icon="checkmark" style={{ flex: 1 }} onPress={finish} />
          </Row>
        )}
        {timer ? (
          <Button title="Discard session" variant="ghost" small onPress={() => dispatch({ type: 'timerCancel' })} />
        ) : (
          <View style={{ gap: space.sm, alignItems: 'center' }}>
            <Muted style={{ fontSize: 13 }}>Already did it? Log time</Muted>
            <Row gap={6}>
              {[15, 30, 45, 60].map((m) => (
                <Chip key={m} label={`+${m}m`} onPress={() => quickLog(m)} />
              ))}
            </Row>
          </View>
        )}
        <Muted style={{ textAlign: 'center', fontSize: 12 }}>Phone face down. One task. The timer keeps running if you leave this screen.</Muted>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'space-between', padding: space.lg, gap: space.lg },
  center: { alignItems: 'center', gap: space.sm, width: '100%', maxWidth: 520 },
  name: { color: c.text, fontSize: 20, fontWeight: '700' },
  clock: { color: c.text, fontSize: 76, fontWeight: '200', letterSpacing: -2, fontVariant: ['tabular-nums'] },
  dot: { width: 8, height: 8, borderRadius: 4 },
});

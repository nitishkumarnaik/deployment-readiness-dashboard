import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { Body, Button, Card, H1, Muted, Row, Screen } from '../components/ui';
import { success, tap } from '../lib/feedback';
import { newId } from '../lib/id';
import { useToday } from '../lib/useToday';
import { getWorkout } from '../lib/workouts';
import { useStore } from '../state/store';
import { space, useColors } from '../theme';

function now(): number {
  return Date.now();
}

function minutesSince(start: number): number {
  return Math.max(1, Math.round((now() - start) / 60000));
}

export default function SessionScreen() {
  const c = useColors();
  const params = useLocalSearchParams<{ workout?: string; low?: string }>();
  const workout = getWorkout(params.workout);
  const { dispatch } = useStore();
  const today = useToday();
  const [low, setLow] = useState(params.low === '1');
  const [done, setDone] = useState<Set<string>>(new Set());
  const [startedAt] = useState(now);

  const toggle = (id: string) => {
    tap();
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const finish = () => {
    dispatch({
      type: 'logSession',
      session: {
        id: newId(),
        dateKey: today,
        workoutId: workout.id,
        lowEnergy: low,
        exercisesDone: done.size,
        exercisesTotal: workout.exercises.length,
        minutes: minutesSince(startedAt),
        at: new Date().toISOString(),
      },
    });
    success();
    router.back();
  };

  return (
    <Screen edges={['bottom']}>
      <View style={{ gap: space.xs }}>
        <H1>{workout.name}</H1>
        <Muted>
          {workout.focus} · about {low ? workout.lowMinutes : workout.minutes} min. Rest 60–90 seconds between sets. Stop if anything hurts.
        </Muted>
      </View>

      <Card tone="calm">
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Body style={{ fontWeight: '700' }}>Low-energy version</Body>
            <Muted>Feeling flat after your dose? Fewer sets, easier moves. It still counts.</Muted>
          </View>
          <Switch
            value={low}
            onValueChange={setLow}
            accessibilityLabel="Low-energy version"
            trackColor={{ true: c.calm, false: c.track }}
          />
        </Row>
      </Card>

      {workout.exercises.map((e, i) => {
        const v = low ? e.low : e.standard;
        const checked = done.has(e.id);
        return (
          <Pressable
            key={e.id}
            onPress={() => toggle(e.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            accessibilityLabel={`${v.name}, ${v.prescription}`}
          >
            {({ pressed }) => (
              <Card style={{ opacity: pressed ? 0.85 : 1, borderColor: checked ? c.primary : c.border }}>
                <Row gap={space.md}>
                  <View
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      borderWidth: 2,
                      borderColor: checked ? c.primary : c.border,
                      backgroundColor: checked ? c.primary : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {checked ? <Ionicons name="checkmark" size={18} color={c.onPrimary} /> : <Muted style={{ fontSize: 13 }}>{i + 1}</Muted>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Body style={{ fontWeight: '700', textDecorationLine: checked ? 'line-through' : 'none' }}>{v.name}</Body>
                    <Body style={{ color: c.primary, fontWeight: '600' }}>{v.prescription}</Body>
                    <Muted style={{ fontSize: 14 }}>{e.cue}</Muted>
                  </View>
                </Row>
              </Card>
            )}
          </Pressable>
        );
      })}

      <Button
        title={done.size === workout.exercises.length ? 'Finish session' : `Finish (${done.size}/${workout.exercises.length} done)`}
        icon="checkmark-done"
        onPress={finish}
        disabled={done.size === 0}
      />
      <Muted style={{ textAlign: 'center', fontSize: 13 }}>
        Check with your clinician before starting a new exercise programme.
      </Muted>
    </Screen>
  );
}

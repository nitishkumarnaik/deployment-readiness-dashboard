import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { Body, Card, H1, H2, IconBadge, Label, Muted, Row, Screen } from '../../components/ui';
import { cycleDayShort } from '../../lib/cycle';
import { formatDay, startOfWeek } from '../../lib/dates';
import { buildWeekPlan, type PlanDay } from '../../lib/plan';
import { useToday } from '../../lib/useToday';
import { getWorkout, WORKOUTS } from '../../lib/workouts';
import { useStore } from '../../state/store';
import { space, useColors } from '../../theme';

export default function TrainScreen() {
  const c = useColors();
  const { data } = useStore();
  const today = useToday();
  const plan = useMemo(() => (data.profile ? buildWeekPlan(startOfWeek(today), data, today) : []), [data, today]);
  if (!data.profile) return null;

  const done = plan.filter((d) => d.done).length;

  return (
    <Screen>
      <View style={{ gap: space.xs }}>
        <H1>This week</H1>
        <Muted>
          {data.profile.strengthDaysPerWeek} short strength sessions, placed on the days you usually feel best. {done} done so far.
        </Muted>
      </View>

      <Card style={{ paddingVertical: space.sm, gap: 0 }}>
        {plan.map((d, i) => (
          <PlanRow key={d.dateKey} day={d} today={today} last={i === plan.length - 1} />
        ))}
      </Card>

      <View style={{ gap: space.xs }}>
        <H2>Workouts</H2>
        <Muted>Bodyweight or light dumbbells, about 20 minutes. Every move has a low-energy version.</Muted>
      </View>

      {WORKOUTS.map((w) => (
        <Pressable
          key={w.id}
          onPress={() => router.push({ pathname: '/session', params: { workout: w.id } })}
          accessibilityRole="button"
          accessibilityLabel={`${w.name}, ${w.focus}, ${w.minutes} minutes`}
        >
          {({ pressed }) => (
            <Card style={{ opacity: pressed ? 0.8 : 1 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <H2>{w.name}</H2>
                  <Muted>
                    {w.focus} · {w.minutes} min
                  </Muted>
                </View>
                <Ionicons name="chevron-forward" size={20} color={c.muted} />
              </Row>
              <Muted numberOfLines={2}>{w.exercises.map((e) => e.standard.name).join(' · ')}</Muted>
            </Card>
          )}
        </Pressable>
      ))}
    </Screen>
  );
}

function PlanRow({ day, today, last }: { day: PlanDay; today: string; last: boolean }) {
  const c = useColors();
  const isToday = day.dateKey === today;
  const isPast = day.dateKey < today;
  const icon = day.kind === 'strength' ? 'barbell-outline' : day.kind === 'walk' ? 'walk-outline' : 'bed-outline';
  const title =
    day.kind === 'strength' ? `Strength · ${getWorkout(day.workoutId).name}` : day.kind === 'walk' ? 'Gentle walk' : 'Rest';
  const canStart = day.kind === 'strength' && !day.done && !isPast;

  const content = (
    <Row
      gap={space.md}
      style={{
        paddingVertical: space.md,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.border,
        opacity: isPast && !day.done ? 0.55 : 1,
      }}
    >
      <IconBadge
        icon={day.done ? 'checkmark' : icon}
        color={day.done ? c.onPrimary : day.kind === 'strength' ? c.primary : c.muted}
        bg={day.done ? c.primary : day.kind === 'strength' ? c.primarySoft : c.track}
        size={34}
      />
      <View style={{ flex: 1 }}>
        <Row gap={6}>
          <Label style={{ color: isToday ? c.primary : c.muted }}>{isToday ? 'Today' : formatDay(day.dateKey)}</Label>
          {day.cycleDay !== null ? <Muted style={{ fontSize: 12 }}>· {cycleDayShort(day.cycleDay).toLowerCase()}</Muted> : null}
        </Row>
        <Body style={{ fontWeight: '700' }}>{title}</Body>
        {isToday || !isPast ? <Muted style={{ fontSize: 14 }} numberOfLines={2}>{day.reason}</Muted> : null}
      </View>
      {canStart ? <Ionicons name="chevron-forward" size={18} color={c.muted} /> : null}
    </Row>
  );

  if (!canStart) return content;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/session', params: { workout: day.workoutId ?? 'A' } })}
      accessibilityRole="button"
      accessibilityLabel={`${formatDay(day.dateKey)}: ${title}. Start session`}
    >
      {content}
    </Pressable>
  );
}

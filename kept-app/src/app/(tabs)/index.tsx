import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { Body, Button, Card, Chip, H1, H2, IconBadge, Label, Muted, ProgressBar, Row, Screen, Stat, Wrap } from '../../components/ui';
import { cycleDayFor, cycleDayShort, isDoseDue, symptomProfile } from '../../lib/cycle';
import { formatDay, greetingFor, startOfWeek } from '../../lib/dates';
import { success, tap } from '../../lib/feedback';
import { newId } from '../../lib/id';
import { buildWeekPlan } from '../../lib/plan';
import { LOW_APPETITE_IDEAS, proteinForDay, proteinStreak, QUICK_ADDS, type QuickAdd } from '../../lib/protein';
import { weekScore } from '../../lib/score';
import { medicationLabel, type Level } from '../../lib/types';
import { useToday } from '../../lib/useToday';
import { getWorkout } from '../../lib/workouts';
import { useStore } from '../../state/store';
import { space, useColors } from '../../theme';

const LEVEL_WORD = ['none', 'mild', 'moderate', 'strong'];

export default function TodayScreen() {
  const c = useColors();
  const { data, dispatch } = useStore();
  const today = useToday();
  const p = data.profile;

  const cp = useMemo(() => (p ? symptomProfile(data.checkins, data.doses, p) : null), [data.checkins, data.doses, p]);
  const plan = useMemo(() => (p && cp ? buildWeekPlan(startOfWeek(today), data, today, cp) : []), [data, today, cp, p]);
  if (!p || !cp) return null;

  const todayPlan = plan.find((d) => d.dateKey === today);
  const target = p.proteinTargetG;
  const protein = proteinForDay(data.protein, today);
  const remaining = Math.max(0, target - protein);
  const streak = proteinStreak(data.protein, target, today);
  const checkin = data.checkins.find((x) => x.dateKey === today);
  const cycleDay = cycleDayFor(today, p, data.doses);
  const doseDue = isDoseDue(today, p, data.doses);
  const doseToday = data.doses.find((d) => d.dateKey === today);
  const week = weekScore(startOfWeek(today), data, today);
  const lowAppetite = checkin ? checkin.lowAppetite >= 2 : cycleDay !== null && cp.burden[cycleDay] >= 1.4;
  const todaysEntries = data.protein.filter((e) => e.dateKey === today);

  const add = (q: QuickAdd) => {
    const reached = protein < target && protein + q.grams >= target;
    if (reached) success();
    else tap();
    dispatch({
      type: 'addProtein',
      entry: { id: newId(), dateKey: today, grams: q.grams, label: q.label, at: new Date().toISOString() },
    });
  };

  const undo = () => {
    const last = todaysEntries[todaysEntries.length - 1];
    if (last) dispatch({ type: 'removeProtein', id: last.id });
  };

  const cycleChip = cycleDay === null ? 'Daily medication' : cycleDayShort(cycleDay);

  const workout = todayPlan?.workoutId ? getWorkout(todayPlan.workoutId) : null;

  return (
    <Screen>
      <View style={{ gap: space.sm }}>
        <Muted>{formatDay(today)}</Muted>
        <H1>
          {greetingFor()}
          {p.name ? `, ${p.name}` : ''}
        </H1>
        <Wrap>
          <Chip label={cycleChip} icon="calendar-outline" />
          {streak > 0 ? <Chip label={`${streak}-day protein streak`} icon="flame-outline" tone="accent" /> : null}
        </Wrap>
      </View>

      {doseDue ? (
        <Card tone="accent">
          <Row gap={space.md}>
            <IconBadge icon="medkit-outline" color={c.accent} bg={c.card} />
            <View style={{ flex: 1 }}>
              <H2>{p.frequency === 'weekly' ? 'Dose day' : "Today's dose"}</H2>
              <Muted>Log your {medicationLabel(p.medication).toLowerCase()} dose so your plan stays in sync.</Muted>
            </View>
          </Row>
          <Button title="Log dose" icon="add-circle-outline" onPress={() => router.push('/log-dose')} />
        </Card>
      ) : null}

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Label>Protein floor</Label>
          {doseToday ? <Muted style={{ fontSize: 13 }}>Dose logged: {doseToday.amount}</Muted> : null}
        </Row>
        <Row gap={6} style={{ alignItems: 'flex-end' }}>
          <Body style={{ fontSize: 40, lineHeight: 44, fontWeight: '800', color: c.text }}>{protein}</Body>
          <Muted style={{ marginBottom: 6 }}>/ {target} g</Muted>
        </Row>
        <ProgressBar value={protein / target} color={c.accent} />
        <Muted>
          {remaining === 0
            ? 'Floor reached. That protein is protecting your muscle.'
            : `${remaining} g to go. That's about ${Math.max(1, Math.round(remaining / 25))} shake${Math.round(remaining / 25) > 1 ? 's' : ''} or a palm of chicken.`}
        </Muted>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {QUICK_ADDS.slice(0, 4).map((q) => (
            <Pressable
              key={q.id}
              onPress={() => add(q)}
              accessibilityRole="button"
              accessibilityLabel={`Add ${q.grams} grams, ${q.label}`}
              style={({ pressed }) => ({
                flexGrow: 1,
                flexBasis: '45%',
                minHeight: 56,
                borderRadius: 14,
                paddingHorizontal: space.md,
                paddingVertical: space.sm,
                justifyContent: 'center',
                backgroundColor: c.accentSoft,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Body style={{ fontWeight: '800', color: c.accent }}>+{q.grams} g</Body>
              <Muted style={{ fontSize: 13 }} numberOfLines={1}>
                {q.label}
              </Muted>
            </Pressable>
          ))}
        </View>
        <Row>
          <Button title="More foods" variant="secondary" icon="add" onPress={() => router.push('/add-protein')} style={{ flex: 1 }} />
          {todaysEntries.length > 0 ? (
            <Button title="Undo" variant="ghost" icon="arrow-undo-outline" onPress={undo} accessibilityHint="Removes the last protein entry" />
          ) : null}
        </Row>
        {lowAppetite ? (
          <Card tone="calm" style={{ padding: space.md }}>
            <Row>
              <Ionicons name="leaf-outline" size={18} color={c.calm} />
              <Body style={{ fontWeight: '700', color: c.calm }}>Low-appetite mode</Body>
            </Row>
            {LOW_APPETITE_IDEAS.slice(0, 3).map((idea) => (
              <Muted key={idea}>• {idea}</Muted>
            ))}
          </Card>
        ) : null}
      </Card>

      {todayPlan ? (
        <Card>
          <Label>Today&apos;s plan</Label>
          <Row gap={space.md}>
            <IconBadge
              icon={todayPlan.kind === 'strength' ? 'barbell-outline' : todayPlan.kind === 'walk' ? 'walk-outline' : 'bed-outline'}
              color={c.primary}
              bg={c.primarySoft}
            />
            <View style={{ flex: 1 }}>
              <H2>
                {todayPlan.kind === 'strength' && workout
                  ? `Strength: ${workout.focus.toLowerCase()}`
                  : todayPlan.kind === 'walk'
                    ? 'Gentle walk'
                    : 'Rest and recover'}
              </H2>
              <Muted>{todayPlan.reason}</Muted>
            </View>
          </Row>
          {todayPlan.kind === 'strength' && workout && !todayPlan.done ? (
            <View style={{ gap: space.sm }}>
              <Button
                title={`Start ${workout.name} · ${workout.minutes} min`}
                icon="play"
                onPress={() => router.push({ pathname: '/session', params: { workout: workout.id } })}
              />
              <Button
                title={`Low-energy version · ${workout.lowMinutes} min`}
                variant="secondary"
                onPress={() => router.push({ pathname: '/session', params: { workout: workout.id, low: '1' } })}
              />
            </View>
          ) : null}
          {todayPlan.done ? <Chip label="Session done" icon="checkmark-circle" selected /> : null}
        </Card>
      ) : null}

      {checkin ? (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Label>Today&apos;s check-in</Label>
            <Button title="Edit" variant="ghost" onPress={() => router.push('/check-in')} style={{ minHeight: 32 }} />
          </Row>
          <Wrap>
            <Chip label={`Nausea: ${LEVEL_WORD[checkin.nausea as Level]}`} />
            <Chip label={`Fatigue: ${LEVEL_WORD[checkin.fatigue as Level]}`} />
            <Chip label={`Appetite: ${checkin.lowAppetite === 0 ? 'normal' : `${LEVEL_WORD[checkin.lowAppetite]} dip`}`} />
          </Wrap>
        </Card>
      ) : (
        <Card tone="calm">
          <Row gap={space.md}>
            <IconBadge icon="pulse-outline" color={c.calm} bg={c.card} />
            <View style={{ flex: 1 }}>
              <H2>How are you feeling?</H2>
              <Muted>A 10-second check-in teaches Kept your dose-cycle pattern.</Muted>
            </View>
          </Row>
          <Button title="Check in" onPress={() => router.push('/check-in')} />
        </Card>
      )}

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Label>This week</Label>
          <Button title="Insights" variant="ghost" onPress={() => router.push('/insights')} style={{ minHeight: 32 }} />
        </Row>
        <Row gap={space.lg}>
          <Stat label="Muscle Score" value={String(week.score)} sub={week.inProgress ? 'so far' : undefined} />
          <Stat label="Protein days" value={`${week.proteinDays}/${week.daysCounted}`} />
          <Stat label="Sessions" value={`${week.sessions}/${week.sessionGoal}`} />
        </Row>
        <Button title="Log weight" variant="secondary" icon="scale-outline" onPress={() => router.push('/log-weight')} />
      </Card>
    </Screen>
  );
}

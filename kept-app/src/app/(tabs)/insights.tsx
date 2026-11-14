import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { BarChart } from '../../components/BarChart';
import { Body, Button, Card, Chip, H1, H2, Label, Muted, Row, Screen, Stat } from '../../components/ui';
import { cycleInsight, peakDay, symptomProfile } from '../../lib/cycle';
import { addDays, formatShortDate, WEEKDAY_SHORT, weekdayOf } from '../../lib/dates';
import { proteinByDay } from '../../lib/protein';
import { scoreHistory, scoreLabel } from '../../lib/score';
import { formatWeight, formatWeightChange, kgToUnits } from '../../lib/units';
import { useToday } from '../../lib/useToday';
import { useStore } from '../../state/store';
import { space, useColors } from '../../theme';

export default function InsightsScreen() {
  const c = useColors();
  const { data } = useStore();
  const today = useToday();
  const p = data.profile;

  const history = useMemo(() => scoreHistory(data, today, 8), [data, today]);
  const cp = useMemo(() => (p ? symptomProfile(data.checkins, data.doses, p) : null), [data.checkins, data.doses, p]);
  if (!p || !cp) return null;

  const current = history[history.length - 1];
  const byDay = proteinByDay(data.protein);
  const proteinBars = Array.from({ length: 14 }, (_, i) => {
    const key = addDays(today, i - 13);
    const v = byDay.get(key) ?? 0;
    return {
      key,
      label: i % 2 === 1 ? WEEKDAY_SHORT[weekdayOf(key)][0] : '',
      value: v,
      color: v >= p.proteinTargetG ? c.accent : undefined,
      a11y: `${formatShortDate(key)}: ${v} grams`,
    };
  });
  const proteinMax = Math.max(p.proteinTargetG * 1.2, ...proteinBars.map((b) => b.value));

  const weights = [...data.weights].sort((a, b) => (a.dateKey < b.dateKey ? -1 : 1));
  const firstW = weights[0];
  const lastW = weights[weights.length - 1];
  const recentW = weights.slice(-8);
  const wMin = Math.min(...recentW.map((w) => w.kg));

  const peak = peakDay(cp);

  return (
    <Screen>
      <H1>Insights</H1>

      <Card tone="primary">
        <Label>Muscle Score</Label>
        <Row gap={space.md} style={{ alignItems: 'flex-end' }}>
          <Body style={{ fontSize: 52, lineHeight: 56, fontWeight: '800', color: c.primary }}>{current?.score ?? 0}</Body>
          <View style={{ marginBottom: 8 }}>
            <Body style={{ fontWeight: '700' }}>{scoreLabel(current?.score ?? 0)}</Body>
            <Muted>{current?.inProgress ? 'This week so far' : 'This week'}</Muted>
          </View>
        </Row>
        <Muted>Half comes from hitting your protein floor, 40% from strength sessions and 10% from check-ins.</Muted>
        {history.length > 1 ? (
          <BarChart
            max={100}
            showValues
            bars={history.map((w, i) => ({
              key: w.weekStart,
              label: i === history.length - 1 ? 'Now' : formatShortDate(w.weekStart),
              value: w.score,
              color: i === history.length - 1 ? c.primary : c.muted,
              a11y: `Week of ${formatShortDate(w.weekStart)}: ${w.score}`,
            }))}
          />
        ) : null}
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <H2>Protein, last 14 days</H2>
        </Row>
        <BarChart bars={proteinBars} max={proteinMax} target={p.proteinTargetG} color={c.track} />
        <Muted>Dashed line: your {p.proteinTargetG} g floor. Orange days hit it.</Muted>
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <H2>Your dose cycle</H2>
          <Chip label={cp.personalized ? 'Personal pattern' : 'Learning'} icon={cp.personalized ? 'sparkles-outline' : 'hourglass-outline'} />
        </Row>
        {p.frequency === 'weekly' ? (
          <BarChart
            max={3}
            height={90}
            bars={cp.burden.map((b, i) => ({
              key: String(i),
              label: i === 0 ? 'Dose' : `+${i}`,
              value: b,
              color: i === peak ? c.accent : c.calm,
              a11y: `${i === 0 ? 'Dose day' : `Day ${i} after dose`}: side-effect level ${b.toFixed(1)} of 3`,
            }))}
          />
        ) : null}
        <Muted>{cycleInsight(cp, p)}</Muted>
      </Card>

      <Card>
        <H2>Weight</H2>
        {firstW && lastW ? (
          <>
            <Row gap={space.lg}>
              <Stat label="Latest" value={formatWeight(lastW.kg, p.units)} sub={formatShortDate(lastW.dateKey)} />
              <Stat label="Change" value={formatWeightChange(lastW.kg - p.startWeightKg, p.units)} sub="since start" />
              <Stat label="Goal" value={formatWeight(p.goalWeightKg, p.units)} />
            </Row>
            {recentW.length > 1 ? (
              <BarChart
                height={70}
                max={Math.max(...recentW.map((w) => w.kg)) - wMin + 1}
                color={c.primary}
                bars={recentW.map((w) => ({
                  key: w.dateKey,
                  label: formatShortDate(w.dateKey).split(' ')[0],
                  value: w.kg - wMin + 0.5,
                  a11y: `${formatShortDate(w.dateKey)}: ${kgToUnits(w.kg, p.units).toFixed(1)} ${p.units}`,
                }))}
              />
            ) : null}
            <Muted>
              On GLP-1 medication, how you lose weight matters as much as how much. Protein and strength help make sure it&apos;s mostly fat.
            </Muted>
          </>
        ) : (
          <Muted>No weigh-ins yet.</Muted>
        )}
        <Button title="Log weight" variant="secondary" icon="scale-outline" onPress={() => router.push('/log-weight')} />
      </Card>

      <Card tone="calm">
        <H2>Seeing your clinician soon?</H2>
        <Muted>Get a one-page summary of your doses, side effects, weight, protein and training to share.</Muted>
        <Button title="Create clinician summary" icon="document-text-outline" onPress={() => router.push('/report')} />
      </Card>
    </Screen>
  );
}

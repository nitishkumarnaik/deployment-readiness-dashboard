import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { ContributionGrid, weeksThatFit } from '../../components/ContributionGrid';
import { Card, Label, Muted, ProgressBar, Row, Screen, Stat, Title } from '../../components/ui';
import { addDays } from '../../lib/dates';
import { buildGrid } from '../../lib/grid';
import { SEGMENTS } from '../../lib/segments';
import { activeTrackers, amountsByDay, consistency, currentStreak, entryDays, levelFor } from '../../lib/trackers';
import { useContentWidth } from '../../lib/useTileWidth';
import { useToday } from '../../lib/useToday';
import { openTracker } from '../../lib/useTrackerTap';
import { useStore } from '../../state/store';
import { c, space } from '../../theme';

export default function InsightsScreen() {
  const { data } = useStore();
  const today = useToday();
  const width = useContentWidth(space.lg * 2);
  const weeks = weeksThatFit(width);
  const trackers = useMemo(() => activeTrackers(data.trackers), [data.trackers]);

  const maps = useMemo(() => new Map(trackers.map((t) => [t.id, amountsByDay(data.entries, t.id)])), [trackers, data.entries]);

  const overall = useMemo(
    () =>
      buildGrid(today, weeks, (d) => {
        const live = trackers.filter((t) => t.createdOn <= d);
        if (live.length === 0) return 0;
        let any = false;
        let done = 0;
        for (const t of live) {
          const a = maps.get(t.id)?.get(d) ?? 0;
          if (a > 0) any = true;
          if (a >= t.target) done += 1;
        }
        if (!any) return 0;
        return done / live.length >= 0.7 ? 2 : 1;
      }),
    [today, weeks, trackers, maps],
  );

  const activeDays = new Set(data.entries.map((e) => e.dateKey)).size;
  let strongDays = 0;
  for (const col of overall) for (const cell of col.cells) if (cell.level === 2) strongDays += 1;
  const last30 = Array.from({ length: 30 }, (_, i) => addDays(today, -i)).filter((d) => data.entries.some((e) => e.dateKey === d)).length;

  return (
    <Screen>
      <Title>Insights</Title>

      <Card>
        <Label>All trackers</Label>
        <Row style={{ justifyContent: 'space-between' }}>
          <Stat label="Days active" value={String(activeDays)} />
          <Stat label="Strong days" value={String(strongDays)} />
          <Stat label="Last 30 days" value={`${last30}/30`} />
        </Row>
        <ContributionGrid columns={overall} label="Overall activity" />
        <Muted style={{ fontSize: 12 }}>White: 70%+ of your goals met that day. Grey: some progress.</Muted>
      </Card>

      <Card>
        <Label>Segments · last 7 days</Label>
        {SEGMENTS.map((s) => {
          const own = trackers.filter((t) => t.segment === s.id);
          if (own.length === 0) return null;
          const avg = own.reduce((sum, t) => sum + consistency(t, data.entries, today), 0) / own.length;
          return (
            <View key={s.id} style={{ gap: 6 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row gap={6}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.color }} />
                  <Text style={{ color: c.text, fontWeight: '600' }}>{s.name}</Text>
                </Row>
                <Text style={{ color: c.muted, fontVariant: ['tabular-nums'] }}>{Math.round(avg * 100)}%</Text>
              </Row>
              <ProgressBar value={avg} />
            </View>
          );
        })}
      </Card>

      {trackers.map((t) => {
        const byDay = maps.get(t.id) ?? new Map<string, number>();
        const grid = buildGrid(today, weeks, (d) => levelFor(t, byDay.get(d) ?? 0));
        return (
          <Card key={t.id} onPress={() => openTracker(t)} accessibilityLabel={`${t.name} details`}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={6}>
                <Text style={{ fontSize: 16 }}>{t.emoji}</Text>
                <Text style={{ color: c.text, fontWeight: '700', fontSize: 15 }}>{t.name}</Text>
                <Ionicons name="chevron-forward" size={14} color={c.faint} />
              </Row>
            </Row>
            <Row gap={space.xl}>
              <Stat label="Entries" value={String(entryDays(t, data.entries))} />
              <Stat label="Streak" value={`⚡${currentStreak(t, data.entries, today)}`} />
            </Row>
            <ContributionGrid columns={grid} />
          </Card>
        );
      })}
      {trackers.length === 0 ? <Muted>Add trackers to see your grids fill up.</Muted> : null}
    </Screen>
  );
}

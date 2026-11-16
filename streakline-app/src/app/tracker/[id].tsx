import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { ContributionGrid, weeksThatFit } from '../../components/ContributionGrid';
import { TrackerForm, type TrackerDraft } from '../../components/TrackerForm';
import { Button, Card, Chip, H2, Label, Muted, Row, Screen, Stat } from '../../components/ui';
import { confirm, success, tap } from '../../lib/feedback';
import { buildGrid } from '../../lib/grid';
import { getSegment } from '../../lib/segments';
import { amountOn, amountsByDay, bestStreak, consistency, currentStreak, entryDays, goalLabel, levelFor, progressLabel } from '../../lib/trackers';
import { useContentWidth } from '../../lib/useTileWidth';
import { useToday } from '../../lib/useToday';
import { useStore } from '../../state/store';
import { c, space } from '../../theme';

export default function TrackerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, dispatch } = useStore();
  const today = useToday();
  const width = useContentWidth(space.lg * 2);
  const t = data.trackers.find((x) => x.id === id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<TrackerDraft | null>(null);

  const grid = useMemo(() => {
    if (!t) return [];
    const byDay = amountsByDay(data.entries, t.id);
    return buildGrid(today, weeksThatFit(width), (d) => levelFor(t, byDay.get(d) ?? 0));
  }, [t, data.entries, today, width]);

  if (!t) {
    return (
      <Screen edges={['bottom']}>
        <Muted>This tracker was deleted.</Muted>
      </Screen>
    );
  }

  const seg = getSegment(t.segment);
  const amount = amountOn(data.entries, t.id, today);
  const nowIso = () => new Date().toISOString();
  const streak = currentStreak(t, data.entries, today);

  const save = () => {
    if (!draft || !draft.name.trim()) return;
    dispatch({ type: 'updateTracker', id: t.id, patch: { ...draft, name: draft.name.trim(), target: draft.kind === 'check' ? 1 : draft.target } });
    setEditing(false);
    success();
  };

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: '' }} />
      <Row gap={space.md}>
        <Text style={{ fontSize: 40 }}>{t.emoji}</Text>
        <View style={{ flex: 1, gap: 4 }}>
          <H2 style={{ fontSize: 24 }}>{t.name}</H2>
          <Row gap={6} style={{ flexWrap: 'wrap' }}>
            <Chip label={seg.name} dot={seg.color} />
            <Chip label={goalLabel(t)} />
            <Chip label={t.visibility === 'public' ? 'Community' : 'Only me'} />
          </Row>
        </View>
      </Row>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Stat label="Entries" value={String(entryDays(t, data.entries))} />
          <Stat label="Streak" value={`⚡${streak}`} />
          <Stat label="Best" value={String(bestStreak(t, data.entries))} />
          <Stat label="Last 7 days" value={`${Math.round(consistency(t, data.entries, today) * 100)}%`} />
        </Row>
        <ContributionGrid columns={grid} />
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Label>Today</Label>
          <Text style={{ color: c.text, fontWeight: '700', fontSize: 16 }}>{progressLabel(t, amount)}</Text>
        </Row>
        <Row style={{ flexWrap: 'wrap' }}>
          {t.kind === 'check' ? (
            <Button
              title={amount >= 1 ? 'Mark not done' : 'Mark done'}
              icon={amount >= 1 ? 'close' : 'checkmark'}
              small
              onPress={() => {
                tap();
                dispatch({ type: 'setCheck', trackerId: t.id, dateKey: today, done: amount < 1, nowIso: nowIso() });
              }}
            />
          ) : null}
          {t.kind === 'count' ? (
            <Button title="+1" small onPress={() => dispatch({ type: 'log', trackerId: t.id, dateKey: today, amount: 1, source: 'tap', nowIso: nowIso() })} />
          ) : null}
          {t.kind === 'duration' ? (
            <>
              <Button title="Focus timer" icon="play" small onPress={() => router.push({ pathname: '/focus', params: { tracker: t.id } })} />
              {[15, 30].map((m) => (
                <Button key={m} title={`+${m}m`} variant="secondary" small onPress={() => dispatch({ type: 'log', trackerId: t.id, dateKey: today, amount: m, source: 'manual', nowIso: nowIso() })} />
              ))}
            </>
          ) : null}
          {amount > 0 && t.kind !== 'check' ? (
            <Button title="Undo" icon="arrow-undo" variant="ghost" small onPress={() => dispatch({ type: 'undoLast', trackerId: t.id, dateKey: today, nowIso: nowIso() })} />
          ) : null}
        </Row>
      </Card>

      <Button title="Share streak" icon="share-outline" onPress={() => router.push({ pathname: '/share/[id]', params: { id: t.id } })} />

      {editing && draft ? (
        <Card>
          <TrackerForm draft={draft} onChange={setDraft} />
          <Row>
            <Button title="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setEditing(false)} />
            <Button title="Save" style={{ flex: 1 }} onPress={save} disabled={!draft.name.trim()} />
          </Row>
        </Card>
      ) : (
        <Button
          title="Edit tracker"
          icon="create-outline"
          variant="secondary"
          onPress={() => {
            setDraft({ name: t.name, emoji: t.emoji, segment: t.segment, kind: t.kind, target: t.target, visibility: t.visibility });
            setEditing(true);
          }}
        />
      )}

      <Row>
        <Button
          title={t.archived ? 'Show on Today' : 'Hide from Today'}
          icon={t.archived ? 'eye-outline' : 'eye-off-outline'}
          variant="ghost"
          style={{ flex: 1 }}
          onPress={() => dispatch({ type: 'updateTracker', id: t.id, patch: { archived: !t.archived } })}
        />
        <Button
          title="Delete"
          icon="trash-outline"
          variant="ghost"
          style={{ flex: 1 }}
          onPress={() =>
            confirm('Delete tracker?', `This removes ${t.name} and all of its history.`, 'Delete', () => {
              dispatch({ type: 'deleteTracker', id: t.id });
              router.back();
            })
          }
        />
      </Row>
    </Screen>
  );
}

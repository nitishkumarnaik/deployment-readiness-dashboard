import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Tile } from '../../components/Tile';
import { Avatar, Button, Card, Chip, IconButton, Label, Muted, Row, Screen, Title } from '../../components/ui';
import { formatDay } from '../../lib/dates';
import { getSegment, SEGMENTS } from '../../lib/segments';
import { elapsedMs, formatClock } from '../../lib/timer';
import { activeTrackers, amountOn, currentStreak, formatMinutes } from '../../lib/trackers';
import type { SegmentId, Tracker } from '../../lib/types';
import { useNow } from '../../lib/useNow';
import { useTileWidth } from '../../lib/useTileWidth';
import { useToday } from '../../lib/useToday';
import { openTracker, useTrackerTap } from '../../lib/useTrackerTap';
import { useStore } from '../../state/store';
import { c, radius, space } from '../../theme';

export default function TodayScreen() {
  const { data, dispatch } = useStore();
  const today = useToday();
  const tapTracker = useTrackerTap();
  const [edit, setEdit] = useState(false);
  const [filter, setFilter] = useState<SegmentId | 'all'>('all');
  const width = useTileWidth(3);
  const now = useNow(!!data.timer?.startedAt);

  const all = useMemo(() => activeTrackers(data.trackers), [data.trackers]);
  const segmentsInUse = SEGMENTS.filter((s) => all.some((t) => t.segment === s.id));
  const trackers = filter === 'all' ? all : all.filter((t) => t.segment === filter);
  const doneCount = all.filter((t) => amountOn(data.entries, t.id, today) >= t.target).length;
  const todays = data.entries.filter((e) => e.dateKey === today).sort((a, b) => (a.at < b.at ? 1 : -1));
  const timerTracker = data.timer ? data.trackers.find((t) => t.id === data.timer!.trackerId) : undefined;
  const p = data.profile;

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Pressable onPress={() => router.push('/you')} accessibilityRole="button" accessibilityLabel="Your profile">
          <Avatar emoji={p?.emoji ?? '🙂'} size={38} />
        </Pressable>
        <IconButton icon="add" label="New tracker" onPress={() => router.push('/tracker/new')} />
      </Row>

      <View style={{ gap: 2 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Title>Today</Title>
          <Button title={edit ? 'Done' : 'Edit'} variant="ghost" small onPress={() => setEdit(!edit)} />
        </Row>
        <Muted>
          {formatDay(today)} · {doneCount} of {all.length} done
        </Muted>
      </View>

      {segmentsInUse.length > 1 ? (
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          <Chip label="All" selected={filter === 'all'} onPress={() => setFilter('all')} />
          {segmentsInUse.map((s) => (
            <Chip key={s.id} label={s.name} dot={s.color} selected={filter === s.id} onPress={() => setFilter(s.id)} />
          ))}
        </Row>
      ) : null}

      {data.timer && timerTracker ? (
        <Card onPress={() => router.push({ pathname: '/focus', params: { tracker: timerTracker.id } })} accessibilityLabel={`Focus session running for ${timerTracker.name}`} style={{ paddingVertical: space.md }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row>
              <View style={[styles.liveDot, !data.timer.startedAt && { backgroundColor: c.faint }]} />
              <Text style={styles.timerName}>
                {timerTracker.emoji} {timerTracker.name}
              </Text>
            </Row>
            <Text style={styles.timerClock}>{formatClock(elapsedMs(data.timer, now))}</Text>
          </Row>
        </Card>
      ) : null}

      {all.length === 0 ? (
        <Card>
          <Text style={{ fontSize: 28 }}>✨</Text>
          <Label>Nothing to track yet</Label>
          <Muted>Add a tracker for deep focus, ideation, study, research, fitness or sleep. Tap a tile to log it.</Muted>
          <Button title="Add a tracker" icon="add" onPress={() => router.push('/tracker/new')} />
        </Card>
      ) : (
        <View style={styles.grid}>
          {trackers.map((t, i) =>
            edit ? (
              <EditTile
                key={t.id}
                tracker={t}
                width={width}
                first={i === 0}
                last={i === trackers.length - 1}
                onMove={(dir) => dispatch({ type: 'moveTracker', id: t.id, dir })}
                onHide={() => dispatch({ type: 'updateTracker', id: t.id, patch: { archived: true } })}
                onOpen={() => openTracker(t)}
              />
            ) : (
              <Tile
                key={t.id}
                tracker={t}
                width={width}
                amount={amountOn(data.entries, t.id, today)}
                streak={currentStreak(t, data.entries, today)}
                running={data.timer?.trackerId === t.id}
                onPress={() => tapTracker(t)}
                onLongPress={() => openTracker(t)}
              />
            ),
          )}
          {!edit ? (
            <Pressable onPress={() => router.push('/tracker/new')} accessibilityRole="button" accessibilityLabel="Add tracker" style={[styles.addTile, { width }]}>
              <Ionicons name="add" size={26} color={c.faint} />
              <Text style={{ color: c.faint, fontSize: 11 }}>add</Text>
            </Pressable>
          ) : null}
        </View>
      )}
      {edit ? <Muted style={{ fontSize: 13 }}>Arrows reorder. The eye hides a tracker from Today (its history is kept; restore it from its page).</Muted> : null}

      <View style={{ gap: space.sm }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Label>Entries · {todays.length}</Label>
          {!edit && all.length > 0 ? <Muted style={{ fontSize: 12 }}>Hold a tile for details</Muted> : null}
        </Row>
        {todays.length === 0 ? (
          <Muted>Nothing logged yet today. Tap a tile to start.</Muted>
        ) : (
          todays.slice(0, 12).map((e) => {
            const t = data.trackers.find((x) => x.id === e.trackerId);
            if (!t) return null;
            const time = new Date(e.at);
            return (
              <Row key={e.id} style={styles.entry}>
                <Text style={{ fontSize: 16 }}>{t.emoji}</Text>
                <Text style={styles.entryName} numberOfLines={1}>
                  {t.name}
                </Text>
                <Text style={styles.entryAmount}>{t.kind === 'duration' ? formatMinutes(e.amount) : t.kind === 'count' ? `+${e.amount}` : 'done'}</Text>
                <Text style={styles.entryTime}>{`${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`}</Text>
              </Row>
            );
          })
        )}
      </View>
    </Screen>
  );
}

function EditTile({ tracker, width, first, last, onMove, onHide, onOpen }: { tracker: Tracker; width: number; first: boolean; last: boolean; onMove: (dir: -1 | 1) => void; onHide: () => void; onOpen: () => void }) {
  const seg = getSegment(tracker.segment);
  const btn = (icon: 'chevron-back' | 'chevron-forward' | 'eye-off-outline', label: string, onPress: () => void, disabled = false) => (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} hitSlop={6} style={{ opacity: disabled ? 0.25 : 1, padding: 4 }}>
      <Ionicons name={icon} size={18} color={c.text} />
    </Pressable>
  );
  return (
    <View style={[styles.editTile, { width, borderColor: seg.color }]}>
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Edit ${tracker.name}`} style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 22 }}>{tracker.emoji}</Text>
        <Text style={{ color: c.text, fontSize: 11 }} numberOfLines={1}>
          {tracker.name.toLowerCase()}
        </Text>
      </Pressable>
      <Row gap={2}>
        {btn('chevron-back', `Move ${tracker.name} earlier`, () => onMove(-1), first)}
        {btn('eye-off-outline', `Hide ${tracker.name}`, onHide)}
        {btn('chevron-forward', `Move ${tracker.name} later`, () => onMove(1), last)}
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  addTile: { height: 112, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: c.line, alignItems: 'center', justifyContent: 'center' },
  editTile: { height: 112, borderRadius: radius.lg, backgroundColor: c.tile, borderWidth: 1, alignItems: 'center', justifyContent: 'space-around', padding: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.live },
  timerName: { color: c.text, fontSize: 15, fontWeight: '600' },
  timerClock: { color: c.text, fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  entry: { backgroundColor: c.surface, borderRadius: radius.md, paddingHorizontal: space.md, minHeight: 44, borderWidth: StyleSheet.hairlineWidth, borderColor: c.line },
  entryName: { color: c.text, fontSize: 14, fontWeight: '600', flex: 1 },
  entryAmount: { color: c.muted, fontSize: 13, fontVariant: ['tabular-nums'] },
  entryTime: { color: c.faint, fontSize: 12, width: 40, textAlign: 'right', fontVariant: ['tabular-nums'] },
});

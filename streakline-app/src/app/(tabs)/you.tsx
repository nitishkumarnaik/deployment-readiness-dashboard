import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Switch, Text, View } from 'react-native';

import { EmojiPicker } from '../../components/TrackerForm';
import { Avatar, Button, Card, Chip, Field, H2, Label, Muted, Row, Screen, Stat, Wrap } from '../../components/ui';
import { formatLongDate } from '../../lib/dates';
import { buildDemoData } from '../../lib/demo';
import { confirm } from '../../lib/feedback';
import { getSegment } from '../../lib/segments';
import { activeTrackers, currentStreak } from '../../lib/trackers';
import { ME } from '../../lib/types';
import { clockNow } from '../../lib/timer';
import { useToday } from '../../lib/useToday';
import { openTracker } from '../../lib/useTrackerTap';
import { useStore } from '../../state/store';
import { c, space } from '../../theme';

export default function YouScreen() {
  const { data, dispatch } = useStore();
  const today = useToday();
  const p = data.profile;
  const [name, setName] = useState(p?.name ?? '');
  const [handle, setHandle] = useState(p?.handle ?? '');
  const [pickEmoji, setPickEmoji] = useState(false);
  if (!p) return null;

  const trackers = activeTrackers(data.trackers);
  const hidden = data.trackers.filter((t) => t.archived);
  const best = trackers.reduce((m, t) => Math.max(m, currentStreak(t, data.entries, today)), 0);
  const segments = [...new Set(trackers.map((t) => t.segment))].map(getSegment);
  const posts = data.posts.filter((x) => x.authorId === ME).length;

  return (
    <Screen>
      <Row gap={space.md}>
        <Avatar emoji={p.emoji} size={64} />
        <View style={{ flex: 1 }}>
          <H2 style={{ fontSize: 24 }}>{p.name || 'You'}</H2>
          <Muted>@{p.handle}</Muted>
          <Muted style={{ fontSize: 12 }}>Since {formatLongDate(p.startedOn)}</Muted>
        </View>
      </Row>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Stat label="Trackers" value={String(trackers.length)} />
          <Stat label="Days logged" value={String(new Set(data.entries.map((e) => e.dateKey)).size)} />
          <Stat label="Top streak" value={`⚡${best}`} />
          <Stat label="Posts" value={String(posts)} />
        </Row>
        {segments.length ? (
          <Wrap gap={6}>
            {segments.map((s) => (
              <Chip key={s.id} label={s.name} dot={s.color} />
            ))}
          </Wrap>
        ) : null}
      </Card>

      <Card>
        <Label>Profile</Label>
        <Field label="Name" value={name} onChangeText={setName} onBlur={() => dispatch({ type: 'updateProfile', patch: { name: name.trim() } })} />
        <Field
          label="Handle"
          value={handle}
          autoCapitalize="none"
          onChangeText={(v) => setHandle(v.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
          onBlur={() => handle && dispatch({ type: 'updateProfile', patch: { handle } })}
        />
        <Button title={pickEmoji ? 'Done' : 'Change avatar'} variant="secondary" small onPress={() => setPickEmoji(!pickEmoji)} />
        {pickEmoji ? <EmojiPicker value={p.emoji} onChange={(emoji) => dispatch({ type: 'updateProfile', patch: { emoji } })} /> : null}
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.text, fontWeight: '700', fontSize: 15 }}>Share finished goals</Text>
            <Muted style={{ fontSize: 13 }}>When a Community tracker hits its daily goal, post it to your feed. “Only me” trackers never post.</Muted>
          </View>
          <Switch value={p.autoShare} onValueChange={(autoShare) => dispatch({ type: 'updateProfile', patch: { autoShare } })} accessibilityLabel="Share finished goals" trackColor={{ true: c.live, false: c.surface2 }} />
        </Row>
      </Card>

      {hidden.length ? (
        <Card>
          <Label>Hidden trackers</Label>
          <Wrap gap={6}>
            {hidden.map((t) => (
              <Chip key={t.id} label={t.name} emoji={t.emoji} onPress={() => openTracker(t)} />
            ))}
          </Wrap>
        </Card>
      ) : null}

      <Card>
        <Label>Your data</Label>
        <Muted style={{ fontSize: 13 }}>Everything is stored on this device. Nothing is uploaded; the community is a preview until accounts are switched on.</Muted>
        <Button
          title="Load sample data"
          icon="flask-outline"
          variant="secondary"
          onPress={() => confirm('Replace with sample data?', 'Your data on this device is replaced by about four months of sample data.', 'Replace', () => dispatch({ type: 'hydrate', data: buildDemoData(today, clockNow()) }))}
        />
        <Button
          title="Delete all data"
          icon="trash-outline"
          variant="danger"
          onPress={() =>
            confirm('Delete everything?', 'Removes your profile, trackers, history, spaces and posts from this device.', 'Delete', () => {
              dispatch({ type: 'reset' });
              router.replace('/onboarding');
            })
          }
        />
      </Card>
      <Muted style={{ textAlign: 'center', fontSize: 12 }}>Streakline {Constants.expoConfig?.version ?? ''}</Muted>
    </Screen>
  );
}

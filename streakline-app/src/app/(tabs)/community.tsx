import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PostCard } from '../../components/PostCard';
import { Avatar, Banner, Button, Card, Chip, Muted, ProgressBar, Row, Screen, Segmented, Title } from '../../components/ui';
import { challengeProgress, challengeTemplate, CHALLENGES, sampleParticipants, type Challenge } from '../../lib/challenges';
import { SAMPLE_MEMBERS } from '../../lib/community';
import { buildFeed, leaderboard } from '../../lib/feed';
import { success } from '../../lib/feedback';
import { newId } from '../../lib/id';
import { getSegment, SEGMENTS } from '../../lib/segments';
import { nextOrder } from '../../lib/spaces';
import type { SegmentId, Tracker } from '../../lib/types';
import { useNow } from '../../lib/useNow';
import { useToday } from '../../lib/useToday';
import { useStore } from '../../state/store';
import { c, radius, space } from '../../theme';

type View_ = 'feed' | 'boards' | 'challenges';

export default function CommunityScreen() {
  const [view, setView] = useState<View_>('feed');
  return (
    <Screen>
      <Title>Community</Title>
      <Segmented
        label="Community section"
        value={view}
        onChange={setView}
        options={[
          { value: 'feed', label: 'Feed' },
          { value: 'boards', label: 'Leaderboards' },
          { value: 'challenges', label: 'Challenges' },
        ]}
      />
      {view === 'feed' ? <Feed /> : view === 'boards' ? <Boards /> : <Challenges />}
    </Screen>
  );
}

function PreviewBanner() {
  return <Banner>You are seeing a preview community of sample members. Real friends, clubs and comments go live once accounts are switched on.</Banner>;
}

function Feed() {
  const { data, dispatch } = useStore();
  const today = useToday();
  const nowMs = useNow(true, 60_000);
  const [scope, setScope] = useState<'following' | 'everyone'>('following');
  const items = useMemo(() => buildFeed(data, today, nowMs, scope), [data, today, nowMs, scope]);

  return (
    <>
      <PreviewBanner />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {SAMPLE_MEMBERS.map((m) => {
          const following = data.following.includes(m.id);
          return (
            <View key={m.id} style={styles.person}>
              <Avatar emoji={m.emoji} size={42} />
              <Text style={styles.personName}>{m.name}</Text>
              <Text style={styles.personMeta} numberOfLines={1}>
                {m.segments.map((s) => getSegment(s).name).join(' · ')}
              </Text>
              <Button title={following ? 'Following' : 'Follow'} variant={following ? 'secondary' : 'primary'} small onPress={() => dispatch({ type: 'toggleFollow', memberId: m.id })} style={{ alignSelf: 'stretch' }} />
            </View>
          );
        })}
      </ScrollView>
      <Row gap={6}>
        <Chip label="Following" selected={scope === 'following'} onPress={() => setScope('following')} />
        <Chip label="Everyone" selected={scope === 'everyone'} onPress={() => setScope('everyone')} />
      </Row>
      {items.length === 0 ? (
        <Card>
          <Muted>Nothing here yet. Finish a public tracker’s daily goal and it posts here automatically, or follow a few people.</Muted>
        </Card>
      ) : (
        items.slice(0, 40).map((item) => <PostCard key={item.post.id} item={item} nowMs={nowMs} />)
      )}
    </>
  );
}

function Boards() {
  const { data } = useStore();
  const today = useToday();
  const [segment, setSegment] = useState<SegmentId>('focus');
  const board = useMemo(() => leaderboard(data, segment, today), [data, segment, today]);
  const seg = getSegment(segment);

  return (
    <>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        {SEGMENTS.filter((s) => s.id !== 'custom').map((s) => (
          <Chip key={s.id} label={s.name} dot={s.color} selected={segment === s.id} onPress={() => setSegment(s.id)} />
        ))}
      </Row>
      <Muted style={{ fontSize: 13 }}>Ranked by consistency over the last 7 days: the share of days you met your goal. Ties go to the longer streak.</Muted>
      {!board.youTrack ? (
        <Card>
          <Muted>You are not on the {seg.name} board yet. Add a public {seg.name} tracker to join.</Muted>
          <Button title={`Add a ${seg.name} tracker`} icon="add" small onPress={() => router.push({ pathname: '/tracker/new', params: { segment } })} />
        </Card>
      ) : null}
      <Card style={{ paddingVertical: space.sm, gap: 0 }}>
        {board.rows.map((r, i) => {
          const me = r.memberId === 'me';
          return (
            <Row key={r.memberId} gap={space.md} style={[styles.boardRow, i === board.rows.length - 1 && { borderBottomWidth: 0 }, me && styles.meRow]}>
              <Text style={styles.rank}>{i + 1}</Text>
              <Avatar emoji={r.emoji} size={32} />
              <View style={{ flex: 1 }}>
                <Row gap={6}>
                  <Text style={styles.boardName}>{me ? 'You' : r.name}</Text>
                  {r.sample ? <Text style={styles.sampleTag}>sample</Text> : null}
                </Row>
                <Text style={styles.personMeta}>⚡ {r.streak}-day streak</Text>
              </View>
              <Text style={styles.pct}>{Math.round(r.consistency * 100)}%</Text>
            </Row>
          );
        })}
      </Card>
      <PreviewBanner />
    </>
  );
}

function Challenges() {
  const { data, dispatch } = useStore();
  const today = useToday();

  const join = (ch: Challenge) => {
    const tpl = challengeTemplate(ch);
    const existing = data.trackers.find((t) => t.name === tpl.name && !t.archived);
    let tracker: Tracker | undefined;
    if (!existing) {
      tracker = { id: newId(), name: tpl.name, emoji: tpl.emoji, segment: tpl.segment, kind: tpl.kind, target: tpl.target, visibility: 'public', order: nextOrder(data.trackers), archived: false, createdOn: today };
    }
    dispatch({ type: 'joinChallenge', join: { challengeId: ch.id, joinedOn: today, trackerId: existing?.id ?? tracker!.id }, tracker });
    success();
  };

  return (
    <>
      <Muted style={{ fontSize: 13 }}>Join a challenge and its tracker appears on Today. Progress counts the days you hit the goal.</Muted>
      {CHALLENGES.map((ch) => {
        const joined = data.challenges.find((j) => j.challengeId === ch.id);
        const tracker = joined ? data.trackers.find((t) => t.id === joined.trackerId) : undefined;
        const prog = joined ? challengeProgress(ch, joined, tracker, data.entries, today) : null;
        const seg = getSegment(ch.segment);
        return (
          <Card key={ch.id}>
            <Row gap={space.md}>
              <Text style={{ fontSize: 30 }}>{ch.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.chTitle}>{ch.title}</Text>
                <Row gap={6}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: seg.color }} />
                  <Text style={styles.personMeta}>
                    {seg.name} · {ch.windowDays} days · {sampleParticipants(ch) + (joined ? 1 : 0)} taking part
                  </Text>
                </Row>
              </View>
            </Row>
            <Muted>{ch.blurb}</Muted>
            {prog ? (
              <View style={{ gap: 6 }}>
                <ProgressBar value={prog.daysDone / prog.goalDays} />
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={styles.personMeta}>
                    {prog.daysDone}/{prog.goalDays} days
                  </Text>
                  <Text style={styles.personMeta}>{prog.status === 'won' ? 'Completed 🏆' : prog.status === 'ended' ? 'Ended' : `${prog.daysLeft} days left`}</Text>
                </Row>
                <Button title="Leave challenge" variant="ghost" small onPress={() => dispatch({ type: 'leaveChallenge', challengeId: ch.id })} />
              </View>
            ) : (
              <Button title="Join challenge" icon="flag-outline" small onPress={() => join(ch)} />
            )}
          </Card>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  person: { width: 132, backgroundColor: c.surface, borderRadius: radius.lg, padding: space.md, alignItems: 'center', gap: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: c.line },
  personName: { color: c.text, fontWeight: '700', fontSize: 14, marginTop: 4 },
  personMeta: { color: c.muted, fontSize: 12 },
  boardRow: { paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
  meRow: { backgroundColor: c.surface2, marginHorizontal: -space.lg, paddingHorizontal: space.lg },
  rank: { color: c.muted, width: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  boardName: { color: c.text, fontWeight: '700', fontSize: 15 },
  sampleTag: { color: c.faint, fontSize: 10, fontWeight: '700', borderWidth: 1, borderColor: c.line, borderRadius: 4, paddingHorizontal: 4, textTransform: 'uppercase' },
  pct: { color: c.text, fontWeight: '800', fontSize: 18, fontVariant: ['tabular-nums'] },
  chTitle: { color: c.text, fontWeight: '700', fontSize: 17 },
});

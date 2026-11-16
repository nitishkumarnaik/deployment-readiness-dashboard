import * as Sharing from 'expo-sharing';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View, type HostInstance } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { ContributionGrid, weeksThatFit } from '../../components/ContributionGrid';
import { Button, Field, Muted, Screen } from '../../components/ui';
import { notify, success } from '../../lib/feedback';
import { newId } from '../../lib/id';
import { buildGrid } from '../../lib/grid';
import { getSegment } from '../../lib/segments';
import { amountOn, amountsByDay, bestStreak, consistency, currentStreak, entryDays, headlineFor, levelFor, weekLevels } from '../../lib/trackers';
import { ME } from '../../lib/types';
import { useContentWidth } from '../../lib/useTileWidth';
import { useToday } from '../../lib/useToday';
import { useStore } from '../../state/store';
import { c, radius, space } from '../../theme';

export default function ShareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, dispatch } = useStore();
  const today = useToday();
  const cardRef = useRef<HostInstance>(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const width = Math.min(useContentWidth(), 360);
  const t = data.trackers.find((x) => x.id === id);

  const grid = useMemo(() => {
    if (!t) return [];
    const byDay = amountsByDay(data.entries, t.id);
    return buildGrid(today, weeksThatFit(width - space.xl * 2, 12, 3), (d) => levelFor(t, byDay.get(d) ?? 0));
  }, [t, data.entries, today, width]);

  if (!t || !data.profile) {
    return (
      <Screen edges={['bottom']}>
        <Muted>Nothing to share.</Muted>
      </Screen>
    );
  }

  const seg = getSegment(t.segment);
  const streak = currentStreak(t, data.entries, today);
  const best = bestStreak(t, data.entries);
  const days = entryDays(t, data.entries);
  const week = Math.round(consistency(t, data.entries, today) * 100);
  const summary = `⚡ ${streak}-day ${t.name} streak · ${days} days logged · ${week}% this week. Tracking it on Streakline @${data.profile.handle}`;

  const shareImage = async () => {
    try {
      setBusy(true);
      if (Platform.OS === 'web') {
        const nav = typeof navigator !== 'undefined' ? navigator : undefined;
        if (nav?.share) await nav.share({ text: summary });
        else if (nav?.clipboard) {
          await nav.clipboard.writeText(summary);
          notify('Copied', 'Your streak summary is on the clipboard.');
        }
        return;
      }
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your streak' });
      } else {
        notify('Sharing unavailable', 'This device cannot open the share sheet.');
      }
    } catch {
      // User closed the share sheet or capture failed; nothing to do.
    } finally {
      setBusy(false);
    }
  };

  const postToFeed = () => {
    dispatch({
      type: 'addPost',
      post: {
        id: newId(),
        authorId: ME,
        trackerId: t.id,
        trackerName: t.name,
        emoji: t.emoji,
        segment: t.segment,
        dateKey: today,
        at: new Date().toISOString(),
        headline: amountOn(data.entries, t.id, today) > 0 ? headlineFor(t, amountOn(data.entries, t.id, today)) : `${streak}-day ${t.name} streak`,
        streak,
        caption: caption.trim() || undefined,
        week: weekLevels(t, data.entries, today),
      },
    });
    success();
    router.back();
  };

  return (
    <Screen edges={['bottom']}>
      <View style={{ alignItems: 'center' }}>
        <View ref={cardRef} collapsable={false} style={[styles.card, { width }]}>
          <View style={styles.cardTop}>
            <Text style={styles.wordmark}>streakline</Text>
            <View style={[styles.seg, { borderColor: seg.color }]}>
              <Text style={[styles.segText, { color: seg.color }]}>{seg.name}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 40, marginTop: space.lg }}>{t.emoji}</Text>
          <Text style={styles.tname}>{t.name}</Text>
          <Text style={styles.big}>{streak}</Text>
          <Text style={styles.bigLabel}>day streak</Text>
          <View style={{ marginTop: space.lg }}>
            <ContributionGrid columns={grid} cell={12} gap={3} showDays={false} />
          </View>
          <View style={styles.stats}>
            <Stat label="Days logged" value={String(days)} />
            <Stat label="Best streak" value={String(best)} />
            <Stat label="This week" value={`${week}%`} />
          </View>
          <Text style={styles.handle}>@{data.profile.handle}</Text>
        </View>
      </View>

      <Button title={busy ? 'Preparing…' : Platform.OS === 'web' ? 'Share summary' : 'Share image'} icon="share-outline" onPress={shareImage} disabled={busy} />
      <Muted style={{ fontSize: 13, textAlign: 'center' }}>Post it to your stories or send it to a friend.</Muted>

      <Field label="Caption (optional)" value={caption} onChangeText={setCaption} placeholder="What helped you stay consistent?" maxLength={200} />
      <Button title="Post to community feed" icon="people-outline" variant="secondary" onPress={postToFeed} />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ color: c.text, fontWeight: '800', fontSize: 18 }}>{value}</Text>
      <Text style={{ color: c.muted, fontSize: 11 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#050505', borderRadius: radius.xl, padding: space.xl, alignItems: 'center', borderWidth: 1, borderColor: c.line },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', alignSelf: 'stretch' },
  wordmark: { color: c.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.8 },
  seg: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  segText: { fontSize: 11, fontWeight: '700' },
  tname: { color: c.text, fontSize: 18, fontWeight: '700', marginTop: 4 },
  big: { color: c.text, fontSize: 88, fontWeight: '800', letterSpacing: -4, lineHeight: 96, marginTop: space.sm },
  bigLabel: { color: c.muted, fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 2 },
  stats: { flexDirection: 'row', alignSelf: 'stretch', marginTop: space.lg },
  handle: { color: c.faint, fontSize: 12, marginTop: space.lg },
});

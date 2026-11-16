import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { timeAgo, type FeedItem } from '../lib/feed';
import { tap } from '../lib/feedback';
import { getSegment } from '../lib/segments';
import { useStore } from '../state/store';
import { c, radius, space } from '../theme';
import { Avatar } from './ui';

export function WeekStrip({ week }: { week: number[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3 }} accessibilityLabel={`${week.filter((w) => w === 2).length} of the last 7 days done`}>
      {week.map((lvl, i) => (
        <View key={i} style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: lvl === 2 ? c.cellDone : lvl === 1 ? c.cellPartial : c.cellEmpty }} />
      ))}
    </View>
  );
}

/** A feed activity: who, what they finished, their streak, and props / comments. */
export function PostCard({ item, nowMs, detail = false }: { item: FeedItem; nowMs: number; detail?: boolean }) {
  const { dispatch } = useStore();
  const { post, author } = item;
  const seg = getSegment(post.segment);

  const body = (
    <View style={styles.card}>
      <View style={styles.head}>
        <Avatar emoji={author.emoji} size={36} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.name}>{item.mine ? 'You' : author.name}</Text>
            {author.sample ? <Text style={styles.sample}>sample</Text> : null}
          </View>
          <Text style={styles.meta}>
            @{author.handle} · {timeAgo(post.at, nowMs)}
          </Text>
        </View>
        <View style={[styles.segPill, { borderColor: seg.color }]}>
          <Text style={[styles.segText, { color: seg.color }]}>{seg.name}</Text>
        </View>
      </View>

      <Text style={styles.headline}>
        {post.emoji} {post.headline}
      </Text>
      {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}

      <View style={styles.statsRow}>
        <View style={{ gap: 2 }}>
          <Text style={styles.statLabel}>Streak</Text>
          <Text style={styles.statValue}>⚡ {post.streak} day{post.streak === 1 ? '' : 's'}</Text>
        </View>
        {post.week ? (
          <View style={{ gap: 4 }}>
            <Text style={styles.statLabel}>Last 7 days</Text>
            <WeekStrip week={post.week} />
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={() => {
            tap();
            dispatch({ type: 'toggleProps', postId: post.id });
          }}
          accessibilityRole="button"
          accessibilityState={{ selected: item.propped }}
          aria-selected={item.propped}
          accessibilityLabel={`${item.propped ? 'Remove props' : 'Give props'}, ${item.props} props`}
          hitSlop={6}
          style={styles.action}
        >
          <Ionicons name={item.propped ? 'flame' : 'flame-outline'} size={20} color={item.propped ? '#FB923C' : c.muted} />
          <Text style={styles.actionText}>{item.props > 0 ? `${item.props} props` : 'Props'}</Text>
        </Pressable>
        <Pressable
          onPress={() => !detail && router.push({ pathname: '/post/[id]', params: { id: post.id } })}
          accessibilityRole="button"
          accessibilityLabel={`${item.comments} comments`}
          hitSlop={6}
          style={styles.action}
        >
          <Ionicons name="chatbubble-outline" size={18} color={c.muted} />
          <Text style={styles.actionText}>{item.comments > 0 ? item.comments : 'Comment'}</Text>
        </Pressable>
      </View>
    </View>
  );

  if (detail) return body;
  return (
    <Pressable onPress={() => router.push({ pathname: '/post/[id]', params: { id: post.id } })} accessibilityRole="button" accessibilityLabel={`${author.name}: ${post.headline}`}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: c.surface, borderRadius: radius.xl, padding: space.lg, gap: space.md, borderWidth: StyleSheet.hairlineWidth, borderColor: c.line },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  name: { color: c.text, fontSize: 15, fontWeight: '700' },
  sample: { color: c.faint, fontSize: 10, fontWeight: '700', borderWidth: 1, borderColor: c.line, borderRadius: 4, paddingHorizontal: 4, textTransform: 'uppercase' },
  meta: { color: c.muted, fontSize: 12 },
  segPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  segText: { fontSize: 11, fontWeight: '700' },
  headline: { color: c.text, fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  caption: { color: c.text, fontSize: 14, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: space.xl, alignItems: 'flex-end' },
  statLabel: { color: c.faint, fontSize: 11, fontWeight: '600' },
  statValue: { color: c.text, fontSize: 15, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: space.xl, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line, paddingTop: space.md },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { color: c.muted, fontSize: 13, fontWeight: '600' },
});

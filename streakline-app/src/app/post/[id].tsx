import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { PostCard } from '../../components/PostCard';
import { Avatar, Button, Field, Label, Muted, Row, Screen } from '../../components/ui';
import { authorOf, buildFeed, timeAgo } from '../../lib/feed';
import { confirm } from '../../lib/feedback';
import { newId } from '../../lib/id';
import { ME } from '../../lib/types';
import { useNow } from '../../lib/useNow';
import { useToday } from '../../lib/useToday';
import { useStore } from '../../state/store';
import { c, space } from '../../theme';

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, dispatch } = useStore();
  const today = useToday();
  const nowMs = useNow(true, 60_000);
  const [text, setText] = useState('');
  const item = buildFeed(data, today, nowMs, 'everyone').find((f) => f.post.id === id);

  if (!item) {
    return (
      <Screen edges={['bottom']}>
        <Muted>This post is no longer available.</Muted>
      </Screen>
    );
  }

  const comments = data.comments.filter((x) => x.postId === id).sort((a, b) => (a.at < b.at ? -1 : 1));
  const send = () => {
    const t = text.trim();
    if (!t) return;
    dispatch({ type: 'addComment', comment: { id: newId(), postId: item.post.id, authorId: ME, text: t, at: new Date().toISOString() } });
    setText('');
  };

  return (
    <Screen edges={['bottom']}>
      <PostCard item={item} nowMs={nowMs} detail />
      <Label>Comments</Label>
      {comments.length === 0 ? <Muted>No comments yet. Say something encouraging.</Muted> : null}
      {comments.map((cm) => {
        const a = authorOf(data, cm.authorId);
        return (
          <Row key={cm.id} gap={space.sm} style={{ alignItems: 'flex-start' }}>
            <Avatar emoji={a.emoji} size={30} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontWeight: '700', fontSize: 13 }}>
                {cm.authorId === ME ? 'You' : a.name} <Text style={{ color: c.faint, fontWeight: '400' }}>· {timeAgo(cm.at, nowMs)}</Text>
              </Text>
              <Text style={{ color: c.text, fontSize: 14, lineHeight: 20 }}>{cm.text}</Text>
            </View>
          </Row>
        );
      })}
      <Field label="Add a comment" value={text} onChangeText={setText} placeholder="Nice streak!" onSubmitEditing={send} returnKeyType="send" maxLength={280} />
      <Button title="Post comment" icon="send" onPress={send} disabled={!text.trim()} />
      {item.mine ? (
        <Button
          title="Delete post"
          icon="trash-outline"
          variant="ghost"
          onPress={() =>
            confirm('Delete post?', 'Removes this post and its comments from the feed. Your tracker history is kept.', 'Delete', () => {
              dispatch({ type: 'deletePost', id: item.post.id });
              router.back();
            })
          }
        />
      ) : null}
    </Screen>
  );
}

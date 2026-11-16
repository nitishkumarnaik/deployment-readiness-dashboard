import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { EmojiPicker } from '../../components/TrackerForm';
import { Button, Chip, Field, Label, Muted, Screen, Segmented, Wrap } from '../../components/ui';
import { success } from '../../lib/feedback';
import { newId } from '../../lib/id';
import { childSpaces, nextOrder, spaceBlocks } from '../../lib/spaces';
import { activeTrackers, goalLabel } from '../../lib/trackers';
import type { Block, BlockType, Space } from '../../lib/types';
import { useStore } from '../../state/store';
import { c, radius, space } from '../../theme';

export default function NewBlockScreen() {
  const { space: spaceId } = useLocalSearchParams<{ space: string }>();
  const { data, dispatch } = useStore();
  const [type, setType] = useState<BlockType>('tracker');
  const [title, setTitle] = useState('');
  const [linked, setLinked] = useState<string | undefined>();
  const [emoji, setEmoji] = useState('📁');

  const target = data.spaces.find((s) => s.id === spaceId);
  if (!target) {
    return (
      <Screen edges={['bottom']}>
        <Muted>That space no longer exists.</Muted>
      </Screen>
    );
  }

  const existing = spaceBlocks(data.blocks, target.id);
  const order = nextOrder(existing);
  const onBoard = new Set(existing.filter((b) => b.type === 'tracker').map((b) => b.trackerId));
  const available = activeTrackers(data.trackers).filter((t) => !onBoard.has(t.id));
  const nowIso = new Date().toISOString();
  const base = { id: newId(), spaceId: target.id, order, createdAt: nowIso };

  const add = (block: Block, childSpace?: Space) => {
    dispatch({ type: 'addBlock', block, childSpace });
    success();
  };

  const submit = () => {
    const text = title.trim();
    if (!text) return;
    if (type === 'task') add({ ...base, type: 'task', size: 'wide', title: text, done: false, trackerId: linked });
    if (type === 'heading') add({ ...base, type: 'heading', size: 'wide', title: text });
    if (type === 'note') {
      add({ ...base, type: 'note', size: 'small', title: text, body: '' });
      router.replace({ pathname: '/note/[id]', params: { id: base.id } });
      return;
    }
    if (type === 'folder') {
      const child: Space = { id: newId(), name: text, emoji, parentId: target.id, columns: 2, order: nextOrder(childSpaces(data.spaces, target.id)), createdAt: nowIso };
      add({ ...base, type: 'folder', size: 'wide', title: text, childSpaceId: child.id }, child);
    }
    router.back();
  };

  return (
    <Screen edges={['bottom']}>
      <Muted>
        Adding to {target.emoji} {target.name}
      </Muted>
      <Segmented
        label="Block type"
        value={type}
        onChange={setType}
        options={[
          { value: 'tracker', label: 'Tracker' },
          { value: 'task', label: 'Task' },
          { value: 'note', label: 'Note' },
          { value: 'heading', label: 'Title' },
          { value: 'folder', label: 'Folder' },
        ]}
      />

      {type === 'tracker' ? (
        <View style={{ gap: space.sm }}>
          <Label>Your trackers</Label>
          {available.length === 0 ? <Muted>All your trackers are already on this board.</Muted> : null}
          {available.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => {
                add({ ...base, id: newId(), type: 'tracker', size: 'small', title: t.name, trackerId: t.id });
                router.back();
              }}
              accessibilityRole="button"
              accessibilityLabel={`Add ${t.name}`}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: c.surface, borderRadius: radius.md, padding: space.md, opacity: pressed ? 0.7 : 1 })}
            >
              <Text style={{ fontSize: 20 }}>{t.emoji}</Text>
              <Text style={{ color: c.text, fontWeight: '600', flex: 1 }}>{t.name}</Text>
              <Text style={{ color: c.muted, fontSize: 12 }}>{goalLabel(t)}</Text>
            </Pressable>
          ))}
          <Button title="Create a new tracker" icon="add" variant="secondary" onPress={() => router.replace({ pathname: '/tracker/new', params: { space: target.id } })} />
        </View>
      ) : (
        <View style={{ gap: space.lg }}>
          <Field
            label={type === 'task' ? 'Task' : type === 'note' ? 'Note title' : type === 'heading' ? 'Section title' : 'Folder name'}
            value={title}
            onChangeText={setTitle}
            placeholder={type === 'task' ? 'e.g. Literature review' : type === 'note' ? 'e.g. Idea inbox' : type === 'heading' ? 'e.g. This week' : 'e.g. Thesis'}
            autoFocus
            maxLength={60}
          />
          {type === 'task' ? (
            <View style={{ gap: 6 }}>
              <Label>Report progress to a tracker (optional)</Label>
              <Wrap gap={6}>
                {activeTrackers(data.trackers)
                  .filter((t) => t.kind !== 'duration')
                  .map((t) => (
                    <Chip key={t.id} label={t.name} emoji={t.emoji} selected={linked === t.id} onPress={() => setLinked(linked === t.id ? undefined : t.id)} />
                  ))}
              </Wrap>
              <Muted style={{ fontSize: 13 }}>Ticking the task logs one unit to the tracker, so the task and its streak stay in sync.</Muted>
            </View>
          ) : null}
          {type === 'folder' ? (
            <View style={{ gap: 6 }}>
              <Label>Icon</Label>
              <EmojiPicker value={emoji} onChange={setEmoji} />
            </View>
          ) : null}
          <Button title="Add" icon="add" onPress={submit} disabled={!title.trim()} />
        </View>
      )}
    </Screen>
  );
}

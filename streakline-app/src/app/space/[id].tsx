import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Tile } from '../../components/Tile';
import { EmojiPicker } from '../../components/TrackerForm';
import { Button, Card, Field, IconButton, Label, Muted, Row, Screen, Segmented, type IconName } from '../../components/ui';
import { confirm, tap } from '../../lib/feedback';
import { describeSummary, pathTo, spaceBlocks, summarize } from '../../lib/spaces';
import { amountOn, currentStreak, progressLabel } from '../../lib/trackers';
import type { Block, Space } from '../../lib/types';
import { useContentWidth } from '../../lib/useTileWidth';
import { useToday } from '../../lib/useToday';
import { openTracker, useTrackerTap } from '../../lib/useTrackerTap';
import { useStore } from '../../state/store';
import { c, radius, space } from '../../theme';

export default function SpaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, dispatch } = useStore();
  const [edit, setEdit] = useState(false);
  const content = useContentWidth();
  const s = data.spaces.find((x) => x.id === id);

  if (!s) {
    return (
      <Screen edges={['bottom']}>
        <Muted>This space was deleted.</Muted>
      </Screen>
    );
  }

  const blocks = spaceBlocks(data.blocks, s.id);
  const path = pathTo(data.spaces, s.id);
  const cols = s.columns;
  const gap = space.sm;
  const smallWidth = Math.floor((content - gap * (cols - 1)) / cols);

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <Row>
              <Button title={edit ? 'Done' : 'Design'} variant="ghost" small onPress={() => setEdit(!edit)} />
              <IconButton icon="add" size={34} label="Add block" onPress={() => router.push({ pathname: '/block/new', params: { space: s.id } })} />
            </Row>
          ),
        }}
      />
      {path.length > 1 ? (
        <Row gap={4} style={{ flexWrap: 'wrap' }}>
          {path.map((p, i) => (
            <Row key={p.id} gap={4}>
              <Pressable onPress={() => (p.id === s.id ? undefined : router.push({ pathname: '/space/[id]', params: { id: p.id } }))} accessibilityRole="link">
                <Text style={{ color: p.id === s.id ? c.text : c.muted, fontSize: 13 }}>
                  {p.emoji} {p.name}
                </Text>
              </Pressable>
              {i < path.length - 1 ? <Ionicons name="chevron-forward" size={12} color={c.faint} /> : null}
            </Row>
          ))}
        </Row>
      ) : null}
      <Row gap={space.md}>
        <Text style={{ fontSize: 36 }}>{s.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={2}>
            {s.name}
          </Text>
          <Muted style={{ fontSize: 13 }}>{describeSummary(summarize(data.blocks, s.id))}</Muted>
        </View>
      </Row>

      {edit ? <DesignPanel space={s} /> : null}

      {blocks.length === 0 ? (
        <Card>
          <Muted>This space is empty. Add trackers, tasks, notes, headings or folders, then press Design to arrange them.</Muted>
          <Button title="Add a block" icon="add" onPress={() => router.push({ pathname: '/block/new', params: { space: s.id } })} />
        </Card>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
          {blocks.map((b, i) => {
            const wide = b.size === 'wide' || b.type === 'heading' || cols === 1;
            const width = wide ? content : smallWidth;
            return (
              <View key={b.id} style={{ width, gap: 4 }}>
                <BlockView block={b} width={width} />
                {edit ? (
                  <Row gap={4} style={styles.toolbar}>
                    <ToolButton icon="arrow-back" label="Move earlier" disabled={i === 0} onPress={() => dispatch({ type: 'moveBlock', id: b.id, dir: -1 })} />
                    <ToolButton icon="arrow-forward" label="Move later" disabled={i === blocks.length - 1} onPress={() => dispatch({ type: 'moveBlock', id: b.id, dir: 1 })} />
                    {b.type !== 'heading' && cols > 1 ? (
                      <ToolButton icon={b.size === 'wide' ? 'contract' : 'expand'} label={b.size === 'wide' ? 'Make small' : 'Make wide'} onPress={() => dispatch({ type: 'updateBlock', id: b.id, patch: { size: b.size === 'wide' ? 'small' : 'wide' } })} />
                    ) : null}
                    <ToolButton
                      icon="trash-outline"
                      label="Remove block"
                      onPress={() =>
                        b.type === 'folder'
                          ? confirm('Delete folder?', `Deletes ${b.title} and everything inside it.`, 'Delete', () => dispatch({ type: 'deleteBlock', id: b.id }))
                          : dispatch({ type: 'deleteBlock', id: b.id })
                      }
                    />
                  </Row>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

function ToolButton({ icon, label, onPress, disabled }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} hitSlop={6} style={[styles.tool, disabled && { opacity: 0.25 }]}>
      <Ionicons name={icon} size={15} color={c.text} />
    </Pressable>
  );
}

function DesignPanel({ space: s }: { space: Space }) {
  const { dispatch } = useStore();
  const [name, setName] = useState(s.name);
  return (
    <Card>
      <Label>Layout</Label>
      <Segmented
        label="Layout"
        value={s.columns}
        onChange={(columns) => dispatch({ type: 'updateSpace', id: s.id, patch: { columns } })}
        options={[
          { value: 1, label: 'List' },
          { value: 2, label: '2 columns' },
          { value: 3, label: '3 columns' },
        ]}
      />
      <Field label="Name" value={name} onChangeText={setName} onBlur={() => name.trim() && dispatch({ type: 'updateSpace', id: s.id, patch: { name: name.trim() } })} />
      <Label>Icon</Label>
      <EmojiPicker value={s.emoji} onChange={(emoji) => dispatch({ type: 'updateSpace', id: s.id, patch: { emoji } })} />
      <Muted style={{ fontSize: 13 }}>Use the arrows under each block to reorder, the expand icon to make it full width.</Muted>
      <Button
        title="Delete space"
        icon="trash-outline"
        variant="danger"
        small
        onPress={() =>
          confirm('Delete space?', 'Deletes this space, its sub-folders and notes. Trackers and their history are kept.', 'Delete', () => {
            dispatch({ type: 'deleteSpace', id: s.id });
            router.back();
          })
        }
      />
    </Card>
  );
}

function BlockView({ block: b, width }: { block: Block; width: number }) {
  const { data, dispatch } = useStore();
  const today = useToday();
  const tapTracker = useTrackerTap();

  if (b.type === 'tracker') {
    const t = data.trackers.find((x) => x.id === b.trackerId);
    if (!t) return <Muted>Tracker removed</Muted>;
    return (
      <Tile
        tracker={t}
        width={width}
        amount={amountOn(data.entries, t.id, today)}
        streak={currentStreak(t, data.entries, today)}
        running={data.timer?.trackerId === t.id}
        onPress={() => tapTracker(t)}
        onLongPress={() => openTracker(t)}
      />
    );
  }

  if (b.type === 'heading') {
    return <Text style={styles.heading}>{b.title}</Text>;
  }

  if (b.type === 'note') {
    return (
      <Pressable onPress={() => router.push({ pathname: '/note/[id]', params: { id: b.id } })} accessibilityRole="button" accessibilityLabel={`Note: ${b.title}`} style={({ pressed }) => [styles.note, { opacity: pressed ? 0.8 : 1 }]}>
        <Text style={styles.noteTitle} numberOfLines={1}>
          📝 {b.title}
        </Text>
        <Text style={styles.noteBody} numberOfLines={b.size === 'wide' ? 3 : 5}>
          {b.body || 'Empty note'}
        </Text>
      </Pressable>
    );
  }

  if (b.type === 'task') {
    const t = b.trackerId ? data.trackers.find((x) => x.id === b.trackerId) : undefined;
    return (
      <Pressable
        onPress={() => {
          tap();
          dispatch({ type: 'toggleTask', id: b.id, dateKey: today, nowIso: new Date().toISOString() });
        }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: !!b.done }}
        aria-checked={!!b.done}
        accessibilityLabel={b.title}
        style={({ pressed }) => [styles.task, { opacity: pressed ? 0.8 : 1 }]}
      >
        <Ionicons name={b.done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={b.done ? c.white : c.faint} />
        <Text style={[styles.taskTitle, b.done && { color: c.muted, textDecorationLine: 'line-through' }]} numberOfLines={2}>
          {b.title}
        </Text>
        {t ? (
          <View style={styles.link}>
            <Text style={{ fontSize: 11 }}>{t.emoji}</Text>
            <Text style={styles.linkText}>{progressLabel(t, amountOn(data.entries, t.id, today))}</Text>
          </View>
        ) : null}
      </Pressable>
    );
  }

  const child = data.spaces.find((x) => x.id === b.childSpaceId);
  return (
    <Pressable
      onPress={() => child && router.push({ pathname: '/space/[id]', params: { id: child.id } })}
      accessibilityRole="button"
      accessibilityLabel={`Folder ${child?.name ?? b.title}`}
      style={({ pressed }) => [styles.folder, { opacity: pressed ? 0.8 : 1 }]}
    >
      <Text style={{ fontSize: 24 }}>{child?.emoji ?? '📁'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.noteTitle} numberOfLines={1}>
          {child?.name ?? b.title}
        </Text>
        <Text style={styles.noteBody}>{child ? describeSummary(summarize(data.blocks, child.id)) : 'Missing folder'}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.faint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { color: c.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.6 },
  heading: { color: c.text, fontSize: 15, fontWeight: '700', marginTop: space.sm, textTransform: 'uppercase', letterSpacing: 0.8 },
  note: { backgroundColor: c.surface, borderRadius: radius.lg, padding: space.md, gap: 4, minHeight: 112, borderWidth: StyleSheet.hairlineWidth, borderColor: c.line },
  noteTitle: { color: c.text, fontSize: 14, fontWeight: '700' },
  noteBody: { color: c.muted, fontSize: 13, lineHeight: 18 },
  task: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.surface, borderRadius: radius.md, paddingHorizontal: space.md, minHeight: 50, borderWidth: StyleSheet.hairlineWidth, borderColor: c.line },
  taskTitle: { color: c.text, fontSize: 15, fontWeight: '500', flex: 1 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: c.surface2, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  linkText: { color: c.muted, fontSize: 11, fontWeight: '600' },
  folder: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: c.surface2, borderRadius: radius.lg, padding: space.md, minHeight: 64 },
  toolbar: { justifyContent: 'center' },
  tool: { width: 30, height: 26, borderRadius: 8, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' },
});

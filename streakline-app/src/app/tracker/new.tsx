import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { TrackerForm, type TrackerDraft } from '../../components/TrackerForm';
import { Button, Label, Muted, Screen, Wrap } from '../../components/ui';
import { success } from '../../lib/feedback';
import { newId } from '../../lib/id';
import { getSegment } from '../../lib/segments';
import { nextOrder } from '../../lib/spaces';
import { goalLabel } from '../../lib/trackers';
import type { SegmentId, Tracker } from '../../lib/types';
import { useToday } from '../../lib/useToday';
import { useStore } from '../../state/store';
import { c, radius, space } from '../../theme';

export default function NewTrackerScreen() {
  const params = useLocalSearchParams<{ space?: string; segment?: SegmentId }>();
  const { data, dispatch } = useStore();
  const today = useToday();
  const [draft, setDraft] = useState<TrackerDraft>({
    name: '',
    emoji: getSegment(params.segment ?? 'focus').emoji,
    segment: params.segment ?? 'focus',
    kind: 'check',
    target: 1,
    visibility: 'public',
  });
  const seg = getSegment(draft.segment);
  const valid = draft.name.trim().length > 0;

  const create = () => {
    const t: Tracker = {
      id: newId(),
      ...draft,
      name: draft.name.trim(),
      target: draft.kind === 'check' ? 1 : draft.target,
      order: nextOrder(data.trackers),
      archived: false,
      createdOn: today,
    };
    dispatch({ type: 'addTrackers', trackers: [t], spaceId: params.space, nowIso: new Date().toISOString() });
    success();
    router.back();
  };

  return (
    <Screen edges={['bottom']}>
      <View style={{ gap: space.sm }}>
        <Label>Quick start · {seg.name}</Label>
        <Wrap gap={space.sm}>
          {seg.templates.map((tpl) => (
            <Pressable
              key={tpl.name}
              onPress={() => setDraft({ ...draft, name: tpl.name, emoji: tpl.emoji, kind: tpl.kind, target: tpl.target })}
              accessibilityRole="button"
              accessibilityLabel={`Use template ${tpl.name}`}
              style={({ pressed }) => ({ backgroundColor: c.surface2, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, opacity: pressed ? 0.7 : 1 })}
            >
              <Text style={{ color: c.text, fontWeight: '600' }}>
                {tpl.emoji} {tpl.name}
              </Text>
              <Text style={{ color: c.muted, fontSize: 12 }}>{goalLabel({ ...tpl, id: '', segment: seg.id, visibility: 'public', order: 0, archived: false, createdOn: today })}</Text>
            </Pressable>
          ))}
        </Wrap>
        <Muted style={{ fontSize: 13 }}>Pick a segment below to see its templates, or make your own.</Muted>
      </View>
      <TrackerForm draft={draft} onChange={setDraft} />
      <Button title="Create tracker" icon="checkmark" onPress={create} disabled={!valid} />
    </Screen>
  );
}

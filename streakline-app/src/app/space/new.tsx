import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { EmojiPicker } from '../../components/TrackerForm';
import { Button, Field, Label, Muted, Screen } from '../../components/ui';
import { success } from '../../lib/feedback';
import { buildFromTemplate, childSpaces, nextOrder, SPACE_TEMPLATES } from '../../lib/spaces';
import { useToday } from '../../lib/useToday';
import { useStore } from '../../state/store';
import { c, radius, space } from '../../theme';

export default function NewSpaceScreen() {
  const params = useLocalSearchParams<{ parent?: string }>();
  const { data, dispatch } = useStore();
  const today = useToday();
  const [templateId, setTemplateId] = useState(SPACE_TEMPLATES[0].id);
  const template = SPACE_TEMPLATES.find((t) => t.id === templateId)!;
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState<string | null>(null);

  const create = () => {
    const parentId = params.parent ?? null;
    const built = buildFromTemplate(template, {
      name,
      emoji: emoji ?? template.emoji,
      parentId,
      existing: data.trackers,
      today,
      nowIso: new Date().toISOString(),
      order: nextOrder(childSpaces(data.spaces, parentId)),
      trackerOrderStart: nextOrder(data.trackers),
    });
    dispatch({ type: 'addSpace', space: built.space, blocks: built.blocks, trackers: built.newTrackers });
    success();
    router.replace({ pathname: '/space/[id]', params: { id: built.space.id } });
  };

  return (
    <Screen edges={['bottom']}>
      <View style={{ gap: space.sm }}>
        <Label>Start from</Label>
        {SPACE_TEMPLATES.map((t) => {
          const sel = t.id === templateId;
          return (
            <Pressable
              key={t.id}
              onPress={() => setTemplateId(t.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: sel }}
              aria-checked={sel}
              style={{ flexDirection: 'row', gap: space.md, alignItems: 'center', padding: space.md, borderRadius: radius.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: sel ? c.white : c.line }}
            >
              <Text style={{ fontSize: 26 }}>{t.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontWeight: '700', fontSize: 15 }}>{t.name}</Text>
                <Text style={{ color: c.muted, fontSize: 13 }}>{t.description}</Text>
              </View>
            </Pressable>
          );
        })}
        <Muted style={{ fontSize: 13 }}>Templates reuse trackers you already have and create any that are missing.</Muted>
      </View>
      <Field label="Name" value={name} onChangeText={setName} placeholder={template.name} maxLength={40} />
      <Label>Icon</Label>
      <EmojiPicker value={emoji ?? template.emoji} onChange={setEmoji} />
      <Button title="Create space" icon="checkmark" onPress={create} />
    </Screen>
  );
}

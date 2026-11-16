import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button, Field, Muted, Screen } from '../../components/ui';
import { useStore } from '../../state/store';

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, dispatch } = useStore();
  const block = data.blocks.find((b) => b.id === id);
  const [title, setTitle] = useState(block?.title ?? '');
  const [body, setBody] = useState(block?.body ?? '');

  if (!block) {
    return (
      <Screen edges={['bottom']}>
        <Muted>This note was deleted.</Muted>
      </Screen>
    );
  }

  const save = (patch: { title?: string; body?: string }) => dispatch({ type: 'updateBlock', id: block.id, patch });

  return (
    <Screen edges={['bottom']}>
      <Field
        label="Title"
        value={title}
        onChangeText={(v) => {
          setTitle(v);
          if (v.trim()) save({ title: v });
        }}
      />
      <Field
        label="Note"
        value={body}
        onChangeText={(v) => {
          setBody(v);
          save({ body: v });
        }}
        multiline
        placeholder="Ideas, questions, links, plans…"
        autoFocus={!block.body}
      />
      <Muted style={{ fontSize: 13 }}>Saved as you type.</Muted>
      <Button
        title="Delete note"
        icon="trash-outline"
        variant="ghost"
        onPress={() => {
          dispatch({ type: 'deleteBlock', id: block.id });
          router.back();
        }}
      />
    </Screen>
  );
}

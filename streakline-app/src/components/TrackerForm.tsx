import { Pressable, Text, View } from 'react-native';

import { EMOJI_CHOICES, SEGMENTS } from '../lib/segments';
import { formatMinutes } from '../lib/trackers';
import type { SegmentId, TrackerKind, Visibility } from '../lib/types';
import { c, radius, space } from '../theme';
import { Chip, Field, Label, Muted, Segmented, Stepper, Wrap } from './ui';

export interface TrackerDraft {
  name: string;
  emoji: string;
  segment: SegmentId;
  kind: TrackerKind;
  target: number;
  visibility: Visibility;
}

export function defaultTarget(kind: TrackerKind): number {
  return kind === 'duration' ? 60 : kind === 'count' ? 3 : 1;
}

export function EmojiPicker({ value, onChange }: { value: string; onChange: (e: string) => void }) {
  return (
    <Wrap gap={6}>
      {EMOJI_CHOICES.map((e) => (
        <Pressable
          key={e}
          onPress={() => onChange(e)}
          accessibilityRole="button"
          accessibilityLabel={`Icon ${e}`}
          accessibilityState={{ selected: value === e }}
          aria-selected={value === e}
          style={{ width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: value === e ? c.white : c.surface2 }}
        >
          <Text style={{ fontSize: 20 }}>{e}</Text>
        </Pressable>
      ))}
    </Wrap>
  );
}

/** Shared form for creating and editing trackers. */
export function TrackerForm({ draft, onChange, showSegment = true }: { draft: TrackerDraft; onChange: (d: TrackerDraft) => void; showSegment?: boolean }) {
  const set = (patch: Partial<TrackerDraft>) => onChange({ ...draft, ...patch });
  return (
    <View style={{ gap: space.lg }}>
      <Field label="Name" value={draft.name} onChangeText={(name) => set({ name })} placeholder="e.g. Deep work" maxLength={32} />
      {showSegment ? (
        <View style={{ gap: 6 }}>
          <Label>Segment</Label>
          <Wrap gap={6}>
            {SEGMENTS.map((s) => (
              <Chip key={s.id} label={s.name} dot={s.color} selected={draft.segment === s.id} onPress={() => set({ segment: s.id })} />
            ))}
          </Wrap>
        </View>
      ) : null}
      <View style={{ gap: 6 }}>
        <Label>How you log it</Label>
        <Segmented
          label="Tracker type"
          value={draft.kind}
          onChange={(kind) => set({ kind, target: defaultTarget(kind) })}
          options={[
            { value: 'check', label: 'Done / not' },
            { value: 'count', label: 'Count' },
            { value: 'duration', label: 'Time' },
          ]}
        />
      </View>
      {draft.kind !== 'check' ? (
        <View style={{ gap: 6 }}>
          <Label>Daily goal</Label>
          {draft.kind === 'duration' ? (
            <Stepper value={draft.target} onChange={(target) => set({ target })} step={5} min={5} max={480} format={formatMinutes} />
          ) : (
            <Stepper value={draft.target} onChange={(target) => set({ target })} step={1} min={1} max={50} format={(v) => `${v}×`} />
          )}
        </View>
      ) : null}
      <View style={{ gap: 6 }}>
        <Label>Icon</Label>
        <EmojiPicker value={draft.emoji} onChange={(emoji) => set({ emoji })} />
      </View>
      <View style={{ gap: 6 }}>
        <Label>Who sees it</Label>
        <Segmented
          label="Visibility"
          value={draft.visibility}
          onChange={(visibility) => set({ visibility })}
          options={[
            { value: 'public', label: 'Community' },
            { value: 'private', label: 'Only me' },
          ]}
        />
        <Muted style={{ fontSize: 13 }}>
          {draft.visibility === 'public'
            ? 'Finished days can post to your feed and count on segment leaderboards.'
            : 'Never posted, never on leaderboards. Good for health or personal habits.'}
        </Muted>
      </View>
    </View>
  );
}

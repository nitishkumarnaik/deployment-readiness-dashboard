import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { EmojiPicker } from '../components/TrackerForm';
import { Button, Card, Field, Label, Muted, Row, Screen } from '../components/ui';
import { buildDemoData } from '../lib/demo';
import { newId } from '../lib/id';
import { SEGMENTS } from '../lib/segments';
import { buildFromTemplate, SPACE_TEMPLATES } from '../lib/spaces';
import type { SegmentId, Tracker } from '../lib/types';
import { clockNow } from '../lib/timer';
import { useToday } from '../lib/useToday';
import { useStore } from '../state/store';
import { c, radius, space } from '../theme';

const STEPS = 4;

export default function OnboardingScreen() {
  const { dispatch } = useStore();
  const today = useToday();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [emoji, setEmoji] = useState('🌀');
  const [picked, setPicked] = useState<SegmentId[]>(['focus', 'ideation']);
  const [autoShare, setAutoShare] = useState(true);

  const toggle = (id: SegmentId) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const finish = () => {
    const nowIso = new Date().toISOString();
    dispatch({
      type: 'setProfile',
      profile: { name: name.trim(), handle: handle || name.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || 'me', emoji, startedOn: today, autoShare },
    });
    // Two starter trackers per chosen segment.
    const trackers: Tracker[] = [];
    picked.forEach((segId) => {
      const seg = SEGMENTS.find((s) => s.id === segId)!;
      seg.templates.slice(0, 2).forEach((tpl) => {
        trackers.push({ id: newId(), name: tpl.name, emoji: tpl.emoji, segment: segId, kind: tpl.kind, target: tpl.target, visibility: 'public', order: trackers.length, archived: false, createdOn: today });
      });
    });
    dispatch({ type: 'addTrackers', trackers, nowIso });
    // A ready-made space for each chosen segment that has a template.
    let existing = [...trackers];
    let order = 0;
    for (const segId of picked) {
      const tpl = SPACE_TEMPLATES.find((t) => t.segment === segId);
      if (!tpl) continue;
      const built = buildFromTemplate(tpl, { existing, today, nowIso, order: order++, trackerOrderStart: existing.length });
      existing = [...existing, ...built.newTrackers];
      dispatch({ type: 'addSpace', space: built.space, blocks: built.blocks, trackers: built.newTrackers });
    }
    router.replace('/');
  };

  const explore = () => {
    dispatch({ type: 'hydrate', data: buildDemoData(today, clockNow()) });
    router.replace('/');
  };

  const canNext = step === 1 ? name.trim().length > 0 : step === 2 ? picked.length > 0 : true;

  return (
    <Screen>
      {step > 0 ? (
        <Row style={{ justifyContent: 'space-between' }}>
          <Pressable onPress={() => setStep(step - 1)} accessibilityRole="button" accessibilityLabel="Back" hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={c.text} />
          </Pressable>
          <Row gap={6} style={{}}>
            {Array.from({ length: STEPS }, (_, i) => (
              <View key={i} style={{ width: i === step ? 20 : 7, height: 7, borderRadius: 4, backgroundColor: i <= step ? c.white : c.surface2 }} />
            ))}
          </Row>
          <View style={{ width: 26 }} />
        </Row>
      ) : null}

      {step === 0 ? (
        <View style={{ gap: space.xl, marginTop: space.xxl }}>
          <View style={styles.logo}>
            {[0, 1, 2].map((r) => (
              <View key={r} style={{ flexDirection: 'row', gap: 5 }}>
                {[0, 1, 2].map((col) => (
                  <View key={col} style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: col + (2 - r) >= 2 ? c.white : c.surface2 }} />
                ))}
              </View>
            ))}
          </View>
          <View style={{ gap: space.sm }}>
            <Text style={styles.wordmark}>streakline</Text>
            <Text style={styles.tagline}>Track anything.{'\n'}Share the streak.</Text>
          </View>
          <Card>
            <Feature icon="grid-outline" title="Tap to log" text="Every habit is a tile. One tap and the day lights up." />
            <Feature icon="folder-open-outline" title="Spaces you design" text="Folders of trackers, tasks and notes, laid out your way." />
            <Feature icon="people-outline" title="A community for consistency" text="Feeds, props, leaderboards and challenges for focus, ideas, study, research, fitness and sleep." />
          </Card>
        </View>
      ) : null}

      {step === 1 ? (
        <View style={{ gap: space.lg }}>
          <Text style={styles.h}>Who’s tracking?</Text>
          <Field label="Name" value={name} onChangeText={setName} placeholder="Your first name" autoFocus maxLength={30} />
          <Field label="Handle" value={handle} onChangeText={(v) => setHandle(v.toLowerCase().replace(/[^a-z0-9._]/g, ''))} placeholder="e.g. alex.makes" autoCapitalize="none" maxLength={24} />
          <Label>Avatar</Label>
          <EmojiPicker value={emoji} onChange={setEmoji} />
        </View>
      ) : null}

      {step === 2 ? (
        <View style={{ gap: space.md }}>
          <Text style={styles.h}>What do you want to be consistent at?</Text>
          <Muted>Pick your segments. You get starter trackers and a space for each; change anything later.</Muted>
          {SEGMENTS.filter((s) => s.id !== 'custom').map((s) => {
            const sel = picked.includes(s.id);
            return (
              <Pressable
                key={s.id}
                onPress={() => toggle(s.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: sel }}
                aria-checked={sel}
                style={[styles.segment, { borderColor: sel ? s.color : c.line }]}
              >
                <Text style={{ fontSize: 26 }}>{s.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontWeight: '700', fontSize: 16 }}>{s.name}</Text>
                  <Text style={{ color: c.muted, fontSize: 13 }}>{s.blurb}</Text>
                </View>
                <Ionicons name={sel ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={sel ? s.color : c.faint} />
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {step === 3 ? (
        <View style={{ gap: space.lg }}>
          <Text style={styles.h}>Share your streaks?</Text>
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontWeight: '700', fontSize: 15 }}>Post finished goals to my feed</Text>
                <Muted style={{ fontSize: 13 }}>Like a workout upload: when you hit a daily goal, friends can see it and give props.</Muted>
              </View>
              <Switch value={autoShare} onValueChange={setAutoShare} accessibilityLabel="Post finished goals" trackColor={{ true: c.live, false: c.surface2 }} />
            </Row>
          </Card>
          <Muted>You choose per tracker: Community or Only me. Private trackers never post and never appear on leaderboards. Your data stays on this phone.</Muted>
        </View>
      ) : null}

      <View style={{ gap: space.sm, marginTop: space.lg }}>
        <Button title={step === 0 ? 'Get started' : step === STEPS - 1 ? 'Start tracking' : 'Continue'} onPress={() => (step === STEPS - 1 ? finish() : setStep(step + 1))} disabled={!canNext} />
        {step === 0 ? <Button title="Explore with sample data" variant="ghost" onPress={explore} /> : null}
      </View>
    </Screen>
  );
}

function Feature({ icon, title, text }: { icon: 'grid-outline' | 'folder-open-outline' | 'people-outline'; title: string; text: string }) {
  return (
    <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={18} color={c.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.text, fontWeight: '700', fontSize: 15 }}>{title}</Text>
        <Muted style={{ fontSize: 13 }}>{text}</Muted>
      </View>
    </Row>
  );
}

const styles = StyleSheet.create({
  logo: { width: 72, height: 72, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', gap: 5 },
  wordmark: { color: c.text, fontSize: 48, fontWeight: '800', letterSpacing: -2.5 },
  tagline: { color: c.muted, fontSize: 22, fontWeight: '500', letterSpacing: -0.5, lineHeight: 28 },
  h: { color: c.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.6 },
  segment: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: c.surface, borderWidth: 1 },
});

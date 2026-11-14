import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Body, Button, Card, Chip, Field, Label, Muted, Row, Screen, Wrap } from '../components/ui';
import { success, tap } from '../lib/feedback';
import { newId } from '../lib/id';
import { proteinForDay, QUICK_ADDS } from '../lib/protein';
import { parseNumber } from '../lib/units';
import { useToday } from '../lib/useToday';
import { useStore } from '../state/store';
import { space, useColors } from '../theme';

export default function AddProteinScreen() {
  const c = useColors();
  const { data, dispatch } = useStore();
  const today = useToday();
  const [grams, setGrams] = useState('');
  const [label, setLabel] = useState('');
  const p = data.profile;
  if (!p) return null;

  const total = proteinForDay(data.protein, today);
  const entries = data.protein.filter((e) => e.dateKey === today);

  const add = (g: number, l: string) => {
    tap();
    dispatch({ type: 'addProtein', entry: { id: newId(), dateKey: today, grams: g, label: l, at: new Date().toISOString() } });
  };

  const custom = parseNumber(grams);
  const customValid = custom !== null && custom > 0 && custom <= 150;

  return (
    <Screen edges={['bottom']}>
      <Card tone="accent">
        <Row style={{ justifyContent: 'space-between' }}>
          <Body style={{ fontWeight: '700' }}>Today</Body>
          <Body style={{ fontWeight: '800', color: c.accent }}>
            {total} / {p.proteinTargetG} g
          </Body>
        </Row>
      </Card>

      <View style={{ gap: space.sm }}>
        <Label>One tap, approximate per serving</Label>
        <Wrap>
          {QUICK_ADDS.map((q) => (
            <Chip key={q.id} label={`${q.label} +${q.grams} g`} tone="accent" onPress={() => add(q.grams, q.label)} />
          ))}
        </Wrap>
      </View>

      <View style={{ gap: space.md }}>
        <Label>Something else</Label>
        <Field label="Protein (g)" value={grams} onChangeText={setGrams} keyboardType="number-pad" placeholder="e.g. 20" />
        <Field label="What was it? (optional)" value={label} onChangeText={setLabel} placeholder="e.g. Protein bar" />
        <Button
          title="Add"
          icon="add"
          disabled={!customValid}
          onPress={() => {
            if (custom === null) return;
            add(Math.round(custom), label.trim() || 'Custom');
            success();
            setGrams('');
            setLabel('');
          }}
        />
      </View>

      {entries.length > 0 ? (
        <Card>
          <Label>Logged today</Label>
          {entries.map((e) => (
            <Row key={e.id} style={{ justifyContent: 'space-between' }}>
              <Body>
                {e.label} · {e.grams} g
              </Body>
              <Button
                title="Remove"
                variant="ghost"
                onPress={() => dispatch({ type: 'removeProtein', id: e.id })}
                style={{ minHeight: 36, paddingHorizontal: 8 }}
              />
            </Row>
          ))}
        </Card>
      ) : null}

      <Button title="Done" variant="secondary" onPress={() => router.back()} />
      <Muted style={{ fontSize: 13 }}>No food database, no calorie counting. Just the one number that protects your muscle.</Muted>
    </Screen>
  );
}

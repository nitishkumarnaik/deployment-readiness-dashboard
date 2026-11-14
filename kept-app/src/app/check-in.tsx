import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Body, Button, Muted, Screen, Segmented } from '../components/ui';
import { success } from '../lib/feedback';
import type { Level } from '../lib/types';
import { useToday } from '../lib/useToday';
import { useStore } from '../state/store';
import { space } from '../theme';

const OPTIONS: { value: Level; label: string }[] = [
  { value: 0, label: 'None' },
  { value: 1, label: 'Mild' },
  { value: 2, label: 'Moderate' },
  { value: 3, label: 'Strong' },
];

export default function CheckInScreen() {
  const { data, dispatch } = useStore();
  const today = useToday();
  const existing = data.checkins.find((c) => c.dateKey === today);
  const [nausea, setNausea] = useState<Level>(existing?.nausea ?? 0);
  const [fatigue, setFatigue] = useState<Level>(existing?.fatigue ?? 0);
  const [lowAppetite, setLowAppetite] = useState<Level>(existing?.lowAppetite ?? 0);

  const save = () => {
    dispatch({ type: 'checkIn', checkin: { dateKey: today, nausea, fatigue, lowAppetite, at: new Date().toISOString() } });
    success();
    router.back();
  };

  const row = (label: string, help: string, value: Level, set: (v: Level) => void) => (
    <View style={{ gap: space.sm }}>
      <Body style={{ fontWeight: '700' }}>{label}</Body>
      <Muted style={{ fontSize: 14 }}>{help}</Muted>
      <Segmented accessibilityLabel={label} options={OPTIONS} value={value} onChange={set} />
    </View>
  );

  return (
    <Screen edges={['bottom']}>
      <Muted>How has today felt so far? Kept uses this to learn which days of your cycle are easier.</Muted>
      {row('Nausea', 'Queasy, unsettled stomach', nausea, setNausea)}
      {row('Fatigue', 'Low energy, tired, heavy', fatigue, setFatigue)}
      {row('Low appetite', 'Less hungry than usual, hard to eat', lowAppetite, setLowAppetite)}
      <Button title="Save check-in" icon="checkmark" onPress={save} />
      <Muted style={{ fontSize: 13 }}>
        Side effects that are severe or won&apos;t go away, like strong stomach pain or being unable to keep fluids down, need a call to your
        doctor, not an app.
      </Muted>
    </Screen>
  );
}

import { router } from 'expo-router';
import { useState } from 'react';

import { Button, Field, Muted, Screen } from '../components/ui';
import { success } from '../lib/feedback';
import { kgToUnits, parseNumber, unitsToKg } from '../lib/units';
import { useToday } from '../lib/useToday';
import { useStore } from '../state/store';

export default function LogWeightScreen() {
  const { data, dispatch } = useStore();
  const today = useToday();
  const p = data.profile;
  const last = [...data.weights].sort((a, b) => (a.dateKey < b.dateKey ? -1 : 1)).pop();
  const [value, setValue] = useState(last && p ? kgToUnits(last.kg, p.units).toFixed(1) : '');
  if (!p) return null;

  const parsed = parseNumber(value);
  const kg = parsed === null ? null : unitsToKg(parsed, p.units);
  const valid = kg !== null && kg >= 30 && kg <= 350;

  const save = () => {
    if (!valid || kg === null) return;
    dispatch({ type: 'logWeight', entry: { dateKey: today, kg: Math.round(kg * 10) / 10 } });
    success();
    router.back();
  };

  return (
    <Screen edges={['bottom']}>
      <Field
        label={`Today's weight (${p.units})`}
        value={value}
        onChangeText={setValue}
        keyboardType="decimal-pad"
        placeholder={p.units === 'kg' ? 'e.g. 88.4' : 'e.g. 195.0'}
        autoFocus
      />
      <Button title="Save weight" icon="checkmark" onPress={save} disabled={!valid} />
      <Muted style={{ fontSize: 13 }}>
        Weigh in at the same time of day, once or twice a week. Daily numbers bounce around with water; the trend is what counts.
      </Muted>
    </Screen>
  );
}

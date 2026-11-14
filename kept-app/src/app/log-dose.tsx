import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Chip, Field, Label, Muted, Screen, Wrap } from '../components/ui';
import { addDays, formatDay } from '../lib/dates';
import { success } from '../lib/feedback';
import { newId } from '../lib/id';
import { SITES, type InjectionSite } from '../lib/types';
import { useToday } from '../lib/useToday';
import { useStore } from '../state/store';
import { space } from '../theme';

/** Suggests the site used least recently, to help with rotation. */
function suggestSite(history: (InjectionSite | undefined)[]): InjectionSite {
  for (const s of SITES) if (!history.includes(s.id)) return s.id;
  let best = SITES[0].id;
  let bestIdx = Infinity;
  for (const s of SITES) {
    const idx = history.lastIndexOf(s.id);
    if (idx < bestIdx) {
      bestIdx = idx;
      best = s.id;
    }
  }
  return best;
}

export default function LogDoseScreen() {
  const { data, dispatch } = useStore();
  const today = useToday();
  const p = data.profile;
  const sorted = [...data.doses].sort((a, b) => (a.dateKey < b.dateKey ? -1 : 1));
  const suggested = suggestSite(sorted.map((d) => d.site));
  const [amount, setAmount] = useState(p?.currentDose ?? '');
  const [day, setDay] = useState(today);
  const [site, setSite] = useState<InjectionSite | undefined>(suggested);

  if (!p) return null;

  const save = () => {
    const trimmed = amount.trim();
    dispatch({ type: 'logDose', dose: { id: newId(), dateKey: day, amount: trimmed, site, at: new Date().toISOString() } });
    if (trimmed && trimmed !== p.currentDose) dispatch({ type: 'updateProfile', patch: { currentDose: trimmed } });
    success();
    router.back();
  };

  return (
    <Screen edges={['bottom']}>
      <View style={{ gap: space.sm }}>
        <Label>When</Label>
        <Wrap>
          {[0, -1, -2].map((offset) => {
            const k = addDays(today, offset);
            return (
              <Chip
                key={k}
                label={offset === 0 ? 'Today' : offset === -1 ? 'Yesterday' : formatDay(k)}
                selected={day === k}
                onPress={() => setDay(k)}
              />
            );
          })}
        </Wrap>
      </View>

      <Field
        label="Dose"
        value={amount}
        onChangeText={setAmount}
        placeholder="e.g. 0.5 mg"
        hint="Exactly as prescribed. Kept records your dose; it never suggests one."
        autoCapitalize="none"
      />

      <View style={{ gap: space.sm }}>
        <Label>Injection site (optional)</Label>
        <Wrap>
          {SITES.map((s) => (
            <Chip key={s.id} label={s.id === suggested ? `${s.label} · next` : s.label} selected={site === s.id} onPress={() => setSite(site === s.id ? undefined : s.id)} />
          ))}
        </Wrap>
        <Muted style={{ fontSize: 13 }}>&quot;Next&quot; is the site you used least recently.</Muted>
      </View>

      <Button title="Save dose" icon="checkmark" onPress={save} />
    </Screen>
  );
}

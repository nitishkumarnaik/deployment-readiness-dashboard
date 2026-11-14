import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Switch, View } from 'react-native';

import { Body, Button, Card, Chip, Divider, Field, H1, H2, Label, Muted, Row, Screen, Segmented, Stepper, Wrap } from '../../components/ui';
import { WEEKDAY_SHORT } from '../../lib/dates';
import { buildDemoData } from '../../lib/demo';
import { confirm, notify } from '../../lib/feedback';
import { cancelReminders, syncReminders } from '../../lib/notifications';
import { PROTEIN_MAX_G, PROTEIN_MIN_G } from '../../lib/protein';
import { MEDICATIONS, type Profile } from '../../lib/types';
import { formatWeight, kgToUnits, parseNumber, unitsToKg } from '../../lib/units';
import { useToday } from '../../lib/useToday';
import { useStore } from '../../state/store';
import { space, useColors } from '../../theme';

export default function SettingsScreen() {
  const c = useColors();
  const { data, dispatch } = useStore();
  const today = useToday();
  const p = data.profile;
  if (!p) return null;

  const update = (patch: Partial<Profile>) => {
    dispatch({ type: 'updateProfile', patch });
    const next = { ...p, ...patch };
    if (next.remindersEnabled && ('doseWeekday' in patch || 'frequency' in patch || 'proteinTargetG' in patch)) {
      syncReminders(next).catch(() => undefined);
    }
  };

  const toggleReminders = async (on: boolean) => {
    if (!on) {
      update({ remindersEnabled: false });
      await cancelReminders();
      return;
    }
    if (Platform.OS === 'web') {
      notify('Reminders', 'Reminders work in the iOS and Android apps.');
      return;
    }
    const ok = await syncReminders({ ...p, remindersEnabled: true });
    if (ok) update({ remindersEnabled: true });
    else notify('Notifications are off', 'Allow notifications for Kept in your phone settings to get reminders.');
  };

  const resetAll = () =>
    confirm('Delete all data?', 'This removes your profile and every log from this device. It cannot be undone.', 'Delete', async () => {
      await cancelReminders();
      dispatch({ type: 'reset' });
      router.replace('/onboarding');
    });

  const loadDemo = () =>
    confirm('Replace with sample data?', 'Your current data on this device will be replaced by three weeks of sample data.', 'Replace', () => {
      dispatch({ type: 'hydrate', data: buildDemoData(today) });
    });

  return (
    <Screen>
      <H1>Settings</H1>

      <Card>
        <H2>Medication</H2>
        <Wrap>
          {MEDICATIONS.map((m) => (
            <Chip key={m.id} label={m.label} selected={p.medication === m.id} onPress={() => update({ medication: m.id })} />
          ))}
        </Wrap>
        <Segmented
          accessibilityLabel="Dosing frequency"
          value={p.frequency}
          onChange={(frequency) => update({ frequency })}
          options={[
            { value: 'weekly', label: 'Once a week' },
            { value: 'daily', label: 'Every day' },
          ]}
        />
        {p.frequency === 'weekly' ? (
          <View style={{ gap: space.sm }}>
            <Label>Dose day</Label>
            <Wrap gap={6}>
              {WEEKDAY_SHORT.map((d, i) => (
                <Chip key={d} label={d} selected={p.doseWeekday === i} onPress={() => update({ doseWeekday: i })} />
              ))}
            </Wrap>
          </View>
        ) : null}
        <Field label="Current dose" value={p.currentDose} onChangeText={(currentDose) => update({ currentDose })} placeholder="e.g. 0.5 mg" autoCapitalize="none" />
      </Card>

      <Card>
        <H2>Goals</H2>
        <Label>Daily protein floor</Label>
        <Stepper value={p.proteinTargetG} onChange={(proteinTargetG) => update({ proteinTargetG })} step={5} min={PROTEIN_MIN_G} max={PROTEIN_MAX_G} suffix="g" />
        <Divider />
        <Label>Strength sessions per week</Label>
        <Segmented
          accessibilityLabel="Strength sessions per week"
          value={p.strengthDaysPerWeek}
          onChange={(strengthDaysPerWeek) => update({ strengthDaysPerWeek })}
          options={[
            { value: 2, label: '2' },
            { value: 3, label: '3' },
            { value: 4, label: '4' },
          ]}
        />
        <Divider />
        <GoalWeightField key={`${p.units}-${p.goalWeightKg}`} profile={p} onSave={(goalWeightKg) => update({ goalWeightKg })} />
        <Muted style={{ fontSize: 13 }}>Starting weight: {formatWeight(p.startWeightKg, p.units)}</Muted>
      </Card>

      <Card>
        <H2>Preferences</H2>
        <Field label="First name" value={p.name} onChangeText={(name) => update({ name })} placeholder="Optional" />
        <Label>Units</Label>
        <Segmented
          accessibilityLabel="Units"
          value={p.units}
          onChange={(units) => update({ units })}
          options={[
            { value: 'kg', label: 'Kilograms' },
            { value: 'lb', label: 'Pounds' },
          ]}
        />
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Body style={{ fontWeight: '700' }}>Reminders</Body>
            <Muted>Dose day at 9:00, protein check at 19:00</Muted>
          </View>
          <Switch value={p.remindersEnabled} onValueChange={toggleReminders} accessibilityLabel="Reminders" trackColor={{ true: c.primary, false: c.track }} />
        </Row>
      </Card>

      <Card>
        <H2>Your data</H2>
        <Muted>
          Everything you log is stored only on this device. Kept has no account, no servers and no analytics. Deleting the app deletes your data.
        </Muted>
        <Button title="Create clinician summary" variant="secondary" icon="document-text-outline" onPress={() => router.push('/report')} />
        <Button title="Load sample data" variant="secondary" icon="flask-outline" onPress={loadDemo} />
        <Button title="Delete all data" variant="danger" icon="trash-outline" onPress={resetAll} />
      </Card>

      <Card tone="calm">
        <H2>Important</H2>
        <Muted>
          Kept is a wellness tracker, not a medical device. It does not diagnose, treat or give dosing advice. Always follow your prescriber&apos;s
          instructions. If you have severe stomach pain, can&apos;t keep fluids down, or feel unwell, contact your doctor or emergency services.
        </Muted>
      </Card>

      <Muted style={{ textAlign: 'center', fontSize: 13 }}>Kept {Constants.expoConfig?.version ?? ''}</Muted>
    </Screen>
  );
}

function GoalWeightField({ profile, onSave }: { profile: Profile; onSave: (kg: number) => void }) {
  const [text, setText] = useState(kgToUnits(profile.goalWeightKg, profile.units).toFixed(1));
  const commit = () => {
    const n = parseNumber(text);
    if (n === null) return;
    const kg = Math.round(unitsToKg(n, profile.units) * 10) / 10;
    if (kg >= 30 && kg <= 350 && kg !== profile.goalWeightKg) onSave(kg);
  };
  return (
    <Field
      label={`Goal weight (${profile.units})`}
      value={text}
      onChangeText={setText}
      onBlur={commit}
      onSubmitEditing={commit}
      keyboardType="decimal-pad"
      returnKeyType="done"
    />
  );
}

import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { Body, Button, Card, Chip, Field, H1, H2, IconBadge, Label, Muted, Row, Screen, Segmented, Stepper, Wrap } from '../components/ui';
import { WEEKDAY_SHORT, weekdayOf } from '../lib/dates';
import { buildDemoData } from '../lib/demo';
import { syncReminders } from '../lib/notifications';
import { DEFAULT_G_PER_KG, PROTEIN_MAX_G, PROTEIN_MIN_G, suggestedProteinTarget } from '../lib/protein';
import { MEDICATIONS, type Frequency, type MedicationId, type Profile, type Units } from '../lib/types';
import { parseNumber, unitsToKg } from '../lib/units';
import { useToday } from '../lib/useToday';
import { useStore } from '../state/store';
import { space, useColors } from '../theme';

const STEPS = 4;

export default function OnboardingScreen() {
  const c = useColors();
  const { dispatch } = useStore();
  const today = useToday();
  const [step, setStep] = useState(0);
  const [agreed, setAgreed] = useState(false);

  const [medication, setMedication] = useState<MedicationId>('semaglutide');
  const [frequency, setFrequency] = useState<Frequency>('weekly');
  const [doseWeekday, setDoseWeekday] = useState(weekdayOf(today));
  const [currentDose, setCurrentDose] = useState('');

  const [units, setUnits] = useState<Units>('kg');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState('');

  const [name, setName] = useState('');
  const [strengthDays, setStrengthDays] = useState(3);
  const [proteinOverride, setProteinOverride] = useState<number | null>(null);
  const [reminders, setReminders] = useState(true);

  const weightKg = (() => {
    const n = parseNumber(weight);
    return n === null ? null : unitsToKg(n, units);
  })();
  const goalKg = (() => {
    const n = parseNumber(goal);
    return n === null ? null : unitsToKg(n, units);
  })();
  const weightsValid = weightKg !== null && goalKg !== null && weightKg >= 30 && weightKg <= 350 && goalKg >= 30 && goalKg <= 350;
  const suggested = goalKg ? suggestedProteinTarget(goalKg, DEFAULT_G_PER_KG) : 100;
  const protein = proteinOverride ?? suggested;

  const pickMedication = (id: MedicationId) => {
    setMedication(id);
    setFrequency(MEDICATIONS.find((m) => m.id === id)?.usual ?? 'weekly');
  };

  const finish = async () => {
    if (weightKg === null || goalKg === null) return;
    const profile: Profile = {
      name: name.trim(),
      medication,
      frequency,
      doseWeekday,
      currentDose: currentDose.trim(),
      units,
      startWeightKg: Math.round(weightKg * 10) / 10,
      goalWeightKg: Math.round(goalKg * 10) / 10,
      proteinGPerKg: DEFAULT_G_PER_KG,
      proteinTargetG: protein,
      strengthDaysPerWeek: strengthDays,
      remindersEnabled: reminders,
      startedOn: today,
    };
    dispatch({ type: 'setProfile', profile });
    dispatch({ type: 'logWeight', entry: { dateKey: today, kg: profile.startWeightKg } });
    if (reminders) {
      const ok = await syncReminders(profile);
      if (!ok) dispatch({ type: 'updateProfile', patch: { remindersEnabled: false } });
    }
    router.replace('/');
  };

  const exploreDemo = () => {
    dispatch({ type: 'hydrate', data: buildDemoData(today) });
    router.replace('/');
  };

  const next = () => (step < STEPS - 1 ? setStep(step + 1) : finish());
  const canContinue = step === 0 ? agreed : step === 2 ? weightsValid : true;

  return (
    <Screen>
      {step > 0 ? (
        <Row style={{ justifyContent: 'space-between' }}>
          <Pressable onPress={() => setStep(step - 1)} accessibilityRole="button" accessibilityLabel="Back" hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color={c.text} />
          </Pressable>
          <Row gap={6} accessibilityLabel={`Step ${step + 1} of ${STEPS}`}>
            {Array.from({ length: STEPS }, (_, i) => (
              <View key={i} style={{ width: i === step ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: i <= step ? c.primary : c.track }} />
            ))}
          </Row>
          <View style={{ width: 26 }} />
        </Row>
      ) : null}

      {step === 0 ? (
        <View style={{ gap: space.lg }}>
          <View style={{ alignItems: 'flex-start', gap: space.md, marginTop: space.xl }}>
            <IconBadge icon="shield-checkmark-outline" color={c.onPrimary} bg={c.primary} size={64} />
            <H1 style={{ fontSize: 34 }}>Lose the weight.{'\n'}Keep the muscle.</H1>
            <Body style={{ color: c.muted }}>
              Kept is a companion for people on GLP-1 medication. It helps you protect your strength while the scale goes down.
            </Body>
          </View>
          <Card>
            <Feature icon="nutrition-outline" title="A protein floor, not a calorie ceiling" text="One number a day, logged in a tap." />
            <Feature icon="calendar-outline" title="Plans that follow your dose cycle" text="Strength sessions land on the days you usually feel best." />
            <Feature icon="lock-closed-outline" title="Private by design" text="No account. Your data stays on this phone." />
          </Card>
          <Pressable
            onPress={() => setAgreed(!agreed)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
            style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}
          >
            <Ionicons name={agreed ? 'checkbox' : 'square-outline'} size={26} color={agreed ? c.primary : c.muted} />
            <Muted style={{ flex: 1 }}>
              I understand Kept is not a medical device and doesn&apos;t give medical advice. I&apos;ll follow my prescriber&apos;s instructions for my
              medication and check with them before changing my diet or exercise.
            </Muted>
          </Pressable>
        </View>
      ) : null}

      {step === 1 ? (
        <View style={{ gap: space.lg }}>
          <H1>Your medication</H1>
          <View style={{ gap: space.sm }}>
            <Label>Medication</Label>
            <Wrap>
              {MEDICATIONS.map((m) => (
                <Chip key={m.id} label={m.label} selected={medication === m.id} onPress={() => pickMedication(m.id)} />
              ))}
            </Wrap>
            <Muted style={{ fontSize: 13 }}>Generic names. For example, semaglutide or tirzepatide injections and tablets.</Muted>
          </View>
          <View style={{ gap: space.sm }}>
            <Label>How often</Label>
            <Segmented
              accessibilityLabel="Dosing frequency"
              value={frequency}
              onChange={setFrequency}
              options={[
                { value: 'weekly', label: 'Once a week' },
                { value: 'daily', label: 'Every day' },
              ]}
            />
          </View>
          {frequency === 'weekly' ? (
            <View style={{ gap: space.sm }}>
              <Label>Dose day</Label>
              <Wrap gap={6}>
                {WEEKDAY_SHORT.map((d, i) => (
                  <Chip key={d} label={d} selected={doseWeekday === i} onPress={() => setDoseWeekday(i)} />
                ))}
              </Wrap>
            </View>
          ) : null}
          <Field label="Current dose (optional)" value={currentDose} onChangeText={setCurrentDose} placeholder="e.g. 0.5 mg" autoCapitalize="none" />
        </View>
      ) : null}

      {step === 2 ? (
        <View style={{ gap: space.lg }}>
          <H1>Where you&apos;re starting</H1>
          <Segmented
            accessibilityLabel="Units"
            value={units}
            onChange={setUnits}
            options={[
              { value: 'kg', label: 'Kilograms' },
              { value: 'lb', label: 'Pounds' },
            ]}
          />
          <Field label={`Current weight (${units})`} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder={units === 'kg' ? 'e.g. 96' : 'e.g. 212'} />
          <Field
            label={`Goal weight (${units})`}
            value={goal}
            onChangeText={setGoal}
            keyboardType="decimal-pad"
            placeholder={units === 'kg' ? 'e.g. 82' : 'e.g. 180'}
            hint="Used to set your protein floor. Agree it with your care team."
          />
        </View>
      ) : null}

      {step === 3 ? (
        <View style={{ gap: space.lg }}>
          <H1>Your plan</H1>
          <Card tone="accent">
            <H2>Daily protein floor</H2>
            <Stepper value={protein} onChange={setProteinOverride} step={5} min={PROTEIN_MIN_G} max={PROTEIN_MAX_G} suffix="g" />
            <Muted>
              Based on {DEFAULT_G_PER_KG} g per kg of goal weight, a common starting point for people losing weight. Your clinician or dietitian may
              suggest a different number.
            </Muted>
          </Card>
          <Card>
            <H2>Strength sessions per week</H2>
            <Segmented
              accessibilityLabel="Strength sessions per week"
              value={strengthDays}
              onChange={setStrengthDays}
              options={[
                { value: 2, label: '2' },
                { value: 3, label: '3' },
                { value: 4, label: '4' },
              ]}
            />
            <Muted>About 20 minutes each, at home. Low-energy versions for rough days.</Muted>
          </Card>
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Body style={{ fontWeight: '700' }}>Reminders</Body>
                <Muted>Dose day at 9:00 and a protein check at 19:00.</Muted>
              </View>
              <Switch value={reminders} onValueChange={setReminders} accessibilityLabel="Reminders" trackColor={{ true: c.primary, false: c.track }} />
            </Row>
          </Card>
          <Field label="First name (optional)" value={name} onChangeText={setName} placeholder="So we can say hello" />
        </View>
      ) : null}

      <View style={{ gap: space.sm }}>
        <Button title={step === STEPS - 1 ? 'Start' : step === 0 ? 'Get started' : 'Continue'} onPress={next} disabled={!canContinue} />
        {step === 0 ? <Button title="Just looking? Explore with sample data" variant="ghost" onPress={exploreDemo} /> : null}
      </View>
    </Screen>
  );
}

function Feature({ icon, title, text }: { icon: 'nutrition-outline' | 'calendar-outline' | 'lock-closed-outline'; title: string; text: string }) {
  const c = useColors();
  return (
    <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
      <IconBadge icon={icon} color={c.primary} bg={c.primarySoft} />
      <View style={{ flex: 1 }}>
        <Body style={{ fontWeight: '700' }}>{title}</Body>
        <Muted>{text}</Muted>
      </View>
    </Row>
  );
}

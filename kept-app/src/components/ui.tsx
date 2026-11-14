import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { radius, space, useColors } from '../theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Screen({ children, scroll = true, edges }: { children: ReactNode; scroll?: boolean; edges?: ('top' | 'bottom')[] }) {
  const c = useColors();
  const content = <View style={styles.screenInner}>{children}</View>;
  return (
    <SafeAreaView edges={edges ?? ['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style, tone }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: 'primary' | 'accent' | 'calm' }) {
  const c = useColors();
  const bg = tone === 'primary' ? c.primarySoft : tone === 'accent' ? c.accentSoft : tone === 'calm' ? c.calmSoft : c.card;
  return (
    <View style={[styles.card, { backgroundColor: bg, borderColor: tone ? 'transparent' : c.border }, style]}>{children}</View>
  );
}

type TextProps = { children: ReactNode; style?: StyleProp<TextStyle>; selectable?: boolean; numberOfLines?: number };

export function H1({ children, style }: TextProps) {
  const c = useColors();
  return <Text style={[styles.h1, { color: c.text }, style]} accessibilityRole="header">{children}</Text>;
}

export function H2({ children, style }: TextProps) {
  const c = useColors();
  return <Text style={[styles.h2, { color: c.text }, style]} accessibilityRole="header">{children}</Text>;
}

export function Body({ children, style, selectable, numberOfLines }: TextProps) {
  const c = useColors();
  return (
    <Text style={[styles.body, { color: c.text }, style]} selectable={selectable} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

export function Muted({ children, style, numberOfLines }: TextProps) {
  const c = useColors();
  return <Text style={[styles.muted, { color: c.muted }, style]} numberOfLines={numberOfLines}>{children}</Text>;
}

export function Label({ children, style }: TextProps) {
  const c = useColors();
  return <Text style={[styles.label, { color: c.muted }, style]}>{children}</Text>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  style,
  accessibilityHint,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}) {
  const c = useColors();
  const bg = variant === 'primary' ? c.primary : variant === 'secondary' ? c.primarySoft : 'transparent';
  const fg = variant === 'primary' ? c.onPrimary : variant === 'danger' ? c.danger : c.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
        variant === 'danger' && { borderWidth: 1, borderColor: c.danger },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={fg} style={{ marginRight: space.sm }} /> : null}
      <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
  tone = 'primary',
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  tone?: 'primary' | 'accent';
}) {
  const c = useColors();
  const strong = tone === 'accent' ? c.accent : c.primary;
  const soft = tone === 'accent' ? c.accentSoft : c.primarySoft;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? strong : soft,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      {icon ? <Ionicons name={icon} size={15} color={selected ? c.onPrimary : strong} style={{ marginRight: 6 }} /> : null}
      <Text style={[styles.chipText, { color: selected ? c.onPrimary : strong }]}>{label}</Text>
    </Pressable>
  );
}

export function ProgressBar({ value, color, height = 12 }: { value: number; color?: string; height?: number }) {
  const c = useColors();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View
      style={[styles.track, { backgroundColor: c.track, height, borderRadius: height / 2 }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
    >
      <View style={{ width: `${pct * 100}%`, height, borderRadius: height / 2, backgroundColor: color ?? c.primary }} />
    </View>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  accessibilityLabel?: string;
}) {
  const c = useColors();
  return (
    <View style={[styles.segmented, { backgroundColor: c.track }]} accessibilityLabel={accessibilityLabel} accessibilityRole="radiogroup">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[styles.segment, selected && { backgroundColor: c.card, borderColor: c.border, borderWidth: 1 }]}
          >
            <Text style={[styles.segmentText, { color: selected ? c.text : c.muted, fontWeight: selected ? '700' : '500' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const c = useColors();
  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.statValue, { color: c.text }]}>{value}</Text>
      <Text style={[styles.label, { color: c.muted, marginTop: 2 }]}>{label}</Text>
      {sub ? <Text style={[styles.muted, { color: c.muted, fontSize: 12 }]}>{sub}</Text> : null}
    </View>
  );
}

export function Row({
  children,
  style,
  gap = space.sm,
  accessibilityLabel,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
  accessibilityLabel?: string;
}) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]} accessibilityLabel={accessibilityLabel}>
      {children}
    </View>
  );
}

export function Wrap({ children, gap = space.sm }: { children: ReactNode; gap?: number }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>{children}</View>;
}

export function Field({ label, hint, ...input }: TextInputProps & { label: string; hint?: string }) {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      <Label>{label}</Label>
      <TextInput
        placeholderTextColor={c.muted}
        accessibilityLabel={label}
        {...input}
        style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.card }, input.style]}
      />
      {hint ? <Muted style={{ fontSize: 13 }}>{hint}</Muted> : null}
    </View>
  );
}

export function Stepper({ value, onChange, step = 1, min, max, suffix }: { value: number; onChange: (v: number) => void; step?: number; min: number; max: number; suffix?: string }) {
  const c = useColors();
  const btn = (delta: number, icon: IconName, label: string) => (
    <Pressable
      onPress={() => onChange(Math.min(max, Math.max(min, value + delta)))}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.stepBtn, { backgroundColor: c.primarySoft, opacity: pressed ? 0.7 : 1 }]}
    >
      <Ionicons name={icon} size={20} color={c.primary} />
    </Pressable>
  );
  return (
    <Row gap={space.md}>
      {btn(-step, 'remove', 'Decrease')}
      <Text style={[styles.stepValue, { color: c.text }]} accessibilityLiveRegion="polite">
        {value}
        {suffix ? <Text style={{ fontSize: 16, color: c.muted }}> {suffix}</Text> : null}
      </Text>
      {btn(step, 'add', 'Increase')}
    </Row>
  );
}

export function IconBadge({ icon, color, bg, size = 36 }: { icon: IconName; color: string; bg: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={size * 0.5} color={color} />
    </View>
  );
}

export function Divider() {
  const c = useColors();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginVertical: space.sm }} />;
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: space.xxl },
  screenInner: { padding: space.lg, gap: space.lg, width: '100%', maxWidth: 640, alignSelf: 'center' },
  card: { borderRadius: radius.lg, padding: space.lg, gap: space.md, borderWidth: StyleSheet.hairlineWidth },
  h1: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  h2: { fontSize: 19, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 23 },
  muted: { fontSize: 15, lineHeight: 21 },
  label: { fontSize: 13, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' },
  button: { minHeight: 50, borderRadius: radius.md, paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 16, fontWeight: '700' },
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center' },
  chipText: { fontSize: 15, fontWeight: '600' },
  track: { width: '100%', overflow: 'hidden' },
  segmented: { flexDirection: 'row', borderRadius: radius.md, padding: 3 },
  segment: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, borderColor: 'transparent', borderWidth: 1 },
  segmentText: { fontSize: 14 },
  statValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  input: { borderWidth: 1, borderRadius: radius.md, minHeight: 50, paddingHorizontal: space.md, fontSize: 17 },
  stepBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontSize: 28, fontWeight: '800', minWidth: 90, textAlign: 'center' },
});

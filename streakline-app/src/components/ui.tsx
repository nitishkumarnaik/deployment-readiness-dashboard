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

import { c, MAX_WIDTH, radius, space } from '../theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Screen({
  children,
  scroll = true,
  edges = ['top'],
  gap = space.lg,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: ('top' | 'bottom')[];
  gap?: number;
}) {
  const inner = <View style={[styles.inner, { gap }]}>{children}</View>;
  return (
    <SafeAreaView edges={edges} style={styles.safe}>
      {scroll ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

type TextProps = { children: ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number; selectable?: boolean };

export function Title({ children, style }: TextProps) {
  return <Text style={[styles.title, style]} accessibilityRole="header">{children}</Text>;
}
export function H2({ children, style, numberOfLines }: TextProps) {
  return <Text style={[styles.h2, style]} accessibilityRole="header" numberOfLines={numberOfLines}>{children}</Text>;
}
export function Body({ children, style, numberOfLines, selectable }: TextProps) {
  return <Text style={[styles.body, style]} numberOfLines={numberOfLines} selectable={selectable}>{children}</Text>;
}
export function Muted({ children, style, numberOfLines }: TextProps) {
  return <Text style={[styles.muted, style]} numberOfLines={numberOfLines}>{children}</Text>;
}
export function Label({ children, style }: TextProps) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

export function Card({ children, style, onPress, accessibilityLabel }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string }) {
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={({ pressed }) => [styles.card, style, pressed && { opacity: 0.8 }]}>
      {children}
    </Pressable>
  );
}

export function Row({ children, style, gap = space.sm }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Wrap({ children, gap = space.sm, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap }, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  style,
  small,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const bg = variant === 'primary' ? c.white : variant === 'secondary' ? c.surface2 : 'transparent';
  const fg = variant === 'primary' ? c.black : variant === 'danger' ? c.danger : c.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        small && { minHeight: 38, paddingHorizontal: space.md },
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
        variant === 'danger' && { borderWidth: 1, borderColor: c.danger },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={small ? 16 : 18} color={fg} style={{ marginRight: 6 }} /> : null}
      <Text style={[styles.buttonText, { color: fg }, small && { fontSize: 14 }]}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, size = 40, active }: { icon: IconName; onPress: () => void; label: string; size?: number; active?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [
        { width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? c.white : c.surface2, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Ionicons name={icon} size={size * 0.48} color={active ? c.black : c.text} />
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, emoji, dot }: { label: string; selected?: boolean; onPress?: () => void; emoji?: string; dot?: string }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected: !!selected }}
      aria-selected={!!selected}
      style={({ pressed }) => [styles.chip, { backgroundColor: selected ? c.white : c.surface2, opacity: pressed ? 0.75 : 1 }]}
    >
      {dot ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: dot, marginRight: 6 }} /> : null}
      {emoji ? <Text style={{ fontSize: 14, marginRight: 5 }}>{emoji}</Text> : null}
      <Text style={[styles.chipText, { color: selected ? c.black : c.text }]}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string | number>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label?: string }) {
  return (
    <View style={styles.segmented} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const sel = o.value === value;
        return (
          <Pressable key={String(o.value)} onPress={() => onChange(o.value)} accessibilityRole="radio" accessibilityState={{ selected: sel }} aria-checked={sel} style={[styles.segment, sel && { backgroundColor: c.surface2 }]}>
            <Text style={{ color: sel ? c.text : c.muted, fontWeight: sel ? '700' : '500', fontSize: 14 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Field({ label, ...input }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Label>{label}</Label>
      <TextInput placeholderTextColor={c.faint} accessibilityLabel={label} {...input} style={[styles.input, input.multiline && { minHeight: 140, textAlignVertical: 'top', paddingTop: 12 }, input.style]} />
    </View>
  );
}

export function Stepper({ value, onChange, step, min, max, format }: { value: number; onChange: (v: number) => void; step: number; min: number; max: number; format: (v: number) => string }) {
  return (
    <Row gap={space.md}>
      <IconButton icon="remove" label="Decrease" onPress={() => onChange(Math.max(min, value - step))} />
      <Text style={styles.stepValue}>{format(value)}</Text>
      <IconButton icon="add" label="Increase" onPress={() => onChange(Math.min(max, value + step))} />
    </Row>
  );
}

export function Avatar({ emoji, size = 36 }: { emoji: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.line }}>
      <Text style={{ fontSize: size * 0.52 }}>{emoji}</Text>
    </View>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: c.surface2, overflow: 'hidden' }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}>
      <View style={{ width: `${pct * 100}%`, height: 6, borderRadius: 3, backgroundColor: c.white }} />
    </View>
  );
}

export function Banner({ children }: { children: ReactNode }) {
  return (
    <View style={styles.banner}>
      <Ionicons name="information-circle-outline" size={18} color={c.muted} />
      <Text style={[styles.muted, { flex: 1, fontSize: 13 }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  inner: { paddingHorizontal: space.lg, paddingTop: space.sm, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  title: { color: c.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  h2: { color: c.text, fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  body: { color: c.text, fontSize: 15, lineHeight: 21 },
  muted: { color: c.muted, fontSize: 14, lineHeight: 20 },
  label: { color: c.muted, fontSize: 12, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },
  card: { backgroundColor: c.surface, borderRadius: radius.xl, padding: space.lg, gap: space.md, borderWidth: StyleSheet.hairlineWidth, borderColor: c.line },
  button: { minHeight: 48, borderRadius: radius.md, paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 16, fontWeight: '700' },
  chip: { minHeight: 34, paddingHorizontal: 12, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center' },
  chipText: { fontSize: 14, fontWeight: '600' },
  segmented: { flexDirection: 'row', backgroundColor: c.surface, borderRadius: radius.md, padding: 3, borderWidth: StyleSheet.hairlineWidth, borderColor: c.line },
  segment: { flex: 1, minHeight: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  input: { backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, minHeight: 48, paddingHorizontal: space.md, color: c.text, fontSize: 16 },
  stepValue: { color: c.text, fontSize: 24, fontWeight: '800', minWidth: 90, textAlign: 'center' },
  statLabel: { color: c.faint, fontSize: 11, fontWeight: '600' },
  statValue: { color: c.text, fontSize: 18, fontWeight: '700' },
  banner: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: c.surface, borderRadius: radius.md, padding: space.md, borderWidth: StyleSheet.hairlineWidth, borderColor: c.line },
});

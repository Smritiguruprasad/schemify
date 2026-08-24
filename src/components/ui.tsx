import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radii, spacing } from '../theme';

export function Screen({
  children,
  scroll = true,
  padded = true,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const padStyle: ViewStyle = {
    paddingTop: insets.top + spacing.m,
    paddingBottom: insets.bottom + spacing.xl,
    paddingHorizontal: padded ? spacing.l : 0,
  };
  if (scroll) {
    return (
      <ScrollView style={[styles.flex1, { backgroundColor: colors.bg }]} contentContainerStyle={[padStyle, style]} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    );
  }
  return <View style={[styles.flex1, { backgroundColor: colors.bg }, padStyle, style]}>{children}</View>;
}

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ marginBottom: spacing.l }}>
      <Text style={styles.h1}>{title}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
    </View>
  );
}

export function Card({
  children,
  tone,
  style,
}: {
  children: React.ReactNode;
  tone?: 'ok' | 'warn' | 'danger' | 'info';
  style?: StyleProp<ViewStyle>;
}) {
  const borderColor =
    tone === 'ok' ? colors.okLight : tone === 'warn' ? colors.accent : tone === 'danger' ? colors.dangerLight : tone === 'info' ? colors.infoLight : colors.border;
  return <View style={[styles.card, { borderColor }, style]}>{children}</View>;
}

type Tone = 'ok' | 'fail' | 'warn' | 'info' | 'neutral';

export function Chip({ label, tone = 'neutral', icon }: { label: string; tone?: Tone; icon?: keyof typeof Ionicons.glyphMap }) {
  const bg = tone === 'ok' ? colors.okLight : tone === 'fail' ? colors.dangerLight : tone === 'warn' ? colors.warnLight : tone === 'info' ? colors.infoLight : colors.bg;
  const fg = tone === 'ok' ? colors.ok : tone === 'fail' ? colors.danger : tone === 'warn' ? colors.warn : tone === 'info' ? colors.info : colors.muted;
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={12} color={fg} /> : null}
      <Text style={[styles.chipText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btnPrimary,
        (disabled || loading) && { opacity: 0.55 },
        pressed && { opacity: 0.85 },
      ]}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>{label}</Text>}
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  icon,
}: {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.btnSecondary, pressed && { opacity: 0.8 }]}>
      {icon ? <Ionicons name={icon} size={16} color={colors.primary} /> : null}
      <Text style={styles.btnSecondaryText}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: spacing.l }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {hint && !error ? <Text style={styles.hint}>{hint}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function ThemedInput(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor={colors.faint}
      {...props}
      style={[styles.input, props.style as StyleProp<TextStyle>]}
    />
  );
}

export function SelectPills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.pillsWrap}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.pill, active && styles.pillActive]}
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <View>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={[styles.skeletonLine, { width: '60%' }]} />
          <View style={[styles.skeletonLine, { width: '90%' }]} />
          <View style={[styles.skeletonLine, { width: '40%' }]} />
        </View>
      ))}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
      <Ionicons name={icon} size={44} color={colors.faint} />
      <Text style={[styles.h2, { marginTop: spacing.m, textAlign: 'center' }]}>{title}</Text>
      <Text style={[styles.sub, { textAlign: 'center', marginTop: spacing.s }]}>{body}</Text>
      {action ? <View style={{ marginTop: spacing.l }}>{action}</View> : null}
    </Card>
  );
}

export function StatusBadge({ status, label }: { status: string; label: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    submitted: { bg: colors.infoLight, fg: colors.info },
    acknowledged: { bg: colors.primaryLight, fg: colors.primary },
    under_review: { bg: colors.warnLight, fg: colors.warn },
    sanctioned: { bg: colors.okLight, fg: colors.ok },
    rejected: { bg: colors.dangerLight, fg: colors.danger },
  };
  const c = map[status] ?? { bg: colors.bg, fg: colors.muted };
  return (
    <View style={[styles.chip, { backgroundColor: c.bg }]}>
      <Text style={[styles.chipText, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.m }} />;
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  h1: { fontSize: font.title, fontWeight: '800', color: colors.ink },
  h2: { fontSize: font.h2, fontWeight: '700', color: colors.ink },
  sub: { fontSize: font.small, color: colors.muted, marginTop: spacing.xs, lineHeight: 19 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.l,
    borderWidth: 1,
    padding: spacing.l,
    marginBottom: spacing.m,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { fontSize: font.tiny, fontWeight: '700' },
  btnPrimary: {
    backgroundColor: colors.primary,
    borderRadius: radii.m,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: font.body },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radii.m,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 13,
    minHeight: 48,
    backgroundColor: colors.card,
  },
  btnSecondaryText: { color: colors.primary, fontWeight: '700', fontSize: font.body },
  fieldLabel: { fontSize: font.small, fontWeight: '700', color: colors.ink, marginBottom: spacing.s },
  hint: { fontSize: font.tiny, color: colors.faint, marginTop: spacing.xs },
  error: { fontSize: font.tiny, color: colors.danger, marginTop: spacing.xs, fontWeight: '600' },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.m,
    paddingHorizontal: spacing.m,
    paddingVertical: 12,
    fontSize: font.body,
    color: colors.ink,
  },
  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
  pill: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { fontSize: font.small, color: colors.ink, fontWeight: '600' },
  pillTextActive: { color: '#fff' },
  skeletonCard: {
    backgroundColor: colors.card,
    borderRadius: radii.l,
    padding: spacing.l,
    marginBottom: spacing.m,
    gap: spacing.s,
  },
  skeletonLine: { height: 12, borderRadius: 6, backgroundColor: '#EDF1F0' },
});

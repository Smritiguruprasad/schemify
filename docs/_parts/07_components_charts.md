
### `src/components/charts.tsx` — SVG charts (zero chart dependencies)

Built directly on `react-native-svg` so everything runs inside Expo Go:

- **`DonutChart`** — principal-vs-interest ring on the calculator; EMI in the
  center, percentage legend beside it.
- **`MiniBars`** — labeled bar chart reused by Admin analytics.

```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Rect, Text as SvgText } from 'react-native-svg';
import { colors, font, spacing } from '../theme';

export function DonutChart({
  principal,
  interest,
  centerLabel,
  caption,
}: {
  principal: number;
  interest: number;
  centerLabel: string;
  caption: string;
}) {
  const total = Math.max(1, principal + interest);
  const frac = principal / total;
  const R = 54;
  const C = 2 * Math.PI * R;

  return (
    <View style={styles.donutWrap}>
      <View>
        <Svg width={140} height={140}>
          <Circle cx="70" cy="70" r={R} stroke={colors.accentLight} strokeWidth={16} fill="none" />
          <Circle
            cx="70"
            cy="70"
            r={R}
            stroke={colors.primary}
            strokeWidth={16}
            fill="none"
            strokeDasharray={`${C * frac} ${C}`}
            strokeLinecap="round"
            transform="rotate(-90 70 70)"
          />
        </Svg>
        <View style={styles.donutCenter} pointerEvents="none">
          <Text style={styles.donutValue}>{centerLabel}</Text>
        </View>
      </View>
      <View style={styles.legend}>
        <LegendDot color={colors.primary} label={`Principal · ${Math.round(frac * 100)}%`} />
        <LegendDot color={colors.accent} label={`Interest · ${Math.round((1 - frac) * 100)}%`} />
        <Text style={styles.caption}>{caption}</Text>
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

export function MiniBars({ data }: { data: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const W = 300;
  const H = 120;
  const gap = 18;
  const bw = (W - gap * (data.length - 1)) / Math.max(1, data.length);
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={W} height={H + 26}>
        {data.map((d, i) => {
          const h = Math.round((d.value / max) * H);
          const x = i * (bw + gap);
          return (
            <React.Fragment key={d.label}>
              <Rect x={x} y={H - h + 8} width={bw} height={h} rx={5} fill={d.color ?? colors.primary} />
              <SvgText x={x + bw / 2} y={H + 20} textAnchor="middle" fontSize={10} fill={colors.muted}>
                {d.label}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  donutWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  donutCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutValue: { fontSize: font.h2 ?? 18, fontWeight: '800', color: colors.ink },
  legend: { flex: 1, gap: spacing.s },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: font.small, color: colors.ink, fontWeight: '600' },
  caption: { fontSize: font.tiny, color: colors.faint, marginTop: spacing.xs },
});
```

### `src/components/Timeline.tsx` — vertical status history

Renders an application's event list as a connected rail: icon per status
(paper-plane → mail-open → search → checkmark-circle), latest event highlighted
in primary color, older ones muted. Dates render locale-aware via `formatDate`.

```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ApplicationStatus, Lang, TimelineEvent } from '../engine/types';
import { colors, font, spacing } from '../theme';
import { formatDate } from '../utils';

const ICONS: Record<ApplicationStatus, keyof typeof Ionicons.glyphMap> = {
  submitted: 'paper-plane',
  acknowledged: 'mail-open',
  under_review: 'search',
  sanctioned: 'checkmark-circle',
  rejected: 'close-circle',
};

export function Timeline({
  events,
  lang,
  statusLabel,
}: {
  events: TimelineEvent[];
  lang: Lang;
  statusLabel: (s: ApplicationStatus) => string;
}) {
  return (
    <View>
      {events.map((e, i) => {
        const last = i === events.length - 1;
        return (
          <View key={`${e.status}-${i}`} style={styles.row}>
            <View style={styles.railWrap}>
              <Ionicons name={ICONS[e.status]} size={22} color={last ? colors.primary : colors.faint} />
              {!last ? <View style={styles.rail} /> : null}
            </View>
            <View style={styles.body}>
              <Text style={[styles.status, !last && { color: colors.muted }]}>
                {statusLabel(e.status)}
              </Text>
              <Text style={styles.date}>{formatDate(e.at, lang)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.m, paddingBottom: spacing.l },
  railWrap: { alignItems: 'center' },
  rail: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 2 },
  body: { paddingBottom: 2 },
  status: { fontSize: font.body, fontWeight: '700', color: colors.ink },
  date: { fontSize: font.tiny, color: colors.faint, marginTop: 2 },
});
```

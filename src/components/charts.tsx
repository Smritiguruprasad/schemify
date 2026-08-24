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
  donutCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  donutValue: { fontSize: font.h2, fontWeight: '800', color: colors.ink },
  legend: { flex: 1, gap: spacing.s },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: font.small, color: colors.ink, fontWeight: '600' },
  caption: { fontSize: font.tiny, color: colors.faint, marginTop: spacing.xs },
});

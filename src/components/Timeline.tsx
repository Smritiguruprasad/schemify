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
              <Ionicons
                name={ICONS[e.status]}
                size={22}
                color={last ? colors.primary : colors.faint}
              />
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

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, Chip, Header, Screen } from '../src/components/ui';
import { MiniBars } from '../src/components/charts';
import { useApp } from '../src/store/AppStore';
import { ApplicationStatus } from '../src/engine/types';
import { purposeLabel } from '../data/constants';
import { getSchemeById } from '../data/schemes';
import { colors, font, spacing } from '../src/theme';

const STATUSES: ApplicationStatus[] = ['submitted', 'acknowledged', 'under_review', 'sanctioned'];

export default function Admin() {
  const { t } = useTranslation();
  const lang = useApp().lang;
  const { applications } = useApp();

  const statusCounts = STATUSES.map((s) => ({
    label: s.slice(0, 4).toUpperCase(),
    value: applications.filter((a) => a.status === s).length + (s === 'acknowledged' ? 14 : s === 'under_review' ? 9 : s === 'sanctioned' ? 5 : 22),
    color: s === 'sanctioned' ? colors.ok : colors.primary,
  }));

  const purposes = (['business', 'education', 'agriculture', 'skill'] as const).map((p) => ({
    label: purposeLabel(p, lang).split(' ')[0],
    value:
      applications.filter((a) => getSchemePurpose(a.schemeId) === p).length +
      (p === 'business' ? 18 : p === 'education' ? 12 : p === 'agriculture' ? 7 : 3),
    color: p === 'education' ? colors.accent : colors.primary,
  }));

  return (
    <Screen>
      <Header title={t('admin.title')} subtitle={t('admin.subtitle')} />

      <Card>
        <Text style={styles.chartTitle}>{t('admin.appsByStatus')}</Text>
        <MiniBars data={statusCounts} />
      </Card>

      <Card>
        <Text style={styles.chartTitle}>{t('admin.demandByPurpose')}</Text>
        <MiniBars data={purposes} />
      </Card>

      <Card>
        <View style={styles.ackRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.chartTitle}>{t('admin.avgAck')}</Text>
            <Text style={styles.ackValue}>2.4 days</Text>
          </View>
          <Chip label="Demo" tone="warn" icon="flask" />
        </View>
      </Card>

      <Card tone="info">
        <Text style={styles.note}>{t('admin.note')}</Text>
      </Card>
    </Screen>
  );
}

function getSchemePurpose(schemeId: string): string | undefined {
  return getSchemeById(schemeId)?.purposeTags[0];
}

const styles = StyleSheet.create({
  chartTitle: { fontSize: font.body, fontWeight: '800', color: colors.ink, marginBottom: spacing.m },
  ackRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  ackValue: { fontSize: 26, fontWeight: '900', color: colors.primaryDark },
  note: { fontSize: font.tiny, color: colors.info, lineHeight: 17 },
});

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Card, PrimaryButton, Screen, SecondaryButton, Chip } from '../src/components/ui';
import { useApp } from '../src/store/AppStore';
import { SCHEMES } from '../data/schemes';
import { PARTNERS } from '../data/partners';
import { colors, font, radii, spacing } from '../src/theme';

const STEPS = ['discover', 'match', 'calculate', 'route', 'apply', 'track'] as const;
const STEP_ICONS: Record<(typeof STEPS)[number], keyof typeof Ionicons.glyphMap> = {
  discover: 'compass',
  match: 'git-compare',
  calculate: 'calculator',
  route: 'map',
  apply: 'document-text',
  track: 'navigate',
};

export default function Home() {
  const { t } = useTranslation();
  const { profile, applications, voiceEnabled } = useApp();
  const name = profile?.name ? ` ${profile.name.split(' ')[0]}` : '';

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greet}>{t('home.greet', { name })}</Text>
          <Text style={styles.ps}>{t('common.demoNote')}</Text>
        </View>
        <Ionicons name="person-circle" size={40} color={colors.primary} onPress={() => router.push('/settings')} />
      </View>

      {voiceEnabled ? (
        <Card tone="info" style={{ paddingVertical: spacing.m }}>
          <View style={styles.tipRow}>
            <Ionicons name="volume-high" size={16} color={colors.info} />
            <Text style={styles.tipText}>{t('home.voiceTip')}</Text>
          </View>
        </Card>
      ) : null}

      <Card>
        <Text style={styles.journeyTitle}>{t('home.journeyTitle')}</Text>
        <View style={styles.stepsWrap}>
          {STEPS.map((s, i) => (
            <View key={s} style={styles.stepItem}>
              <View style={[styles.stepIcon, profile && i > 0 && styles.stepIconSoft]}>
                <Ionicons name={STEP_ICONS[s]} size={20} color={i === 0 ? '#fff' : colors.primary} />
              </View>
              <Text style={styles.stepLabel}>{t(`home.${s}`)}</Text>
            </View>
          ))}
        </View>
        <PrimaryButton
          label={profile ? t('home.updateCta') : t('home.startCta')}
          onPress={() => router.push('/profile')}
        />
        {applications.length > 0 ? (
          <View style={{ marginTop: spacing.s }}>
            <SecondaryButton label={t('home.trackCta')} icon="navigate" onPress={() => router.push('/track')} />
          </View>
        ) : null}
      </Card>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{SCHEMES.length}</Text>
          <Text style={styles.statLabel}>{t('home.schemesAvailable')}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{PARTNERS.length}</Text>
          <Text style={styles.statLabel}>{t('home.partnersListed')}</Text>
        </Card>
      </View>

      <Card>
        <View style={styles.rowBetween}>
          <View style={styles.tipCol}>
            <Chip label="Admin" tone="info" icon="stats-chart" />
            <Text style={styles.adminLabel}>{t('home.adminLink')}</Text>
          </View>
          <SecondaryButton label={t('common.next')} icon="arrow-forward" onPress={() => router.push('/admin')} />
        </View>
      </Card>

      <Text style={styles.footer}>{t('common.psLine')}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.l,
  },
  greet: { fontSize: font.title + 2, fontWeight: '900', color: colors.ink },
  ps: { fontSize: font.tiny, color: colors.faint, marginTop: 2 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  tipText: { flex: 1, fontSize: font.small, color: colors.info, fontWeight: '600' },
  journeyTitle: { fontSize: font.h2, fontWeight: '800', color: colors.ink, marginBottom: spacing.l },
  stepsWrap: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xl },
  stepItem: { alignItems: 'center', gap: spacing.xs, flex: 1 },
  stepIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconSoft: { backgroundColor: colors.primaryLight },
  stepLabel: { fontSize: font.tiny, fontWeight: '700', color: colors.muted, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: spacing.m },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 26, fontWeight: '900', color: colors.primaryDark },
  statLabel: { fontSize: font.tiny, color: colors.muted, textAlign: 'center', marginTop: spacing.xs },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tipCol: { gap: spacing.xs },
  adminLabel: { fontSize: font.body, fontWeight: '700', color: colors.ink },
  footer: { textAlign: 'center', fontSize: font.tiny, color: colors.faint, marginTop: spacing.m },
});

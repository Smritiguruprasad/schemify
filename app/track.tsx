import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import {
  Card,
  Chip,
  EmptyState,
  Header,
  PrimaryButton,
  Screen,
  SecondaryButton,
  StatusBadge,
} from '../src/components/ui';
import { Timeline } from '../src/components/Timeline';
import { useApp } from '../src/store/AppStore';
import { getSchemeById } from '../data/schemes';
import { getPartnerById } from '../data/partners';
import { formatDate, lt } from '../src/utils';
import { colors, font, spacing } from '../src/theme';

export default function Track() {
  const { t } = useTranslation();
  const lang = useApp().lang;
  const { applications, advanceApplication } = useApp();

  if (applications.length === 0) {
    return (
      <Screen>
        <Header title={t('track.title')} />
        <EmptyState
          icon="navigate"
          title={t('track.emptyTitle')}
          body={t('track.emptyBody')}
          action={<PrimaryButton label={t('home.startCta')} onPress={() => router.push('/profile')} />}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Header title={t('track.title')} />

      {applications.map((app) => {
        const scheme = getSchemeById(app.schemeId);
        const partner = getPartnerById(app.partnerId);
        return (
          <Card key={app.id}>
            <View style={styles.rowBetween}>
              <Chip label={`${t('track.idLabel')}: ${app.id}`} tone="info" icon="barcode" />
              <StatusBadge status={app.status} label={t(`status.${app.status}`)} />
            </View>
            <Text style={styles.appScheme}>{scheme ? lt(scheme.name, lang) : app.schemeId}</Text>
            <Text style={styles.appPartner}>{partner ? partner.name : app.partnerId}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="calendar" size={12} color={colors.faint} />
              <Text style={styles.meta}>
                {t('track.updated')}: {formatDate(app.updatedAt, lang)}
              </Text>
              {app.docsPending.length > 0 ? (
                <Text style={[styles.meta, styles.pendingMeta]}>· {t('track.docsPending', { n: app.docsPending.length })}</Text>
              ) : null}
            </View>

            <View style={styles.timelineBox}>
              <Text style={styles.timelineTitle}>{t('track.timelineTitle')}</Text>
              <Timeline
                events={app.timeline}
                lang={lang}
                statusLabel={(s) => t(`status.${s}`)}
              />
            </View>

            {app.status !== 'sanctioned' && app.status !== 'rejected' ? (
              <SecondaryButton
                label={t('track.simulate')}
                icon="play-forward"
                onPress={() => advanceApplication(app.id)}
              />
            ) : null}
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.s },
  appScheme: { fontSize: font.h2, fontWeight: '800', color: colors.ink, marginTop: spacing.m },
  appPartner: { fontSize: font.small, color: colors.muted, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center', marginTop: spacing.s },
  meta: { fontSize: font.tiny, color: colors.faint },
  pendingMeta: { color: colors.warn, fontWeight: '700' },
  timelineBox: {
    backgroundColor: colors.bg,
    borderRadius: 10,
    padding: spacing.m,
    marginTop: spacing.m,
    marginBottom: spacing.m,
  },
  timelineTitle: { fontSize: font.tiny, fontWeight: '800', color: colors.ink, marginBottom: spacing.m },
});

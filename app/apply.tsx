import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import {
  Card,
  Header,
  PrimaryButton,
  Screen,
} from '../src/components/ui';
import { useApp } from '../src/store/AppStore';
import { getSchemeById } from '../data/schemes';
import { getPartnerById } from '../data/partners';
import { docLabel } from '../data/constants';
import { formatINR, lt } from '../src/utils';
import { colors, font, spacing } from '../src/theme';

export default function Apply() {
  const { t } = useTranslation();
  const lang = useApp().lang;
  const { schemeId, partnerId } = useLocalSearchParams<{ schemeId?: string; partnerId?: string }>();
  const { profile, addApplication } = useApp();

  const scheme = schemeId ? getSchemeById(schemeId) : undefined;
  const partner = partnerId ? getPartnerById(partnerId) : undefined;

  const docs = useMemo(() => scheme?.requiredDocs ?? [], [scheme]);
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(docs.map((d) => [d, d !== 'caste_certificate' && d !== 'aadhaar']))
  );
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!scheme || !partner || !profile) {
    return (
      <Screen>
        <Header title={t('apply.title')} />
        <Card>
          <Text style={styles.bodyText}>{t('match.emptyBody')}</Text>
        </Card>
      </Screen>
    );
  }

  const pendingCount = docs.filter((d) => !checked[d]).length;

  const submit = async () => {
    if (!consent) return;
    setSubmitting(true);
    const app = await addApplication({
      schemeId: scheme.id,
      partnerId: partner.id,
      docsPending: docs.filter((d) => !checked[d]),
    });
    setSubmitting(false);
    Alert.alert(
      t('apply.submitted'),
      `${app.id}\n${lt(scheme.name, lang)} → ${partner.name}`,
      [{ text: t('apply.trackNow'), onPress: () => router.replace('/track') }]
    );
  };

  return (
    <Screen>
      <Header title={t('apply.title')} subtitle={`${lt(scheme.name, lang)} → ${partner.name}`} />

      <Card tone="info" style={{ paddingVertical: spacing.m }}>
        <View style={styles.sumRow}>
          <Sum label={t('calc.eligibleLoan')} value={formatINR(Math.min(Math.round((profile.projectCost * scheme.fundingPercent) / 100), scheme.maxAssistance))} />
          <Sum label={t('profile.district')} value={profile.district} />
        </View>
      </Card>

      <Card>
        <View style={styles.checkTitleRow}>
          <Ionicons name="documents" size={16} color={colors.primary} />
          <Text style={styles.checkTitle}>{t('apply.checklist')}</Text>
        </View>
        {docs.map((d) => (
          <Pressable key={d} style={styles.docRow} onPress={() => setChecked((c) => ({ ...c, [d]: !c[d] }))}>
            <Ionicons
              name={checked[d] ? 'checkbox' : 'square-outline'}
              size={22}
              color={checked[d] ? colors.ok : colors.faint}
            />
            <Text style={[styles.docText, checked[d] && styles.docDone]}>{docLabel(d, lang)}</Text>
            {d === 'caste_certificate' && profile.scStatus === 'pending' ? (
              <Text style={styles.pendingTag}>SC</Text>
            ) : null}
          </Pressable>
        ))}
        {pendingCount > 0 ? (
          <View style={styles.warnBox}>
            <Ionicons name="warning" size={14} color={colors.warn} />
            <Text style={styles.warnText}>{t('apply.warnPending', { n: pendingCount })}</Text>
          </View>
        ) : null}
      </Card>

      <Card tone={consent ? 'ok' : undefined}>
        <Text style={styles.consentTitle}>{t('apply.consentTitle')}</Text>
        <Text style={styles.consentBody}>{t('apply.consentBody')}</Text>
        <Pressable style={styles.docRow} onPress={() => setConsent(!consent)}>
          <Ionicons
            name={consent ? 'checkbox' : 'square-outline'}
            size={22}
            color={consent ? colors.ok : colors.faint}
          />
          <Text style={[styles.docText, consent && styles.docDone]}>{t('apply.consentCheck')}</Text>
        </Pressable>
      </Card>

      <PrimaryButton
        label={t('apply.submit')}
        loading={submitting}
        disabled={!consent}
        onPress={submit}
      />
    </Screen>
  );
}

function Sum({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.sumLabel}>{label}</Text>
      <Text style={styles.sumValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sumRow: { flexDirection: 'row', gap: spacing.l },
  sumLabel: { fontSize: font.tiny, color: colors.info, fontWeight: '700' },
  sumValue: { fontSize: font.h2, fontWeight: '900', color: colors.primaryDark, marginTop: 2 },
  checkTitleRow: { flexDirection: 'row', gap: spacing.s, alignItems: 'center', marginBottom: spacing.m },
  checkTitle: { fontSize: font.h2, fontWeight: '800', color: colors.ink },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, paddingVertical: spacing.s },
  docText: { flex: 1, fontSize: font.small, fontWeight: '600', color: colors.ink },
  docDone: { textDecorationLine: 'line-through', color: colors.faint },
  pendingTag: {
    fontSize: font.tiny,
    fontWeight: '800',
    color: colors.warn,
    backgroundColor: colors.warnLight,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  warnBox: {
    flexDirection: 'row',
    gap: spacing.s,
    alignItems: 'center',
    backgroundColor: colors.warnLight,
    borderRadius: 10,
    padding: spacing.s,
    marginTop: spacing.s,
  },
  warnText: { flex: 1, fontSize: font.tiny, color: colors.warn, fontWeight: '700' },
  consentTitle: { fontSize: font.body, fontWeight: '800', color: colors.ink, marginBottom: spacing.xs },
  consentBody: { fontSize: font.small, color: colors.muted, lineHeight: 19, marginBottom: spacing.s },
  bodyText: { fontSize: font.small, color: colors.muted },
});

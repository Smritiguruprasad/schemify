
### `app/apply.tsx` — checklist + consent + submission

Turns the match into a tracked application:

- Checklist generated from `scheme.requiredDocs` with per-item checkboxes and a
  live "N pending" counter; submitting with pending docs is allowed (real life)
  but warned about explicitly.
- **Consent is a hard gate**: submission stays disabled until the user opts in
  to sharing their profile summary with the selected partner — consent-first
  architecture, and the screen states plainly that FinSetu does not sanction loans.
- Submit calls the store's `addApplication` (mints tracking ID `FS-2026-XXXXX`,
  stamps timeline), then routes to Track.

```tsx
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import {
  Card,
  Chip,
  Header,
  PrimaryButton,
  Screen,
} from '../src/components/ui';
import { useApp } from '../src/store/AppStore';
import { computeLoanPlan } from '../src/engine/calc';
import { getSchemeById } from '../data/schemes';
import { getPartnerById } from '../data/partners';
import { docLabel } from '../data/constants';
import { formatINR } from '../src/utils';
import { colors, font, radii, spacing } from '../src/theme';

export default function Apply() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ scheme?: string; partner?: string }>();
  const schemeId = String(params.scheme ?? '');
  const partnerId = String(params.partner ?? '');
  const scheme = getSchemeById(schemeId);
  const partner = getPartnerById(partnerId);
  const { lang, profile, addApplication } = useApp();

  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const docs = scheme?.requiredDocs ?? [];
  const pendingCount = useMemo(() => docs.filter((d) => !checked[d]).length, [docs, checked]);
  const plan = useMemo(
    () => (scheme && profile ? computeLoanPlan(scheme, profile.projectCost, false) : null),
    [scheme, profile]
  );

  if (!scheme || !partner || !profile) {
    return (
      <Screen>
        <Header title={t('apply.title')} />
        <PrimaryButton label={t('common.back')} onPress={() => router.back()} />
      </Screen>
    );
  }

  const submit = async () => {
    setSubmitting(true);
    await addApplication({
      schemeId: scheme.id,
      partnerId: partner.id,
      requestedAmount: plan?.eligibleLoan ?? profile.projectCost,
      purpose: profile.purpose,
      district: profile.district,
      docsPending: pendingCount,
    });
    setSubmitting(false);
    Alert.alert(t('apply.submitted'), '', [
      { text: t('apply.trackNow'), onPress: () => router.replace('/track') },
    ]);
  };

  return (
    <Screen>
      <Header title={t('apply.title')} subtitle={`${scheme.name[lang]} → ${partner.name}`} />

      <Card>
        <View style={styles.sumRow}>
          <Chip label={scheme.code} tone="info" icon="ribbon" />
          <Chip label={partner.type} tone="neutral" icon="business" />
        </View>
        <Text style={styles.amountLabel}>{t('calc.eligibleLoan')}</Text>
        <Text style={styles.amount}>{formatINR(plan?.eligibleLoan ?? 0)}</Text>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{t('apply.checklist')}</Text>
        {docs.map((d) => (
          <Pressable
            key={d}
            style={styles.docRow}
            onPress={() => setChecked((c) => ({ ...c, [d]: !c[d] }))}
          >
            <Ionicons
              name={checked[d] ? 'checkbox' : 'square-outline'}
              size={22}
              color={checked[d] ? colors.ok : colors.faint}
            />
            <Text style={[styles.docText, checked[d] && styles.docDone]}>{docLabel(d, lang)}</Text>
          </Pressable>
        ))}
        {pendingCount > 0 ? (
          <Card tone="warn" style={{ marginTop: spacing.m, marginBottom: 0 }}>
            <Text style={styles.warn}>{t('apply.warnPending', { n: pendingCount })}</Text>
          </Card>
        ) : null}
      </Card>

      <Card tone="info">
        <Text style={styles.consentTitle}>{t('apply.consentTitle')}</Text>
        <Text style={styles.consentBody}>{t('apply.consentBody')}</Text>
        <View style={styles.consentRow}>
          <Switch value={consent} onValueChange={setConsent} trackColor={{ true: colors.primary }} />
          <Text style={styles.consentLabel}>{t('apply.consentCheck')}</Text>
        </View>
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

const styles = StyleSheet.create({
  sumRow: { flexDirection: 'row', gap: spacing.s, marginBottom: spacing.m },
  amountLabel: { fontSize: font.tiny, fontWeight: '700', color: colors.faint },
  amount: { fontSize: font.title, fontWeight: '900', color: colors.primaryDark },
  sectionTitle: { fontSize: font.body, fontWeight: '800', color: colors.ink, marginBottom: spacing.m },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, paddingVertical: spacing.s },
  docText: { flex: 1, fontSize: font.small, color: colors.ink, fontWeight: '600' },
  docDone: { color: colors.faint, textDecorationLine: 'line-through' },
  warn: { fontSize: font.tiny, color: colors.warn, fontWeight: '700' },
  consentTitle: { fontSize: font.body, fontWeight: '800', color: colors.info },
  consentBody: { fontSize: font.tiny, color: colors.muted, marginTop: spacing.xs, lineHeight: 17 },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, marginTop: spacing.l },
  consentLabel: { flex: 1, fontSize: font.small, fontWeight: '700', color: colors.ink },
});
```


### `app/calc.tsx` — affordability calculator

Receives `?scheme=<id>` from Match. The cost input is editable (defaults to the
profile's project cost) and moratorium toggles on by default when the scheme has
one. All math comes from `computeLoanPlan` — the UI never duplicates formulas.
The donut chart shows principal vs interest with EMI in the center; explicit
notes explain what happens during moratorium, plus an honest disclaimer that
final figures come from the channel partner.

```tsx
import React, { useMemo, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Card, Field, Header, PrimaryButton, Screen, ThemedInput } from '../src/components/ui';
import { DonutChart } from '../src/components/charts';
import { useApp } from '../src/store/AppStore';
import { computeLoanPlan } from '../src/engine/calc';
import { getSchemeById } from '../data/schemes';
import { formatINR } from '../src/utils';
import { colors, font, radii, spacing } from '../src/theme';

export default function Calc() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ scheme?: string }>();
  const scheme = getSchemeById(String(params.scheme ?? ''));
  const { profile } = useApp();

  const [costStr, setCostStr] = useState(() =>
    String(profile?.projectCost ?? scheme?.maxAssistance ?? 100000)
  );
  const [mora, setMora] = useState(() => (scheme?.moratoriumMonths ?? 0) > 0);

  const cost = Number(costStr.replace(/[^0-9]/g, '')) || 0;

  const plan = useMemo(
    () => (scheme ? computeLoanPlan(scheme, cost, mora) : null),
    [scheme, cost, mora]
  );

  if (!scheme || !plan) {
    return (
      <Screen>
        <Header title={t('calc.title')} />
        <Card>
          <Text style={styles.missing}>{t('match.emptyBody')}</Text>
        </Card>
        <PrimaryButton label={t('common.back')} onPress={() => router.back()} />
      </Screen>
    );
  }

  const hasMora = scheme.moratoriumMonths > 0;

  return (
    <Screen>
      <Header title={t('calc.title')} subtitle={`${scheme.code} · ${formatINR(scheme.maxAssistance)} max`} />

      <Field label={t('calc.costLabel')}>
        <ThemedInput value={costStr} onChangeText={setCostStr} keyboardType="number-pad" />
      </Field>

      {hasMora ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.toggleLabel}>{t('calc.moratoriumToggle')}</Text>
          <Switch value={mora} onValueChange={setMora} trackColor={{ true: colors.primary }} />
        </Card>
      ) : null}

      <Card tone="info">
        <DonutChart
          principal={plan.eligibleLoan}
          interest={plan.totalInterest}
          centerLabel={formatINR(plan.emi)}
          caption={t('calc.monthsNote', { m: scheme.repaymentMonths, r: scheme.interestRate })}
        />
      </Card>

      <View style={styles.grid}>
        <StatBox label={t('calc.eligibleLoan')} value={formatINR(plan.eligibleLoan)} icon="cash" />
        <StatBox label={t('calc.contribution')} value={formatINR(plan.contribution)} icon="wallet" />
        <StatBox label={t('calc.totalInterest')} value={formatINR(plan.totalInterest)} icon="trending-up" />
        <StatBox label={t('calc.totalPayable')} value={formatINR(plan.totalPayable)} icon="calculator" dark />
      </View>

      {mora && hasMora ? (
        <Card tone="warn">
          <Text style={styles.noteTitle}>{t('calc.principalAfterMoratorium')}</Text>
          <Text style={styles.noteValue}>{formatINR(plan.principalAfterMoratorium ?? plan.eligibleLoan)}</Text>
          <Text style={styles.noteBody}>
            {t('calc.moratoriumNote', {
              amt: formatINR((plan.principalAfterMoratorium ?? plan.eligibleLoan) - plan.eligibleLoan),
            })}
          </Text>
        </Card>
      ) : null}

      <Card>
        <View style={styles.discRow}>
          <Ionicons name="information-circle" size={16} color={colors.faint} />
          <Text style={styles.disclaimer}>{t('calc.disclaimer')}</Text>
        </View>
      </Card>

      <PrimaryButton label={t('calc.cta')} onPress={() => router.push(`/partners?scheme=${scheme.id}`)} />
    </Screen>
  );
}

function StatBox({
  label,
  value,
  icon,
  dark,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  dark?: boolean;
}) {
  return (
    <View style={[styles.statBox, dark && styles.statBoxDark]}>
      <Ionicons name={icon} size={16} color={dark ? '#fff' : colors.primary} />
      <Text style={[styles.statLabel, dark && { color: '#D7E8E3' }]}>{label}</Text>
      <Text style={[styles.statValue, dark && { color: '#fff' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleLabel: { flex: 1, fontSize: font.small, fontWeight: '700', color: colors.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.m },
  statBox: {
    width: '47.5%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.l,
    padding: spacing.l,
    gap: spacing.xs,
  },
  statBoxDark: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  statLabel: { fontSize: font.tiny, fontWeight: '700', color: colors.faint },
  statValue: { fontSize: font.h2, fontWeight: '800', color: colors.primaryDark },
  noteTitle: { fontSize: font.tiny, fontWeight: '800', color: colors.warn },
  noteValue: { fontSize: font.body, fontWeight: '800', color: colors.ink, marginTop: 2 },
  noteBody: { fontSize: font.tiny, color: colors.warn, marginTop: spacing.xs, lineHeight: 17 },
  discRow: { flexDirection: 'row', gap: spacing.s, alignItems: 'flex-start' },
  disclaimer: { flex: 1, fontSize: font.tiny, color: colors.faint, lineHeight: 17 },
  missing: { fontSize: font.small, color: colors.muted, marginBottom: spacing.l },
});
```

import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import {
  Card,
  Field,
  Header,
  PrimaryButton,
  Screen,
  ThemedInput,
} from '../src/components/ui';
import { DonutChart } from '../src/components/charts';
import { useApp } from '../src/store/AppStore';
import { computeLoanPlan } from '../src/engine/calc';
import { getSchemeById } from '../data/schemes';
import { EmptyState } from '../src/components/ui';
import { amountInWordsIndian, formatINR, lt } from '../src/utils';
import { colors, font, spacing } from '../src/theme';

export default function Calc() {
  const { t } = useTranslation();
  const lang = useApp().lang;
  const { schemeId } = useLocalSearchParams<{ schemeId?: string }>();
  const { profile } = useApp();
  const scheme = schemeId ? getSchemeById(schemeId) : undefined;

  const [costText, setCostText] = useState<string>(profile ? String(profile.projectCost) : '');
  const [moratoriumOn, setMoratoriumOn] = useState<boolean>(true);

  const cost = Number(costText.replace(/[^0-9.]/g, '')) || 0;
  const plan = useMemo(
    () => (scheme && cost > 0 ? computeLoanPlan(scheme, cost, moratoriumOn) : null),
    [scheme, cost, moratoriumOn]
  );

  if (!scheme || !profile) {
    return (
      <Screen>
        <Header title={t('calc.title')} />
        <EmptyState icon="calculator" title={t('match.emptyTitle')} body={t('match.emptyBody')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Header title={t('calc.title')} subtitle={lt(scheme.name, lang)} />

      <Field label={t('calc.costLabel')}>
        <ThemedInput
          value={costText ? formatINR(cost) : ''}
          onChangeText={setCostText}
          keyboardType="number-pad"
        />
        <Text style={styles.words}>{cost > 0 ? amountInWordsIndian(cost) : ''}</Text>
      </Field>

      {scheme.moratoriumMonths > 0 ? (
        <Card style={{ paddingVertical: spacing.m }}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: spacing.m }}>
              <Text style={styles.switchLabel}>{t('calc.moratoriumToggle')}</Text>
              <Text style={styles.switchSub}>{scheme.moratoriumMonths} months</Text>
            </View>
            <Switch
              value={moratoriumOn}
              onValueChange={setMoratoriumOn}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>
        </Card>
      ) : null}

      {plan ? (
        <>
          <Card>
            <DonutChart
              principal={plan.principal}
              interest={plan.totalInterest}
              centerLabel={formatINR(plan.emi)}
              caption={`${t('calc.monthsNote', { m: plan.months, r: plan.ratePct })}`}
            />
          </Card>

          <Card>
            <Row icon="hand-left" label={t('calc.eligibleLoan')} value={formatINR(plan.eligibleLoan)} strong />
            <Row icon="wallet" label={t('calc.contribution')} value={formatINR(plan.contribution)} />
            {plan.moratoriumApplied ? (
              <>
                <Row icon="hourglass" label={t('calc.principalAfterMoratorium')} value={formatINR(plan.principal)} />
                <Text style={styles.mortNote}>
                  {t('calc.moratoriumNote', { amt: formatINR(plan.moratoriumInterest) })}
                </Text>
              </>
            ) : null}
            <View style={styles.divider} />
            <Row icon="trending-up" label={t('calc.totalInterest')} value={formatINR(plan.totalInterest)} />
            <Row icon="receipt" label={t('calc.totalPayable')} value={formatINR(plan.totalPayable)} strong />
          </Card>

          <Card tone="info">
            <Text style={styles.disclaimer}>{t('calc.disclaimer')}</Text>
          </Card>

          <PrimaryButton
            label={t('calc.cta')}
            onPress={() => router.push({ pathname: '/partners', params: { schemeId: scheme.id } })}
          />
        </>
      ) : (
        <Card>
          <Text style={styles.enterCost}>{t('profile.errNum')}</Text>
        </Card>
      )}
    </Screen>
  );
}

function Row({
  icon,
  label,
  value,
  strong,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={[styles.rowLabel, strong && styles.strong]}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.strong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  words: { fontSize: font.tiny, color: colors.faint, fontStyle: 'italic', marginTop: spacing.xs },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  switchLabel: { fontSize: font.small, fontWeight: '700', color: colors.ink },
  switchSub: { fontSize: font.tiny, color: colors.faint, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, marginBottom: spacing.m },
  rowLabel: { flex: 1, fontSize: font.body, color: colors.ink },
  rowValue: { fontSize: font.body, fontWeight: '700', color: colors.ink },
  strong: { fontWeight: '900', color: colors.primaryDark },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.xs },
  mortNote: { fontSize: font.tiny, color: colors.warn, marginLeft: 28, marginTop: -spacing.xs, marginBottom: spacing.m },
  disclaimer: { fontSize: font.tiny, color: colors.info, lineHeight: 17 },
  enterCost: { fontSize: font.small, color: colors.muted, textAlign: 'center' },
});

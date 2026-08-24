import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import {
  Card,
  Chip,
  EmptyState,
  Header,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SkeletonList,
} from '../src/components/ui';
import { useApp } from '../src/store/AppStore';
import { MatchResult } from '../src/engine/types';
import { computeLoanPlan } from '../src/engine/calc';
import { fetchMatchResults } from '../src/services/api';
import { docLabel, purposeLabel } from '../data/constants';
import { formatINR, lt } from '../src/utils';
import { colors, font, spacing } from '../src/theme';

export default function Match() {
  const { t } = useTranslation();
  const lang = useApp().lang;
  const { profile, voiceEnabled } = useApp();
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      if (!profile) return;
      setResults(null);
      fetchMatchResults(profile).then((r) => alive && setResults(r));
      return () => {
        alive = false;
      };
    }, [profile])
  );

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  if (!profile) {
    return (
      <Screen>
        <Header title={t('match.title')} />
        <EmptyState
          icon="person-circle-outline"
          title={t('match.emptyTitle')}
          body={t('match.emptyBody')}
          action={<PrimaryButton label={t('match.goWizard')} onPress={() => router.push('/profile')} />}
        />
      </Screen>
    );
  }

  if (!results) {
    return (
      <Screen>
        <Header title={t('match.title')} subtitle={purposeLabel(profile.purpose, lang)} />
        <SkeletonList rows={3} />
        <Text style={styles.loadingLabel}>{t('common.loading')}</Text>
      </Screen>
    );
  }

  const eligible = results.filter((r) => r.status === 'eligible');
  const conditional = results.filter((r) => r.status === 'conditional');
  const nearMiss = results.filter((r) => r.status === 'ineligible');
  const matchedCount = eligible.length + conditional.length;

  const speakTop = () => {
    const top = [...eligible, ...conditional][0];
    if (!top) return;
    const text = `${lt(top.scheme.name, lang)}. ${lang === 'hi' ? 'अनुमानित सहायता' : 'Estimated assistance'} ${formatINR(computeLoanPlan(top.scheme, profile.projectCost, false).eligibleLoan)}`;
    Speech.speak(text, { language: lang === 'hi' ? 'hi-IN' : 'en-IN' });
  };

  return (
    <Screen>
      <Header
        title={t('match.title')}
        subtitle={matchedCount > 0 ? t('match.eligibleCount', { n: matchedCount }) : undefined}
      />

      {conditional.length > 0 ? (
        <Card tone="warn">
          <View style={styles.warnRow}>
            <Ionicons name="alert-circle" size={16} color={colors.warn} />
            <Text style={styles.warnText}>{t('match.conditionalBanner')}</Text>
          </View>
        </Card>
      ) : null}

      {matchedCount === 0 ? (
        <EmptyState
          icon="search"
          title={t('match.emptyTitle')}
          body={t('match.emptyBody')}
          action={<PrimaryButton label={t('match.goWizard')} onPress={() => router.push('/profile')} />}
        />
      ) : null}

      {[...eligible, ...conditional].map((r, idx) => {
        const plan = computeLoanPlan(r.scheme, profile.projectCost, r.scheme.purposeTags.includes('education'));
        const expanded = expandedId === r.scheme.id;
        return (
          <Card key={r.scheme.id} tone={idx === 0 ? 'ok' : undefined}>
            <View style={styles.rowBetween}>
              {idx === 0 ? <Chip label={t('match.topPick')} tone="ok" icon="star" /> : <Chip label={r.scheme.code} />}
              <Chip
                label={r.status === 'eligible' ? t('match.tagEligible') : t('match.tagConditional')}
                tone={r.status === 'eligible' ? 'ok' : 'warn'}
                icon={r.status === 'eligible' ? 'checkmark-circle' : 'alert-circle'}
              />
            </View>
            <Text style={styles.schemeName}>{lt(r.scheme.name, lang)}</Text>
            <Text style={styles.schemeDesc}>{lt(r.scheme.desc, lang)}</Text>

            <View style={styles.factsRow}>
              <Fact label={t('match.estAssist')} value={formatINR(plan.eligibleLoan)} />
              <Fact label={t('calc.emi')} value={formatINR(plan.emi)} />
              <Fact label="Term" value={`${plan.months}mo @${plan.ratePct}%`} small />
            </View>

            <Pressable onPress={() => setExpandedId(expanded ? null : r.scheme.id)} style={styles.whyBtn}>
              <Ionicons name={expanded ? 'chevron-up' : 'help-circle'} size={15} color={colors.primary} />
              <Text style={styles.whyText}>{expanded ? t('match.hideDetails') : t('match.whyEligible')}</Text>
            </Pressable>

            {expanded ? (
              <View style={styles.traceBox}>
                {r.traces.map((tr, i) => (
                  <View key={i} style={styles.traceRow}>
                    <Ionicons
                      name={tr.passed ? 'checkmark-circle' : 'close-circle'}
                      size={14}
                      color={tr.passed ? colors.ok : colors.danger}
                    />
                    <Text style={styles.traceText}>
                      {lt(tr.label, lang)}
                      {'\n'}
                      <Text style={styles.traceSub}>{t('match.traceRow', { expected: tr.expected, actual: tr.actual })}</Text>
                    </Text>
                  </View>
                ))}
                <View style={styles.docsBox}>
                  <Text style={styles.docsTitle}>{t('match.docsNeeded')}</Text>
                  {r.scheme.requiredDocs.map((d) => (
                    <Text key={d} style={styles.docItem}>• {docLabel(d, lang)}</Text>
                  ))}
                </View>
                <Text style={styles.sourceText}>
                  {t('match.sourceLabel')}: {r.scheme.sourceRef} · v{r.scheme.version}
                </Text>
              </View>
            ) : null}

            {voiceEnabled && idx === 0 ? (
              <SecondaryButton label={t('settings.voiceTest')} icon="volume-high" onPress={speakTop} />
            ) : null}

            <PrimaryButton label={t('match.calcCta')} onPress={() => router.push({ pathname: '/calc', params: { schemeId: r.scheme.id } })} />
          </Card>
        );
      })}

      {nearMiss.length > 0 ? (
        <>
          <Text style={styles.nearMissTitle}>{t('match.nearMissTitle')}</Text>
          {nearMiss.map((r) => (
            <Card key={r.scheme.id} style={{ opacity: 0.75 }}>
              <View style={styles.rowBetween}>
                <Text style={[styles.schemeName, { fontSize: font.body }]}>{lt(r.scheme.name, lang)}</Text>
                <Chip label={t('match.tagIneligible')} tone="fail" icon="close-circle" />
              </View>
              <Text style={styles.nearMissBody}>{t('match.nearMissBody')}</Text>
              <View style={{ marginTop: spacing.s }}>
                <Text style={styles.traceSub}>
                  {r.traces.filter((x) => !x.passed).map((x) => lt(x.label, lang)).join(' · ')}
                </Text>
              </View>
            </Card>
          ))}
        </>
      ) : null}

      <View style={{ marginTop: spacing.m }}>
        <SecondaryButton label={t('match.goWizard')} icon="pencil" onPress={() => router.push('/profile')} />
      </View>
    </Screen>
  );
}

function Fact({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={[styles.factValue, small && { fontSize: font.small }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingLabel: { textAlign: 'center', color: colors.faint, fontSize: font.small, marginTop: spacing.m },
  warnRow: { flexDirection: 'row', gap: spacing.s, alignItems: 'flex-start' },
  warnText: { flex: 1, fontSize: font.small, color: colors.warn, fontWeight: '600', lineHeight: 19 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.s },
  schemeName: { fontSize: font.h2, fontWeight: '800', color: colors.ink, marginTop: spacing.m },
  schemeDesc: { fontSize: font.small, color: colors.muted, marginTop: spacing.xs, lineHeight: 19 },
  factsRow: { flexDirection: 'row', gap: spacing.m, marginTop: spacing.l },
  fact: { flex: 1, backgroundColor: colors.bg, borderRadius: 10, padding: spacing.s },
  factLabel: { fontSize: font.tiny, color: colors.faint, fontWeight: '700' },
  factValue: { fontSize: font.body, fontWeight: '800', color: colors.primaryDark, marginTop: 2 },
  whyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.l },
  whyText: { fontSize: font.small, fontWeight: '700', color: colors.primary },
  traceBox: {
    backgroundColor: colors.bg,
    borderRadius: 10,
    padding: spacing.m,
    marginTop: spacing.s,
  },
  traceRow: { flexDirection: 'row', gap: spacing.s, marginBottom: spacing.m, alignItems: 'flex-start' },
  traceText: { flex: 1, fontSize: font.small, color: colors.ink, fontWeight: '600', lineHeight: 18 },
  traceSub: { fontSize: font.tiny, color: colors.muted, fontWeight: '400' },
  docsBox: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.m },
  docsTitle: { fontSize: font.tiny, fontWeight: '800', color: colors.ink, marginBottom: spacing.xs },
  docItem: { fontSize: font.small, color: colors.muted, lineHeight: 20 },
  sourceText: { fontSize: font.tiny, color: colors.faint, marginTop: spacing.m },
  nearMissTitle: { fontSize: font.h2, fontWeight: '800', color: colors.ink, marginVertical: spacing.s },
  nearMissBody: { fontSize: font.tiny, color: colors.muted, marginTop: spacing.xs },
});

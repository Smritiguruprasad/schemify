
### `app/match.tsx` — ranked results with explainability

The flagship screen. Behavior:

- Refetches on focus (`useFocusEffect`) so profile edits always re-rank.
- Skeletons during simulated latency; dedicated empty-state if no profile yet.
- **Eligible cards**: rank #1 gets star chip + green tint; every card previews
  estimated assistance + indicative EMI (quick `computeLoanPlan` pass) before
  the user commits to the calculator.
- **"Why this result?"** expands the full rule trace — ✓/✗ per rule with
  expected-vs-actual values — plus required docs and scheme version/source.
  Judges can audit every recommendation line-by-line.
- **Conditional banner** above results when any soft rule failed (certificate pending).
- **Near-miss card** lists ineligible schemes with their failed reasons spelled
  out — no dead ends.
- Voice button (when enabled) speaks the top recommendation via `expo-speech`;
  speech is stopped on unmount.

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import {
  Card,
  Chip,
  Divider,
  EmptyState,
  Header,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SkeletonList,
} from '../src/components/ui';
import { useApp } from '../src/store/AppStore';
import { Lang, MatchResult } from '../src/engine/types';
import { computeLoanPlan } from '../src/engine/calc';
import { fetchMatchResults } from '../src/services/api';
import { docLabel } from '../data/constants';
import { formatINR, lt } from '../src/utils';
import { colors, font, radii, spacing } from '../src/theme';

export default function Match() {
  const { t } = useTranslation();
  const { lang, profile, voiceEnabled } = useApp();
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      if (!profile) return;
      setResults(null);
      fetchMatchResults(profile).then((r) => {
        if (alive) setResults(r);
      });
      return () => {
        alive = false;
      };
    }, [profile])
  );

  useEffect(() => () => Speech.stop(), []);

  if (!profile) {
    return (
      <Screen>
        <Header title={t('match.title')} />
        <EmptyState
          icon="person-circle"
          title={t('match.emptyTitle')}
          body={t('profile.canonicalNote')}
          action={<PrimaryButton label={t('home.startCta')} onPress={() => router.replace('/profile')} />}
        />
      </Screen>
    );
  }

  const loading = results === null;
  const all = results ?? [];
  const eligible = all.filter((r) => r.eligible || r.conditional);
  const nearMiss = all.filter((r) => !r.eligible && !r.conditional);
  const hasConditional = eligible.some((r) => r.conditional);
  const top = eligible[0];

  const speakTop = () => {
    if (!top) return;
    const text =
      lang === 'hi'
        ? `आपके लिए सर्वश्रेष्ठ योजना: ${top.scheme.name.hi}. अनुमानित सहायता ${top.scheme.maxAssistance} रुपये तक।`
        : `Top scheme for you: ${top.scheme.name.en}. Estimated assistance up to ${top.scheme.maxAssistance} rupees.`;
    Speech.stop();
    Speech.speak(text, { language: lang === 'hi' ? 'hi-IN' : 'en-US' });
  };

  return (
    <Screen>
      <View style={styles.titleRow}>
        <Header title={t('match.title')} subtitle={t('common.demoNote')} />
        {voiceEnabled ? (
          <Pressable onPress={speakTop} disabled={!top} style={styles.speakerBtn}>
            <Ionicons name="volume-high" size={22} color={top ? colors.primary : colors.faint} />
          </Pressable>
        ) : null}
      </View>

      {hasConditional ? (
        <Card tone="warn">
          <Text style={styles.banner}>{t('match.conditionalBanner')}</Text>
        </Card>
      ) : null}

      {loading ? <SkeletonList rows={3} /> : null}

      {!loading && eligible.length === 0 ? (
        <EmptyState
          icon="sad"
          title={t('match.emptyTitle')}
          body={t('match.emptyBody')}
          action={<SecondaryButton label={t('match.goWizard')} icon="pencil" onPress={() => router.push('/profile')} />}
        />
      ) : null}

      {!loading && eligible.length > 0 ? (
        <>
          <Text style={styles.count}>{t('match.eligibleCount', { n: eligible.length })}</Text>
          {eligible.map((r, idx) => (
            <SchemeCard
              key={r.scheme.id}
              result={r}
              top={idx === 0}
              previewCost={profile.projectCost}
              expanded={expandedId === r.scheme.id}
              onToggle={() => setExpandedId(expandedId === r.scheme.id ? null : r.scheme.id)}
              lang={lang}
              t={t}
            />
          ))}

          {nearMiss.length > 0 ? (
            <Card tone="danger">
              <Text style={styles.nearTitle}>{t('match.nearMissTitle')}</Text>
              <Text style={styles.nearBody}>{t('match.nearMissBody')}</Text>
              {nearMiss.map((r) => (
                <View key={r.scheme.id} style={styles.nearItem}>
                  <Ionicons name="close-circle" size={14} color={colors.danger} />
                  <Text style={styles.nearName}>{lt(r.scheme.name, lang)}</Text>
                  {r.failedRules.slice(0, 1).map((fr) => (
                    <Text key={fr.label.en} style={styles.nearReason}>
                      {lt(fr.label, lang)}
                    </Text>
                  ))}
                </View>
              ))}
            </Card>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

function SchemeCard({
  result,
  top,
  previewCost,
  expanded,
  onToggle,
  lang,
  t,
}: {
  result: MatchResult;
  top: boolean;
  previewCost: number;
  expanded: boolean;
  onToggle: () => void;
  lang: Lang;
  t: (k: string, o?: Record<string, unknown>) => string;
}) {
  const s = result.scheme;
  const clamped = Math.min(Math.max(previewCost || s.minCost, s.minCost), s.maxAssistance);
  const plan = computeLoanPlan(s, clamped, false);

  return (
    <Card tone={result.eligible ? 'ok' : undefined}>
      {top ? (
        <View style={{ position: 'absolute', top: spacing.m, right: spacing.m }}>
          <Chip label={t('match.topPick')} tone="ok" icon="star" />
        </View>
      ) : null}
      <Text style={styles.schemeName}>{lt(s.name, lang)}</Text>
      <Text style={styles.schemeDesc}>{lt(s.desc, lang)}</Text>

      <View style={styles.statRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>{t('match.estAssist')}</Text>
          <Text style={styles.statValue}>{formatINR(plan.eligibleLoan)}</Text>
        </View>
        <View style={[styles.statBox, styles.statBoxAlt]}>
          <Text style={styles.statLabel}>{t('calc.emi')}</Text>
          <Text style={styles.statValue}>≈ {formatINR(plan.emi)}</Text>
        </View>
      </View>

      <Pressable onPress={onToggle} style={styles.whyBtn}>
        <Ionicons name={expanded ? 'chevron-up' : 'help-circle'} size={16} color={colors.primary} />
        <Text style={styles.whyText}>{expanded ? t('match.hideDetails') : t('match.whyEligible')}</Text>
        <Ionicons name={expanded ? 'remove' : 'add'} size={16} color={colors.faint} />
      </Pressable>

      {expanded ? (
        <View style={styles.traceWrap}>
          {result.ruleTrace.map((row) => (
            <View key={row.label.en} style={styles.traceRow}>
              <Ionicons
                name={row.pass ? 'checkmark-circle' : 'close-circle'}
                size={16}
                color={row.pass ? colors.ok : colors.danger}
              />
              <Text style={[styles.traceText, !row.pass && styles.traceFail]}>
                {lt(row.label, lang)} · {t('match.traceRow', { expected: row.expected, actual: row.actual })}
              </Text>
            </View>
          ))}
          <Divider />
          <Text style={styles.docsTitle}>{t('match.docsNeeded')}</Text>
          <View style={styles.docsWrap}>
            {s.requiredDocs.map((d) => (
              <Chip key={d} label={docLabel(d, lang)} tone="neutral" icon="document-text" />
            ))}
          </View>
          <Text style={styles.sourceLine}>
            {t('match.sourceLabel')}: {s.code} · v{s.version} · {s.effectiveFrom} · {s.sourceRef}
          </Text>
        </View>
      ) : null}

      <View style={{ marginTop: spacing.m }}>
        <PrimaryButton label={t('match.calcCta')} onPress={() => router.push(`/calc?scheme=${s.id}`)} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  speakerBtn: {
    width: 42,
    height: 42,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: { fontSize: font.small, color: colors.warn, fontWeight: '700', lineHeight: 19 },
  count: { fontSize: font.small, fontWeight: '700', color: colors.muted, marginBottom: spacing.m },
  schemeName: { fontSize: font.h2, fontWeight: '800', color: colors.ink, paddingRight: 90 },
  schemeDesc: { fontSize: font.small, color: colors.muted, marginTop: spacing.xs, lineHeight: 19 },
  statRow: { flexDirection: 'row', gap: spacing.m, marginTop: spacing.l },
  statBox: { flex: 1, backgroundColor: colors.bg, borderRadius: radii.m, padding: spacing.m },
  statBoxAlt: { backgroundColor: colors.primaryLight },
  statLabel: { fontSize: font.tiny, color: colors.faint, fontWeight: '700' },
  statValue: { fontSize: font.body, fontWeight: '800', color: colors.primaryDark, marginTop: 2 },
  whyBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, marginTop: spacing.l },
  whyText: { flex: 1, fontSize: font.small, fontWeight: '700', color: colors.primary },
  traceWrap: {
    marginTop: spacing.m,
    backgroundColor: colors.bg,
    borderRadius: radii.m,
    padding: spacing.m,
  },
  traceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.s, marginBottom: spacing.s },
  traceText: { flex: 1, fontSize: font.tiny, color: colors.ink, lineHeight: 17 },
  traceFail: { color: colors.danger, fontWeight: '600' },
  docsTitle: { fontSize: font.tiny, fontWeight: '800', color: colors.muted, marginBottom: spacing.s },
  docsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
  sourceLine: { fontSize: font.tiny, color: colors.faint, marginTop: spacing.m },
  nearTitle: { fontSize: font.body, fontWeight: '800', color: colors.danger },
  nearBody: { fontSize: font.tiny, color: colors.muted, marginTop: spacing.xs },
  nearItem: { marginTop: spacing.m, gap: 2 },
  nearName: { fontSize: font.small, fontWeight: '700', color: colors.ink },
  nearReason: { fontSize: font.tiny, color: colors.danger },
});
```

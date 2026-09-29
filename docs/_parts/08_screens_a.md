
---

## 9. Screens (`app/`)

### `app/home.tsx` — dashboard

Landing screen after language selection:

- Greeting uses first name if a profile exists; avatar icon routes to Settings.
- **Journey stepper** visualizes the six-step proposal flow (Discover → … →
  Track); steps light progressively once a profile exists.
- Primary CTA switches between "Start eligibility check" and "Update details"
  depending on whether a saved profile exists; Track CTA appears only when
  applications exist (progressive disclosure keeps new users uncluttered).
- Live stat cards count real catalog sizes (`SCHEMES.length`, `PARTNERS.length`).
- Voice tip card renders only when voice guidance is enabled.

```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Card, Chip, PrimaryButton, Screen, SecondaryButton } from '../src/components/ui';
import { useApp } from '../src/store/AppStore';
import { SCHEMES } from '../data/schemes';
import { PARTNERS } from '../data/partners';
import { colors, font, spacing } from '../src/theme';

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
        <Ionicons
          name="person-circle"
          size={40}
          color={colors.primary}
          onPress={() => router.push('/settings')}
        />
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
          <View style={{ gap: spacing.xs }}>
            <Chip label="Admin" tone="info" icon="stats-chart" />
            <Text style={styles.adminLabel}>{t('home.adminLink')}</Text>
          </View>
          <SecondaryButton
            label={t('common.next')}
            icon="arrow-forward"
            onPress={() => router.push('/admin')}
          />
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
  journeyTitle: { fontSize: font.h2 ?? 18, fontWeight: '800', color: colors.ink, marginBottom: spacing.l },
  stepsWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
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
  stepLabel: {
    fontSize: font.tiny,
    fontWeight: '700',
    color: colors.muted,
    textAlign: 'center',
  },
  statsRow: { flexDirection: 'row', gap: spacing.m },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 26, fontWeight: '900', color: colors.primaryDark },
  statLabel: {
    fontSize: font.tiny,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adminLabel: { fontSize: font.body, fontWeight: '700', color: colors.ink },
  footer: {
    textAlign: 'center',
    fontSize: font.tiny,
    color: colors.faint,
    marginTop: spacing.m,
  },
});
```

### `app/profile.tsx` — 5-step wizard

The input backbone. Key mechanics:

- Draft state holds raw **strings** for numerics (typing is never fought by
  reformatting); values are parsed only on save.
- Per-step validation with inline errors (name; age 18–65; positive amounts;
  district). Choosing *education* reveals education-level + course-type pickers,
  which ELS rules later require.
- Choosing *pending* SC status immediately shows the amber conditional-
  eligibility explainer — expectation-setting before results appear.
- Step 5 is the **canonical review**: every amount shown ₹-formatted AND in
  words ("eight lakh rupees") — the mishearing/mistranslation guard.
- Confirm builds the typed `BeneficiaryProfile`, persists it via the store and
  replaces to `/match`. Re-opening pre-fills every field from stored profile.

```tsx
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import {
  Card,
  Field,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SelectPills,
  ThemedInput,
} from '../src/components/ui';
import { useApp } from '../src/store/AppStore';
import type {
  BeneficiaryProfile,
  CourseType,
  EducationLevel,
  Gender,
  LocalText,
  Purpose,
  ScStatus,
} from '../src/engine/types';
import { COURSE_TYPES, EDU_LEVELS, GENDERS, PURPOSES, SC_STATUSES } from '../data/constants';
import { DISTRICTS } from '../data/districts';
import { amountInWordsIndian, formatINR, lt } from '../src/utils';
import { colors, font, spacing } from '../src/theme';

const TOTAL = 5;

interface Draft {
  name: string;
  age: string;
  gender: Gender | null;
  scStatus: ScStatus | null;
  annualIncome: string;
  purpose: Purpose | null;
  projectCost: string;
  educationLevel: EducationLevel | null;
  courseType: CourseType | null;
  district: string | null;
}

const EMPTY: Draft = {
  name: '',
  age: '',
  gender: null,
  scStatus: null,
  annualIncome: '',
  purpose: null,
  projectCost: '',
  educationLevel: null,
  courseType: null,
  district: null,
};

export default function ProfileWizard() {
  const { t } = useTranslation();
  const lang = useApp().lang;
  const { profile, setProfile } = useApp();
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(() => ({
    ...EMPTY,
    ...(profile
      ? {
          name: profile.name,
          age: String(profile.age || ''),
          gender: profile.gender,
          scStatus: profile.scStatus,
          annualIncome: String(profile.annualIncome || ''),
          purpose: profile.purpose,
          projectCost: String(profile.projectCost || ''),
          educationLevel: profile.educationLevel ?? null,
          courseType: profile.courseType ?? null,
          district: profile.district,
        }
      : {}),
  }));
  const [err, setErr] = useState<string | null>(null);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setD((prev) => ({ ...prev, [k]: v }));
    setErr(null);
  };

  const num = (s: string) => Number(s.replace(/[^0-9.]/g, '')) || 0;
  const fail = (msg: string): boolean => {
    setErr(msg);
    return false;
  };

  const validate = (): boolean => {
    if (step === 0) {
      if (!d.name.trim()) return fail(t('profile.errName'));
      const age = num(d.age);
      if (!age || age < 18 || age > 65) return fail(t('profile.errAge'));
    }
    if (step === 1) {
      if (!d.scStatus) return false;
      if (!(num(d.annualIncome) > 0)) return fail(t('profile.errNum'));
    }
    if (step === 2) {
      if (!d.purpose) return false;
      if (!(num(d.projectCost) > 0)) return fail(t('profile.errNum'));
      if (d.purpose === 'education' && (!d.educationLevel || !d.courseType)) return false;
    }
    if (step === 3 && !d.district) return false;
    return true;
  };

  const next = () => {
    if (!validate()) return;
    if (step === TOTAL - 1) {
      const p: BeneficiaryProfile = {
        name: d.name.trim(),
        age: num(d.age),
        gender: d.gender as Gender,
        scStatus: d.scStatus as ScStatus,
        annualIncome: num(d.annualIncome),
        purpose: d.purpose as Purpose,
        projectCost: num(d.projectCost),
        educationLevel: d.purpose === 'education' ? (d.educationLevel ?? undefined) : undefined,
        courseType: d.purpose === 'education' ? (d.courseType ?? undefined) : undefined,
        district: d.district as string,
      };
      setProfile(p);
      router.replace('/match');
      return;
    }
    setStep(step + 1);
  };

  const titles = [
    t('profile.s1'),
    t('profile.s2'),
    t('profile.s3'),
    t('profile.s4'),
    t('profile.s5'),
  ];
  const purposeText =
    PURPOSES.find((x) => x.value === d.purpose) != null
      ? lt(PURPOSES.find((x) => x.value === d.purpose)!.label as LocalText, lang)
      : '-';

  return (
    <Screen padded={false}>
      <View style={styles.innerPad}>
        <View style={styles.progressRow}>
          {Array.from({ length: TOTAL }).map((_, i) => (
            <View key={i} style={[styles.progressSeg, i <= step && styles.progressSegActive]} />
          ))}
        </View>
        <Text style={styles.stepText}>{t('profile.step', { n: step + 1, total: TOTAL })}</Text>
        <Text style={styles.title}>{titles[step]}</Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          {step === 0 ? (
            <>
              <Field label={t('profile.name')} error={err}>
                <ThemedInput value={d.name} onChangeText={(v) => set('name', v)} placeholder={t('profile.namePh')} />
              </Field>
              <Field label={t('profile.age')} error={err}>
                <ThemedInput value={d.age} onChangeText={(v) => set('age', v)} keyboardType="number-pad" placeholder="30" />
              </Field>
              <Field label={t('profile.gender')}>
                <SelectPills
                  options={GENDERS.map((g) => ({ value: g.value, label: lt(g.label, lang) }))}
                  value={d.gender}
                  onChange={(v) => set('gender', v)}
                />
              </Field>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <Field label={t('profile.scStatus')}>
                <SelectPills
                  options={SC_STATUSES.map((g) => ({ value: g.value, label: lt(g.label, lang) }))}
                  value={d.scStatus}
                  onChange={(v) => set('scStatus', v)}
                />
              </Field>
              {d.scStatus === 'pending' ? (
                <Card tone="warn">
                  <View style={styles.warnRow}>
                    <Ionicons name="alert-circle" size={16} color={colors.warn} />
                    <Text style={styles.warnText}>{t('match.conditionalBanner')}</Text>
                  </View>
                </Card>
              ) : null}
              <Field label={t('profile.income')} hint={t('profile.incomeHint')} error={err}>
                <ThemedInput
                  value={d.annualIncome ? formatINR(num(d.annualIncome)) : ''}
                  onChangeText={(v) => set('annualIncome', v)}
                  keyboardType="number-pad"
                  placeholder="240000"
                />
              </Field>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Field label={t('profile.purpose')}>
                <SelectPills
                  options={PURPOSES.map((g) => ({ value: g.value, label: lt(g.label, lang) }))}
                  value={d.purpose}
                  onChange={(v) => set('purpose', v)}
                />
              </Field>
              <Field label={t('profile.cost')} hint={t('profile.costHint')} error={err}>
                <ThemedInput
                  value={d.projectCost ? formatINR(num(d.projectCost)) : ''}
                  onChangeText={(v) => set('projectCost', v)}
                  keyboardType="number-pad"
                  placeholder="800000"
                />
              </Field>
              {d.purpose === 'education' ? (
                <>
                  <Field label={t('profile.eduLevel')}>
                    <SelectPills
                      options={EDU_LEVELS.map((g) => ({ value: g.value, label: lt(g.label, lang) }))}
                      value={d.educationLevel}
                      onChange={(v) => set('educationLevel', v)}
                    />
                  </Field>
                  <Field label={t('profile.courseType')}>
                    <SelectPills
                      options={COURSE_TYPES.map((g) => ({ value: g.value, label: lt(g.label, lang) }))}
                      value={d.courseType}
                      onChange={(v) => set('courseType', v)}
                    />
                  </Field>
                </>
              ) : null}
            </>
          ) : null}

          {step === 3 ? (
            <Field label={t('profile.district')} hint={t('profile.districtHint')} error={err}>
              <View style={styles.districtGrid}>
                {DISTRICTS.map((dist) => {
                  const active = d.district === dist.name;
                  return (
                    <Pressable key={dist.name} style={styles.districtCell} onPress={() => set('district', dist.name)}>
                      <SecondaryButton
                        label={active ? `✓ ${dist.name}` : dist.name}
                        onPress={() => set('district', dist.name)}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </Field>
          ) : null}

          {step === 4 ? (
            <>
              <Card>
                <ReviewRow icon="person" label={t('profile.name')} value={d.name || '-'} />
                <ReviewRow icon="calendar" label={t('profile.age')} value={d.age || '-'} />
                <ReviewRow
                  icon="ribbon"
                  label={t('profile.scStatus')}
                  value={SC_STATUSES.find((x) => x.value === d.scStatus)
                    ? lt(SC_STATUSES.find((x) => x.value === d.scStatus)!.label, lang)
                    : '-'}
                />
                <ReviewRow
                  icon="cash"
                  label={t('profile.income')}
                  value={formatINR(num(d.annualIncome))}
                  sub={amountInWordsIndian(num(d.annualIncome))}
                />
                <ReviewRow icon="flag" label={t('profile.purpose')} value={purposeText} />
                <ReviewRow
                  icon="cube"
                  label={t('profile.cost')}
                  value={formatINR(num(d.projectCost))}
                  sub={amountInWordsIndian(num(d.projectCost))}
                />
                <ReviewRow icon="location" label={t('profile.district')} value={d.district ?? '-'} />
              </Card>
              <Card tone="info">
                <Text style={styles.canonical}>{t('profile.canonicalNote')}</Text>
              </Card>
              <SecondaryButton label={t('match.goWizard')} icon="pencil" onPress={() => setStep(0)} />
            </>
          ) : null}

          <View style={{ height: spacing.xl }} />
        </ScrollView>

        <View style={styles.navRow}>
          {step > 0 ? (
            <SecondaryButton label={t('common.back')} icon="arrow-back" onPress={() => setStep(step - 1)} />
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <View style={{ flex: 1 }}>
            <PrimaryButton
              label={step === TOTAL - 1 ? t('profile.confirmCta') : t('common.next')}
              onPress={next}
            />
          </View>
        </View>
      </View>
    </Screen>
  );
}

function ReviewRow({
  icon,
  label,
  value,
  sub,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <View style={styles.reviewRow}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.reviewLabel}>{label}</Text>
        <Text style={styles.reviewValue}>{value}</Text>
        {sub ? <Text style={styles.reviewSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  innerPad: { flex: 1, paddingHorizontal: spacing.l, paddingTop: spacing.m },
  progressRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.m },
  progressSeg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressSegActive: { backgroundColor: colors.primary },
  stepText: {
    fontSize: font.tiny,
    fontWeight: '700',
    color: colors.faint,
    marginBottom: spacing.xs,
  },
  title: { fontSize: font.title, fontWeight: '800', color: colors.ink, marginBottom: spacing.l },
  warnRow: { flexDirection: 'row', gap: spacing.s, alignItems: 'flex-start' },
  warnText: {
    flex: 1,
    fontSize: font.small,
    color: colors.warn,
    fontWeight: '600',
    lineHeight: 19,
  },
  districtGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  districtCell: { width: '50%', marginBottom: spacing.s },
  navRow: { flexDirection: 'row', gap: spacing.m, marginTop: spacing.m },
  canonical: { fontSize: font.tiny, color: colors.info, fontWeight: '600' },
  reviewRow: {
    flexDirection: 'row',
    gap: spacing.m,
    alignItems: 'flex-start',
    marginBottom: spacing.l,
  },
  reviewLabel: { fontSize: font.tiny, color: colors.faint, fontWeight: '700' },
  reviewValue: {
    fontSize: font.body,
    color: colors.ink,
    fontWeight: '700',
    marginTop: 2,
  },
  reviewSub: {
    fontSize: font.tiny,
    color: colors.muted,
    fontStyle: 'italic',
    marginTop: 2,
  },
});
```

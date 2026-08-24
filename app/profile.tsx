import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
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
import {
  BeneficiaryProfile,
  CourseType,
  EducationLevel,
  Gender,
  Purpose,
  ScStatus,
} from '../src/engine/types';
import {
  COURSE_TYPES,
  EDU_LEVELS,
  GENDERS,
  PURPOSES,
  SC_STATUSES,
} from '../data/constants';
import { DISTRICTS } from '../data/districts';
import { amountInWordsIndian, formatINR, lt } from '../src/utils';
import { colors, font, radii, spacing } from '../src/theme';

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

  const num = (s: string) => Number(s.replace(/[^0-9.]/g, ''));

  const validate = (): boolean => {
    if (step === 0) {
      if (!d.name.trim()) return fail(t('profile.errName'));
      const age = num(d.age);
      if (!age || age < 18 || age > 65) return fail(t('profile.errAge'));
      if (!d.gender) return false;
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

  const fail = (msg: string): boolean => {
    setErr(msg);
    return false;
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

  const purposeText = d.purpose ? lt(PURPOSES.find((x) => x.value === d.purpose)?.label, lang) : '-';

  return (
    <Screen>
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
              <SelectPills options={GENDERS.map((g) => ({ value: g.value, label: lt(g.label, lang) }))} value={d.gender} onChange={(v) => set('gender', v)} />
            </Field>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Field label={t('profile.scStatus')}>
              <SelectPills options={SC_STATUSES.map((g) => ({ value: g.value, label: lt(g.label, lang) }))} value={d.scStatus} onChange={(v) => set('scStatus', v)} />
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
              <ThemedInput value={d.annualIncome ? formatINR(num(d.annualIncome)) : ''} onChangeText={(v) => set('annualIncome', v)} keyboardType="number-pad" placeholder="2,40,000" />
            </Field>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Field label={t('profile.purpose')}>
              <SelectPills options={PURPOSES.map((g) => ({ value: g.value, label: lt(g.label, lang) }))} value={d.purpose} onChange={(v) => set('purpose', v)} />
            </Field>
            <Field label={t('profile.cost')} hint={t('profile.costHint')} error={err}>
              <ThemedInput
                value={d.projectCost ? formatINR(num(d.projectCost)) : ''}
                onChangeText={(v) => set('projectCost', v)}
                keyboardType="number-pad"
                placeholder="8,00,000"
              />
            </Field>
            {d.purpose === 'education' ? (
              <>
                <Field label={t('profile.eduLevel')}>
                  <SelectPills options={EDU_LEVELS.map((g) => ({ value: g.value, label: lt(g.label, lang) }))} value={d.educationLevel} onChange={(v) => set('educationLevel', v)} />
                </Field>
                <Field label={t('profile.courseType')}>
                  <SelectPills options={COURSE_TYPES.map((g) => ({ value: g.value, label: lt(g.label, lang) }))} value={d.courseType} onChange={(v) => set('courseType', v)} />
                </Field>
              </>
            ) : null}
          </>
        ) : null}

        {step === 3 ? (
          <Field label={t('profile.district')} hint={t('profile.districtHint')} error={err}>
            <View style={styles.districtGrid}>
              {DISTRICTS.map((dist) => (
                <DistrictOption
                  key={dist.name}
                  label={dist.name}
                  active={d.district === dist.name}
                  onPress={() => set('district', dist.name)}
                />
              ))}
            </View>
          </Field>
        ) : null}

        {step === 4 ? (
          <>
            <Card>
              <ReviewRow icon="person" label={t('profile.name')} value={d.name || '-'} />
              <ReviewRow icon="calendar" label={t('profile.age')} value={d.age || '-'} />
              <ReviewRow icon="ribbon" label={t('profile.scStatus')} value={lt(SC_STATUSES.find((x) => x.value === d.scStatus)?.label, lang)} />
              <ReviewRow icon="cash" label={t('profile.income')} value={formatINR(num(d.annualIncome))} sub={amountInWordsIndian(num(d.annualIncome))} />
              <ReviewRow icon="flag" label={t('profile.purpose')} value={purposeText} />
              <ReviewRow icon="cube" label={t('profile.cost')} value={formatINR(num(d.projectCost))} sub={amountInWordsIndian(num(d.projectCost))} />
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
          <PrimaryButton label={step === TOTAL - 1 ? t('profile.confirmCta') : t('common.next')} onPress={next} />
        </View>
      </View>
    </Screen>
  );
}

function DistrictOption({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <View style={styles.districtCell}>
      <SecondaryButton label={label} onPress={onPress} icon={active ? 'checkmark-circle' : undefined} />
    </View>
  );
}

function ReviewRow({ icon, label, value, sub }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; sub?: string }) {
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
  progressRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.m },
  progressSeg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressSegActive: { backgroundColor: colors.primary },
  stepText: { fontSize: font.tiny, fontWeight: '700', color: colors.faint, marginBottom: spacing.xs },
  title: { fontSize: font.title, fontWeight: '800', color: colors.ink, marginBottom: spacing.l },
  warnRow: { flexDirection: 'row', gap: spacing.s, alignItems: 'flex-start' },
  warnText: { flex: 1, fontSize: font.small, color: colors.warn, fontWeight: '600', lineHeight: 19 },
  districtGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs },
  districtCell: { width: '50%', paddingHorizontal: spacing.xs / 2, marginBottom: spacing.s },
  navRow: { flexDirection: 'row', gap: spacing.m, marginTop: spacing.m },
  canonical: { fontSize: font.tiny, color: colors.info, fontWeight: '600' },
  reviewRow: { flexDirection: 'row', gap: spacing.m, alignItems: 'flex-start', marginBottom: spacing.l },
  reviewLabel: { fontSize: font.tiny, color: colors.faint, fontWeight: '700' },
  reviewValue: { fontSize: font.body, color: colors.ink, fontWeight: '700', marginTop: 2 },
  reviewSub: { fontSize: font.tiny, color: colors.muted, fontStyle: 'italic', marginTop: 2 },
});

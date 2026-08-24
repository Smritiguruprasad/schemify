import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../src/components/ui';
import { useApp } from '../src/store/AppStore';
import { Lang } from '../src/engine/types';
import { colors, font, radii, spacing } from '../src/theme';

export default function LanguagePicker() {
  const { t } = useTranslation();
  const { lang, setLang } = useApp();

  const choose = (l: Lang) => {
    setLang(l);
    router.replace('/home');
  };

  const options: { value: Lang; label: string; native: string }[] = [
    { value: 'en', label: t('common.appName'), native: 'English' },
    { value: 'hi', label: t('common.appName'), native: 'हिन्दी' },
  ];

  return (
    <Screen scroll={false} style={styles.center}>
      <View style={styles.logoWrap}>
        <Ionicons name="compass" size={56} color={colors.primary} />
        <Text style={styles.title}>{t('common.appName')}</Text>
        <Text style={styles.tagline}>{t('common.tagline')}</Text>
      </View>

      <View style={styles.options}>
        <Text style={styles.langTitle}>{t('lang.title')}</Text>
        {options.map((o) => (
          <Pressable
            key={o.value}
            onPress={() => choose(o.value)}
            style={({ pressed }) => [
              styles.option,
              lang === o.value && styles.optionActive,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={[styles.optionText, lang === o.value && styles.optionTextActive]}>
              {o.native}
            </Text>
            <Ionicons
              name={lang === o.value ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={lang === o.value ? '#fff' : colors.faint}
            />
          </Pressable>
        ))}
        <Text style={styles.subtitle}>{t('lang.subtitle')}</Text>
        <Text style={styles.langTitle}>{t('lang.title')}</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.ps}>{t('common.psLine')}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: spacing.xxl },
  title: { fontSize: 28, fontWeight: '900', color: colors.primaryDark, marginTop: spacing.m },
  tagline: { fontSize: font.small, color: colors.muted, marginTop: spacing.xs },
  options: { gap: spacing.m, paddingHorizontal: spacing.l },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.l,
    paddingVertical: spacing.l,
    paddingHorizontal: spacing.xl,
  },
  optionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionText: { fontSize: font.h2, fontWeight: '700', color: colors.ink },
  optionTextActive: { color: '#fff' },
  subtitle: { fontSize: font.tiny, color: colors.faint, textAlign: 'center', marginTop: spacing.s },
  langTitle: { fontSize: font.h2, fontWeight: '800', color: colors.ink, textAlign: 'center', marginBottom: spacing.xs },
  footer: { position: 'absolute', bottom: spacing.xl, left: 0, right: 0, alignItems: 'center' },
  ps: { fontSize: font.tiny, color: colors.faint, textAlign: 'center', paddingHorizontal: spacing.xl },
});

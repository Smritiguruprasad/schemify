import React from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Speech from 'expo-speech';
import {
  Card,
  Header,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from '../src/components/ui';
import { useApp } from '../src/store/AppStore';
import { Lang } from '../src/engine/types';
import { colors, font, spacing } from '../src/theme';

export default function Settings() {
  const { t } = useTranslation();
  const { lang, setLang, voiceEnabled, setVoiceEnabled, resetDemoData } = useApp();

  const testVoice = () => {
    Speech.stop();
    Speech.speak(t('settings.testPhrase'), {
      language: lang === 'hi' ? 'hi-IN' : 'en-IN',
    });
  };

  const confirmReset = () => {
    Alert.alert(t('settings.resetTitle'), t('settings.resetBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        style: 'destructive',
        onPress: () => resetDemoData(),
      },
    ]);
  };

  const langs: { value: Lang; label: string }[] = [
    { value: 'en', label: 'English' },
    { value: 'hi', label: 'हिन्दी' },
  ];

  return (
    <Screen>
      <Header title={t('settings.title')} />

      <Card>
        <Text style={styles.section}>{t('settings.language')}</Text>
        <View style={styles.langRow}>
          {langs.map((l) => (
            <SecondaryButton
              key={l.value}
              label={l.value === lang ? `● ${l.label}` : l.label}
              onPress={() => setLang(l.value)}
            />
          ))}
        </View>
      </Card>

      <Card>
        <View style={styles.switchRow}>
          <View style={{ flex: 1, paddingRight: spacing.m }}>
            <Text style={styles.section}>{t('settings.voiceSection')}</Text>
            <Text style={styles.switchLabel}>{t('settings.voiceToggle')}</Text>
          </View>
          <Switch
            value={voiceEnabled}
            onValueChange={(v) => {
              setVoiceEnabled(v);
              if (!v) Speech.stop();
            }}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>
        {voiceEnabled ? (
          <View style={{ marginTop: spacing.m }}>
            <SecondaryButton label={t('settings.voiceTest')} icon="volume-high" onPress={testVoice} />
          </View>
        ) : null}
      </Card>

      <Card>
        <Text style={styles.section}>{t('settings.dataSection')}</Text>
        <PrimaryButton label={t('settings.resetData')} onPress={confirmReset} />
      </Card>

      <Card>
        <Text style={styles.section}>{t('settings.about')}</Text>
        <Text style={styles.about}>{t('settings.aboutBody')}</Text>
        <Text style={styles.madeFor}>{t('settings.madeFor')}</Text>
        <Text style={styles.version}>{t('common.version')}</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: font.small, fontWeight: '800', color: colors.faint, textTransform: 'uppercase', marginBottom: spacing.m },
  langRow: { flexDirection: 'row', gap: spacing.s },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  switchLabel: { fontSize: font.body, fontWeight: '700', color: colors.ink, marginTop: spacing.xs },
  about: { fontSize: font.small, color: colors.muted, lineHeight: 20 },
  madeFor: { fontSize: font.tiny, color: colors.faint, marginTop: spacing.m },
  version: { fontSize: font.tiny, color: colors.faint, marginTop: spacing.xs },
});

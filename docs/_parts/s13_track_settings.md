
### `app/track.tsx` — live status with timeline + demo simulator

Lists every application (newest first) with scheme/partner, status badge and
tracking ID in monospace. Tapping a card expands its **status history** timeline
(reusing the `Timeline` component). For demo purposes a "Simulate partner
update" button advances the state machine one step — standing in for the future
webhook from the partner portal.

```tsx
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import {
  Card,
  EmptyState,
  Header,
  PrimaryButton,
  Screen,
  SecondaryButton,
  StatusBadge,
} from '../src/components/ui';
import { Timeline } from '../src/components/Timeline';
import { useApp } from '../src/store/AppStore';
import { getSchemeById } from '../data/schemes';
import { getPartnerById } from '../data/partners';
import { formatDate } from '../src/utils';
import { colors, font, spacing } from '../src/theme';

export default function Track() {
  const { t } = useTranslation();
  const { lang, applications, advanceApplication } = useApp();
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <Screen>
      <Header title={t('track.title')} />

      {applications.length === 0 ? (
        <EmptyState
          icon="file-tray"
          title={t('track.emptyTitle')}
          body={t('track.emptyBody')}
          action={<PrimaryButton label={t('home.startCta')} onPress={() => router.replace('/profile')} />}
        />
      ) : (
        applications.map((a) => {
          const scheme = getSchemeById(a.schemeId);
          const partner = getPartnerById(a.partnerId);
          const open = openId === a.id;
          return (
            <Card key={a.id}>
              <Pressable onPress={() => setOpenId(open ? null : a.id)}>
                <View style={styles.rowTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.scheme}>{scheme?.name[lang] ?? a.schemeId}</Text>
                    <Text style={styles.partner}>{partner?.name ?? a.partnerId}</Text>
                  </View>
                  <StatusBadge status={a.status} label={t(`status.${a.status}`)} />
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.tracking}>{a.id}</Text>
                  {a.docsPending > 0 ? (
                    <Text style={styles.pending}>{t('track.docsPending', { n: a.docsPending })}</Text>
                  ) : null}
                </View>
                <Text style={styles.updated}>
                  {t('track.updated')}: {formatDate(a.updatedAt, lang)}
                </Text>
              </Pressable>

              {open ? (
                <View style={styles.detail}>
                  <Text style={styles.timelineTitle}>{t('track.timelineTitle')}</Text>
                  <Timeline events={a.timeline} lang={lang} statusLabel={(s) => t(`status.${s}`)} />
                  {a.status !== 'sanctioned' && a.status !== 'rejected' ? (
                    <SecondaryButton
                      label={t('track.simulate')}
                      icon="refresh"
                      onPress={() => advanceApplication(a.id)}
                    />
                  ) : null}
                </View>
              ) : null}
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.s },
  scheme: { fontSize: font.body, fontWeight: '800', color: colors.ink },
  partner: { fontSize: font.tiny, color: colors.muted, marginTop: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.m },
  tracking: { fontFamily: 'monospace', fontSize: font.tiny, color: colors.primaryDark, fontWeight: '700' },
  pending: { fontSize: font.tiny, color: colors.warn, fontWeight: '700' },
  updated: { fontSize: font.tiny, color: colors.faint, marginTop: spacing.xs },
  detail: { marginTop: spacing.l, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.l },
  timelineTitle: { fontSize: font.tiny, fontWeight: '800', color: colors.muted, marginBottom: spacing.m },
});
```

*(add `import { router } from 'expo-router';` at top — used by the empty-state CTA.)*

### `app/settings.tsx` — language, voice, data reset

Single screen for the three settings the MVP promises. Language switch calls
both the store (persist) and `i18n.changeLanguage` (live re-render). Voice test
speaks a sample phrase through `expo-speech`. Reset asks for confirmation via
`Alert.alert` before wiping AsyncStorage keys.

```tsx
import React from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Speech from 'expo-speech';
import { Card, Header, PrimaryButton, Screen, SecondaryButton } from '../src/components/ui';
import { useApp } from '../src/store/AppStore';
import i18n from '../src/i18n';
import { colors, font, spacing } from '../src/theme';

export default function Settings() {
  const { t } = useTranslation();
  const {
    lang,
    setLang,
    voiceEnabled,
    setVoiceEnabled,
    resetDemoData,
    profile,
    applications,
  } = useApp();

  const changeLang = (l: 'en' | 'hi') => {
    setLang(l);
    i18n.changeLanguage(l);
  };

  const testVoice = () => {
    Speech.stop();
    Speech.speak(t('settings.testPhrase'), { language: lang === 'hi' ? 'hi-IN' : 'en-US' });
  };

  const confirmReset = () => {
    Alert.alert(t('settings.resetTitle'), t('settings.resetBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.confirm'), style: 'destructive', onPress: () => resetDemoData() },
    ]);
  };

  return (
    <Screen>
      <Header title={t('settings.title')} subtitle={`${t('common.version')} · ${applications.length} apps`} />

      <Card>
        <Text style={styles.section}>{t('settings.language')}</Text>
        <View style={styles.langRow}>
          <View style={{ flex: 1 }}>
            <SecondaryButton label="English" icon="language" onPress={() => changeLang('en')} />
          </View>
          <View style={{ flex: 1 }}>
            <SecondaryButton label="हिंदी" icon="language" onPress={() => changeLang('hi')} />
          </View>
        </View>
        <Text style={styles.activeLang}>{lang === 'en' ? 'English active' : 'हिंदी चालू'}</Text>
      </Card>

      <Card>
        <Text style={styles.section}>{t('settings.voiceSection')}</Text>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>{t('settings.voiceToggle')}</Text>
          <Switch value={voiceEnabled} onValueChange={setVoiceEnabled} trackColor={{ true: colors.primary }} />
        </View>
        {voiceEnabled ? <PrimaryButton label={t('settings.voiceTest')} onPress={testVoice} /> : null}
      </Card>

      <Card>
        <Text style={styles.section}>{t('settings.dataSection')}</Text>
        <Text style={styles.dataNote}>
          Profile: {profile ? profile.name : '—'} · Applications: {applications.length}
        </Text>
        <SecondaryButton label={t('settings.resetData')} icon="trash" onPress={confirmReset} />
      </Card>

      <Card tone="info">
        <Text style={styles.aboutTitle}>{t('settings.about')}</Text>
        <Text style={styles.aboutBody}>{t('settings.aboutBody')}</Text>
        <Text style={styles.madeFor}>{t('settings.madeFor')}</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: font.body, fontWeight: '800', color: colors.ink, marginBottom: spacing.m },
  langRow: { flexDirection: 'row', gap: spacing.m },
  activeLang: { fontSize: font.tiny, color: colors.faint, marginTop: spacing.s },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { flex: 1, fontSize: font.small, fontWeight: '700', color: colors.ink },
  dataNote: { fontSize: font.tiny, color: colors.muted, marginBottom: spacing.m },
  aboutTitle: { fontSize: font.small, fontWeight: '800', color: colors.info },
  aboutBody: { fontSize: font.tiny, color: colors.muted, marginTop: spacing.xs, lineHeight: 17 },
  madeFor: { fontSize: font.tiny, color: colors.faint, marginTop: spacing.m },
});
```

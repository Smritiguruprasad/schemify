# FinSetu AI — Complete Code Walkthrough

Component-by-component explanation of every file in this repo, with full source code.
Stack: **Expo React Native (SDK 54) · TypeScript · expo-router 6 · AsyncStorage · i18next**.
The app is UI-first and runs 100% on local mock data — no API keys, no external services.

---

## 1. Architecture at a glance

```text
app/            → screens (expo-router file-based navigation)
src/engine/     → pure logic: eligibility rule engine + loan calculator
src/data→data/  → mock master data: schemes, partners, districts, label constants
src/services/   → storage wrapper (AsyncStorage) + mock "API" that mirrors future FastAPI
src/store/      → global state (Context): language, profile, applications, settings
src/i18n/       → English/Hindi translation bundles
src/components/ → reusable UI kit + SVG charts + status timeline
docs/           → backend contract for teammates + deployment guide
```

Data flow for the core journey:

```text
ProfileWizard → AppStore.setProfile() → AsyncStorage
Match screen  → api.fetchMatchResults(profile) → engine.matchSchemes() → ranked cards w/ traces
Calculator    → engine.computeLoanPlan(scheme, cost, moratorium)
Partners      → api.fetchNearbyPartners() → gates + haversine + radius expansion
Apply/Track   → AppStore.addApplication()/advanceApplication() → persisted timeline
```

Design principle: **rules decide, UI explains.** No LLM anywhere in the MVP.

---

## 2. Project configuration

### `package.json`

Entry point is `expo-router/entry` (router takes over bootstrapping). All native-ish
packages are version-aligned to SDK 54 so Expo Go on your phone can run them.

```json
{
  "name": "finsetu",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "dependencies": {
    "@expo/vector-icons": "^15.1.1",
    "@react-native-async-storage/async-storage": "2.2.0",
    "@types/react": "~19.1.10",
    "expo": "~54.0.0",
    "expo-constants": "~18.0.14",
    "expo-linking": "~8.0.12",
    "expo-router": "~6.0.24",
    "expo-speech": "~14.0.8",
    "expo-status-bar": "~3.0.9",
    "i18next": "^26.4.0",
    "react": "19.1.0",
    "react-i18next": "^17.0.12",
    "react-native": "0.81.5",
    "react-native-safe-area-context": "~5.6.0",
    "react-native-screens": "~4.16.0",
    "react-native-svg": "15.12.1",
    "react-native-webview": "13.15.0",
    "typescript": "~5.9.2"
  },
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "typecheck": "tsc --noEmit"
  },
  "private": true,
  "devDependencies": {
    "@expo/ngrok": "^4.1.0"
  }
}
```

### `app.json`

Registers the `expo-router` plugin, deep-link scheme `finsetu`, portrait lock, and the
teal splash background. No permissions requested — location/GPS is deliberately not used
(district picker replaces it).

```json
{
  "expo": {
    "name": "FinSetu AI",
    "slug": "finsetu-ai",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "finsetu",
    "userInterfaceStyle": "light",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#0E7C66"
    },
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/android-icon-foreground.png",
        "backgroundImage": "./assets/android-icon-background.png",
        "monochromeImage": "./assets/android-icon-monochrome.png"
      }
    },
    "web": {
      "bundler": "metro",
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-router"
    ]
  }
}
```

### `tsconfig.json`

Strict TypeScript, extending Expo's base config (which enables JSON imports — needed
by the translation bundles).

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true
  }
}
```

---

## 3. App entry & routing

### `app/_layout.tsx` — root layout

- Imports `../src/i18n` once (side-effect init of translations).
- Wraps everything in `AppProvider` (global state).
- While stored state loads from AsyncStorage it shows a spinner gate (`ready` flag).
- Whenever the saved language changes it calls `i18n.changeLanguage()` so every
  `useTranslation()` screen re-renders in the new language.
- One stack navigator, headers off (screens draw their own headers).

```tsx
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import '../src/i18n';
import { AppProvider, useApp } from '../src/store/AppStore';
import { useTranslation } from 'react-i18next';
import { colors } from '../src/theme';

function Shell() {
  const { ready, lang } = useApp();
  const { i18n } = useTranslation();

  useEffect(() => {
    i18n.changeLanguage(lang);
  }, [lang, i18n]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
```

### `app/index.tsx` — language picker (first launch)

First route in the stack. Shows brand block + two big language options; picking one
persists it and replaces the route with `/home`. The chosen option stays highlighted
if the user ever returns here.

```tsx
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
```


### `app/admin.tsx` — aggregate analytics (demo)

Reads the local application store and renders two `MiniBars` charts —
applications by status and demand by purpose (derived via each scheme's
category) — plus a static average-acknowledgement KPI. The privacy note states
that production aggregates anonymized data only. This is the "dashboard for
departments" slice of the proposal, kept honest as demo numbers.

```tsx
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, Header, Screen } from '../src/components/ui';
import { MiniBars } from '../src/components/charts';
import { useApp, STATUS_FLOW } from '../src/store/AppStore';
import { getSchemeById } from '../data/schemes';
import { colors, font, spacing } from '../src/theme';

export default function Admin() {
  const { t } = useTranslation();
  const { applications } = useApp();

  const byStatus = useMemo(
    () =>
      STATUS_FLOW.map((s) => ({
        label: t(`status.${s}`).slice(0, 6),
        value: applications.filter((a) => a.status === s).length,
        color:
          s === 'sanctioned'
            ? colors.ok
            : s === 'under_review'
              ? colors.warn
              : colors.primary,
      })),
    [applications, t]
  );

  const byPurpose = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of applications) {
      const cat = getSchemeById(a.schemeId)?.category ?? 'other';
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([label, value]) => ({
      label: label.slice(0, 7),
      value,
    }));
  }, [applications]);

  return (
    <Screen>
      <Header title={t('admin.title')} subtitle={t('admin.subtitle')} />

      <Card>
        <Text style={styles.chartTitle}>{t('admin.appsByStatus')}</Text>
        <MiniBars data={byStatus} />
      </Card>

      <Card>
        <Text style={styles.chartTitle}>{t('admin.demandByPurpose')}</Text>
        {byPurpose.length > 0 ? (
          <MiniBars data={byPurpose} />
        ) : (
          <Text style={styles.empty}>{t('track.emptyTitle')}</Text>
        )}
      </Card>

      <Card tone="info">
        <Text style={styles.kpiLabel}>{t('admin.avgAck')}</Text>
        <Text style={styles.kpiValue}>2.4 {t('common.loading') === '' ? '' : 'days'}</Text>
      </Card>

      <Card>
        <Text style={styles.note}>{t('admin.note')}</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chartTitle: { fontSize: font.small, fontWeight: '800', color: colors.ink, marginBottom: spacing.m },
  empty: { fontSize: font.tiny, color: colors.faint },
  kpiLabel: { fontSize: font.tiny, fontWeight: '700', color: colors.info },
  kpiValue: { fontSize: font.title, fontWeight: '900', color: colors.primaryDark, marginTop: spacing.xs },
  note: { fontSize: font.tiny, color: colors.faint, lineHeight: 17 },
});
```

---

## 10. App entry (`app/_layout.tsx`, `app/index.tsx`)

### `app/_layout.tsx` — providers + i18n bootstrap

Root layout wraps the navigator in `SafeAreaProvider` + our `AppProvider`,
waits for storage hydration before rendering, and re-points i18next whenever the
stored language changes.

```tsx
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from '../src/store/AppStore';
import i18n from '../src/i18n';
import { colors } from '../src/theme';

function Inner() {
  const { ready, lang } = useApp();

  useEffect(() => {
    if (ready) i18n.changeLanguage(lang);
  }, [ready, lang]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      />
    </>
  );
}

export default function Layout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Inner />
      </AppProvider>
    </SafeAreaProvider>
  );
}
```

### `app/index.tsx` — language gate (first launch)

The only screen that hard-requires a choice. Both buttons persist the language
and replace to `/home`. Returning users can still change language later in
Settings; this gate is just a friendly front door.

```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton, Screen, SecondaryButton } from '../src/components/ui';
import { useApp } from '../src/store/AppStore';
import { colors, font, spacing } from '../src/theme';

export default function LanguageGate() {
  const { t } = useTranslation();
  const { setLang } = useApp();

  const go = (l: 'en' | 'hi') => {
    setLang(l);
    router.replace('/home');
  };

  return (
    <Screen scroll={false}>
      <View style={styles.center}>
        <View style={styles.logo}>
          <Ionicons name="sparkles" size={40} color="#fff" />
        </View>
        <Text style={styles.appName}>{t('common.appName')}</Text>
        <Text style={styles.tagline}>{t('common.tagline')}</Text>

        <Text style={styles.title}>{t('lang.title')}</Text>
        <Text style={styles.subtitle}>{t('lang.subtitle')}</Text>

        <View style={styles.buttons}>
          <PrimaryButton label="English" onPress={() => go('en')} />
          <SecondaryButton label="हिंदी" onPress={() => go('hi')} />
        </View>

        <Text style={styles.footer}>{t('common.psLine')}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.l,
  },
  appName: { fontSize: font.title + 4, fontWeight: '900', color: colors.ink, textAlign: 'center' },
  tagline: {
    fontSize: font.tiny,
    color: colors.faint,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xxl,
  },
  title: { fontSize: font.h2, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  subtitle: { fontSize: font.small, color: colors.muted, textAlign: 'center', marginTop: spacing.xs },
  buttons: { gap: spacing.m, marginTop: spacing.xl },
  footer: { fontSize: font.tiny, color: colors.faint, textAlign: 'center', marginTop: spacing.xxl },
});
```


### `app/partners.tsx` — compliant routing with visible gates

Reads `?scheme=<id>`, resolves the user's district from the stored profile, then
calls `fetchNearbyPartners`. The full routing contract is visible in the UI:

- Header shows the active radius ("within 25 km") and, when the radius had to
  widen, an explicit banner explains why (the fallback story is a feature).
- Every partner card carries: distance chip, availability chip (open/busy),
  compliance chips — green "compliance gate passed" or amber "e-KYC setup
  pending" so users see *why* a partner was included/excluded.
- `lastVerified` date is shown so stale directory data is never hidden.
- Map preview is honest about connectivity: a button opens OpenStreetMap at the
  user's district; the ranked list itself is fully offline.
- Empty state after expansion offers the district-SCA escape hatch.

```tsx
import React, { useCallback, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
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
import { NearbyPartnersResult, fetchNearbyPartners } from '../src/services/api';
import { getSchemeById } from '../data/schemes';
import { findDistrict } from '../data/districts';
import { formatDate } from '../src/utils';
import { colors, font, spacing } from '../src/theme';

export default function Partners() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ scheme?: string }>();
  const schemeId = String(params.scheme ?? '');
  const scheme = getSchemeById(schemeId);
  const { lang, profile } = useApp();
  const [data, setData] = useState<NearbyPartnersResult | null>(null);

  const districtName = profile?.district ?? 'Bhopal';

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      if (!schemeId) return;
      setData(null);
      fetchNearbyPartners(schemeId, districtName).then((r) => {
        if (alive) setData(r);
      });
      return () => {
        alive = false;
      };
    }, [schemeId, districtName])
  );

  if (!scheme) {
    return (
      <Screen>
        <Header title={t('partners.title')} />
        <PrimaryButton label={t('common.back')} onPress={() => router.back()} />
      </Screen>
    );
  }

  const origin = findDistrict(districtName);
  const openMap = () => {
    if (!origin) return;
    const url = `https://www.openstreetmap.org/#map=11/${origin.lat}/${origin.lng}`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <Screen>
      <Header title={t('partners.title')} subtitle={`${scheme.code} · ${scheme.name[lang]}`} />

      {data ? (
        <>
          <Text style={styles.radius}>
            {t('partners.within', { km: data.radiusKm })} · {districtName}
          </Text>
          {data.expanded ? (
            <Card tone="warn">
              <Text style={styles.expandedNote}>{t('partners.expandedNote')}</Text>
            </Card>
          ) : null}
        </>
      ) : null}

      {!data ? <SkeletonList rows={3} /> : null}

      {data && data.items.length === 0 ? (
        <EmptyState icon="location" title={t('partners.noneTitle')} body={t('partners.noneBody')} />
      ) : null}

      {data
        ? data.items.map(({ partner, distanceKm }) => (
            <Card key={partner.id}>
              <Text style={styles.pName}>{partner.name}</Text>
              <View style={styles.chipRow}>
                <Chip label={`${partner.type}`} tone="info" icon="business" />
                <Chip label={t('common.kmAway', { km: distanceKm })} tone="neutral" icon="navigate" />
                <Chip
                  label={partner.availability === 'open' ? t('partners.open') : t('partners.busy')}
                  tone={partner.availability === 'open' ? 'ok' : 'warn'}
                  icon={partner.availability === 'open' ? 'checkmark-circle' : 'time'}
                />
              </View>
              <View style={styles.chipRow}>
                {partner.npaCompliant ? (
                  <Chip label={t('partners.npaOk')} tone="ok" icon="shield-checkmark" />
                ) : null}
                {!partner.kycEnabled ? (
                  <Chip label={t('partners.kycPending')} tone="warn" icon="id-card" />
                ) : null}
              </View>
              <Text style={styles.verified}>
                {t('partners.lastVerified', { date: formatDate(partner.lastVerified, lang) })}
              </Text>
              <PrimaryButton
                label={t('partners.selectCta')}
                onPress={() => router.push(`/apply?scheme=${scheme.id}&partner=${partner.id}`)}
              />
            </Card>
          ))
        : null}

      <Card>
        <SecondaryButton label={t('partners.mapCaption')} icon="map" onPress={openMap} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  radius: { fontSize: font.small, fontWeight: '700', color: colors.muted, marginBottom: spacing.m },
  expandedNote: { fontSize: font.tiny, color: colors.warn, fontWeight: '700' },
  pName: { fontSize: font.body, fontWeight: '800', color: colors.ink },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s, marginTop: spacing.s },
  verified: { fontSize: font.tiny, color: colors.faint, marginVertical: spacing.m },
});
```

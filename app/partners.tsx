import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import {
  Card,
  Chip,
  EmptyState,
  Header,
  PrimaryButton,
  Screen,
  SkeletonList,
} from '../src/components/ui';
import { useApp } from '../src/store/AppStore';
import { fetchNearbyPartners, NearbyPartnersResult } from '../src/services/api';
import { getSchemeById } from '../data/schemes';
import { findDistrict } from '../data/districts';
import { formatDate, lt } from '../src/utils';
import { colors, font, spacing } from '../src/theme';

function buildMapHtml(
  originLat: number,
  originLng: number,
  points: { lat: number; lng: number; name: string; rank: number }[]
): string {
  const markers = points
    .map(
      (p) =>
        `L.circleMarker([${p.lat}, ${p.lng}], {radius:8, color:'#0E7C66', fillColor:'#0E7C66', fillOpacity:0.9}).addTo(map).bindPopup('<b>#${p.rank}</b> ${p.name.replace(/'/g, '')}');`
    )
    .join('\n');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#m{height:100%;margin:0;padding:0}</style></head>
<body><div id="m"></div><script>
var map=L.map('m').setView([${originLat}, ${originLng}], 10);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap'}).addTo(map);
L.circleMarker([${originLat}, ${originLng}],{radius:9,color:'#1D4ED8',fillColor:'#1D4ED8',fillOpacity:0.9}).addTo(map).bindPopup('You');
${markers}
</script></body></html>`;
}

export default function Partners() {
  const { t } = useTranslation();
  const lang = useApp().lang;
  const { schemeId } = useLocalSearchParams<{ schemeId?: string }>();
  const { profile } = useApp();
  const [data, setData] = useState<NearbyPartnersResult | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const scheme = schemeId ? getSchemeById(schemeId) : undefined;
  const district = profile ? findDistrict(profile.district) : undefined;

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      if (!scheme || !profile) return;
      setData(null);
      fetchNearbyPartners(scheme.id, profile.district).then((r) => alive && setData(r));
      return () => {
        alive = false;
      };
    }, [scheme, profile])
  );

  if (!scheme || !profile || !district) {
    return (
      <Screen>
        <Header title={t('partners.title')} />
        <EmptyState icon="map" title={t('match.emptyTitle')} body={t('match.emptyBody')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Header
        title={t('partners.title')}
        subtitle={lt(scheme.name, lang)}
      />

      {!data ? (
        <>
          <SkeletonList rows={3} />
          <Text style={styles.loadingLabel}>{t('common.loading')}</Text>
        </>
      ) : data.items.length === 0 ? (
        <EmptyState icon="location" title={t('partners.noneTitle')} body={t('partners.noneBody')} />
      ) : (
        <>
          {data.expanded ? (
            <Card tone="warn" style={{ paddingVertical: spacing.m }}>
              <View style={styles.noteRow}>
                <Ionicons name="expand" size={16} color={colors.warn} />
                <Text style={styles.noteText}>{t('partners.expandedNote')}</Text>
              </View>
            </Card>
          ) : null}
          <Chip label={t('partners.within', { km: data.radiusKm })} tone="info" icon="locate" />

          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <WebView
              source={{ html: buildMapHtml(district.lat, district.lng, data.items.map((x, i) => ({ lat: x.partner.lat, lng: x.partner.lng, name: x.partner.name, rank: i + 1 }))) }}
              style={{ height: 220, width: '100%' }}
              scrollEnabled={false}
            />
            <View style={{ padding: spacing.s }}>
              <Text style={styles.mapCaption}>{t('partners.mapCaption')}</Text>
            </View>
          </Card>

          {data.items.map((item, i) => {
            const p = item.partner;
            const active = selectedId === p.id;
            return (
              <Card key={p.id} tone={active ? 'ok' : undefined}>
                <View style={styles.rowBetween}>
                  <View style={[styles.rank, active && { backgroundColor: colors.primary }]}>
                    <Text style={[styles.rankText, active && { color: '#fff' }]}>#{i + 1}</Text>
                  </View>
                  <Chip
                    label={p.availability === 'open' ? t('partners.open') : t('partners.busy')}
                    tone={p.availability === 'open' ? 'ok' : 'warn'}
                    icon="pulse"
                  />
                  <Chip label={p.type} />
                </View>
                <Text style={styles.pName}>{p.name}</Text>
                <Text style={styles.pCity}>
                  {p.city} · {t('common.kmAway', { km: item.distanceKm })}
                </Text>
                <View style={styles.chipRow}>
                  <Chip label={t('partners.npaOk')} tone="ok" icon="shield-checkmark" />
                  {formatDate(p.lastVerified, lang) ? (
                    <Text style={styles.verified}>{t('partners.lastVerified', { date: formatDate(p.lastVerified, lang) })}</Text>
                  ) : null}
                </View>
                <PrimaryButton
                  label={active ? t('common.confirm') : t('partners.selectCta')}
                  onPress={() => {
                    setSelectedId(p.id);
                    router.push({ pathname: '/apply', params: { schemeId: scheme.id, partnerId: p.id } });
                  }}
                />
              </Card>
            );
          })}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingLabel: { textAlign: 'center', color: colors.faint, fontSize: font.small, marginTop: spacing.m },
  noteRow: { flexDirection: 'row', gap: spacing.s, alignItems: 'center' },
  noteText: { flex: 1, fontSize: font.small, color: colors.warn, fontWeight: '600' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  rank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontWeight: '900', color: colors.primaryDark, fontSize: font.small },
  pName: { fontSize: font.body, fontWeight: '800', color: colors.ink, marginTop: spacing.m },
  pCity: { fontSize: font.small, color: colors.muted, marginTop: 2 },
  chipRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.m, marginBottom: spacing.m },
  verified: { fontSize: font.tiny, color: colors.faint },
  mapCaption: { fontSize: font.tiny, color: colors.faint },
});

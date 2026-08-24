import { Application, BeneficiaryProfile, MatchResult } from '../engine/types';
import { matchSchemes } from '../engine/rules';
import { PARTNERS } from '../../data/partners';
import { DISTRICTS, findDistrict } from '../../data/districts';
import { haversineKm } from '../utils';
import { Partner } from '../engine/types';

function delay(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

export interface NearbyPartnersResult {
  radiusKm: number;
  expanded: boolean;
  items: { partner: Partner; distanceKm: number }[];
}

export async function fetchMatchResults(profile: BeneficiaryProfile): Promise<MatchResult[]> {
  await delay(650);
  return matchSchemes(profile);
}

export async function fetchNearbyPartners(
  schemeId: string,
  districtName: string
): Promise<NearbyPartnersResult> {
  await delay(750);
  const origin = findDistrict(districtName) ?? DISTRICTS[0];
  const radii = [25, 50, 100];
  let chosen = radii[radii.length - 1];
  let gated: { partner: Partner; distanceKm: number }[] = [];

  for (const r of radii) {
    gated = PARTNERS.filter((p) => p.authorizedSchemes.includes(schemeId))
      .filter((p) => p.npaCompliant && p.kycEnabled)
      .map((p) => ({ partner: p, distanceKm: Math.round(haversineKm(origin.lat, origin.lng, p.lat, p.lng)) }))
      .filter((x) => x.distanceKm <= r);
    if (gated.length >= 3) {
      chosen = r;
      break;
    }
  }

  gated.sort((a, b) => a.distanceKm - b.distanceKm || (a.partner.availability === 'open' ? -1 : 1));
  return {
    radiusKm: chosen,
    expanded: chosen > radii[0],
    items: gated.slice(0, 3),
  };
}

const ALNUM = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateTrackingId(): string {
  let s = '';
  for (let i = 0; i < 5; i++) s += ALNUM[Math.floor(Math.random() * ALNUM.length)];
  return `FS-2026-${s}`;
}

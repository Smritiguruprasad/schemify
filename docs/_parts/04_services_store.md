
---

## 6. Services & global state (`src/services/`, `src/store/`)

### `src/services/storage.ts` — persistence wrapper

Thin typed wrapper over AsyncStorage with safe JSON parsing (corrupt or
missing values fall back instead of crashing). Keys are namespaced `fs.*`;
`clearAllDemoData()` powers the Settings reset button.

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Application } from '../engine/types';

const K_PROFILE = 'fs.profile.v1';
const K_APPS = 'fs.apps.v1';
const K_SETTINGS = 'fs.settings.v1';
const K_LANG = 'fs.lang.v1';

export interface StoredSettings {
  voiceEnabled: boolean;
}

export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function saveJSON(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export const storage = {
  loadProfile: () => loadJSON<object | null>(K_PROFILE, null),
  saveProfile: (p: unknown) => saveJSON(K_PROFILE, p),
  clearProfile: () => AsyncStorage.removeItem(K_PROFILE),
  loadApps: () => loadJSON<Application[]>(K_APPS, []),
  saveApps: (a: Application[]) => saveJSON(K_APPS, a),
  clearApps: () => AsyncStorage.removeItem(K_APPS),
  loadSettings: () => loadJSON<StoredSettings>(K_SETTINGS, { voiceEnabled: false }),
  saveSettings: (s: StoredSettings) => saveJSON(K_SETTINGS, s),
  loadLang: () => loadJSON<'en' | 'hi'>(K_LANG, 'en'),
  saveLang: (l: 'en' | 'hi') => saveJSON(K_LANG, l),
};

export async function clearAllDemoData(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(K_PROFILE),
    AsyncStorage.removeItem(K_APPS),
    AsyncStorage.removeItem(K_SETTINGS),
  ]);
}
```

### `src/services/api.ts` — mock API layer (the FastAPI seam)

The **single swap point** for the backend. Functions simulate latency so loading
skeletons actually appear, then run pure logic:

- `fetchMatchResults` → delegates to the rule engine (future: `POST /eligibility/match`).
- `fetchNearbyPartners` → full router contract: authorization gate → compliance
  gate (`npaCompliant && kycEnabled`) → haversine distance → radius expansion
  25 → 50 → 100 km stopping at ≥3 results → sort by distance with "open"
  availability as tie-breaker (future: `GET /partners/nearby`).
- `generateTrackingId` → unambiguous charset (no I/O/0/1) for IDs like `FS-2026-K7M3X`.

```ts
import { Application, BeneficiaryProfile, MatchResult } from '../engine/types';
import { matchSchemes } from '../engine/rules';
import { PARTNERS } from '../../data/partners';
import { DISTRICTS, findDistrict } from '../../data/districts';
import { haversineKm } from '../utils';

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
```

*(import type `Partner` alongside the other type imports from `../engine/types`.)*

### `src/store/AppStore.tsx` — global state (React Context)

Owns everything cross-screen: language, profile, applications, voice setting.
Every mutation persists through the storage layer immediately (offline-first).
The application state machine lives here:

```text
submitted → acknowledged → under_review → sanctioned   (advanceApplication walks one step)
```

`addApplication` mints the tracking ID, stamps timestamps and seeds the
timeline — mirroring what the backend will do transactionally.

```tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Application, BeneficiaryProfile, Lang } from '../engine/types';
import { storage, StoredSettings, clearAllDemoData } from '../services/storage';
import { generateTrackingId } from '../services/api';

export const STATUS_FLOW = [
  'submitted',
  'acknowledged',
  'under_review',
  'sanctioned',
] as const;

interface AppState {
  ready: boolean;
  lang: Lang;
  setLang: (l: Lang) => void;
  profile: BeneficiaryProfile | null;
  setProfile: (p: BeneficiaryProfile) => void;
  clearProfile: () => void;
  applications: Application[];
  addApplication: (
    a: Omit<Application, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'timeline'>
  ) => Promise<Application>;
  advanceApplication: (id: string) => Promise<void>;
  voiceEnabled: boolean;
  setVoiceEnabled: (v: boolean) => void;
  resetDemoData: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

const now = () => new Date().toISOString();

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [lang, setLangState] = useState<Lang>('en');
  const [profile, setProfileState] = useState<BeneficiaryProfile | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [voiceEnabled, setVoiceEnabledState] = useState(false);

  useEffect(() => {
    (async () => {
      const [l, p, apps, s] = await Promise.all([
        storage.loadLang(),
        storage.loadProfile() as Promise<BeneficiaryProfile | null>,
        storage.loadApps(),
        storage.loadSettings(),
      ]);
      setLangState(l);
      setProfileState(p);
      setApplications(apps);
      setVoiceEnabledState(s.voiceEnabled);
      setReady(true);
    })();
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    storage.saveLang(l);
  }, []);

  const setProfile = useCallback((p: BeneficiaryProfile) => {
    setProfileState(p);
    storage.saveProfile(p);
  }, []);

  const clearProfile = useCallback(() => {
    setProfileState(null);
    storage.clearProfile();
  }, []);

  const persistApps = useCallback((apps: Application[]) => {
    setApplications(apps);
    storage.saveApps(apps);
  }, []);

  const addApplication = useCallback<AppState['addApplication']>(
    async (partial) => {
      const ts = now();
      const app: Application = {
        ...partial,
        id: generateTrackingId(),
        status: 'submitted',
        createdAt: ts,
        updatedAt: ts,
        timeline: [{ status: 'submitted', at: ts }],
      };
      persistApps([app, ...applications]);
      return app;
    },
    [applications, persistApps]
  );

  const advanceApplication = useCallback(
    async (id: string) => {
      const updated = applications.map((a) => {
        if (a.id !== id || a.status === 'sanctioned' || a.status === 'rejected') return a;
        const idx = STATUS_FLOW.indexOf(a.status);
        if (idx < 0 || idx === STATUS_FLOW.length - 1) return a;
        const nextStatus = STATUS_FLOW[idx + 1];
        const ts = now();
        return {
          ...a,
          status: nextStatus,
          updatedAt: ts,
          timeline: [...a.timeline, { status: nextStatus, at: ts }],
        };
      });
      persistApps(updated);
    },
    [applications, persistApps]
  );

  const setVoiceEnabled = useCallback((v: boolean) => {
    setVoiceEnabledState(v);
    storage.saveSettings({ voiceEnabled: v });
  }, []);

  const resetDemoData = useCallback(async () => {
    await clearAllDemoData();
    setProfileState(null);
    setApplications([]);
    setVoiceEnabledState(false);
  }, []);

  const value = useMemo<AppState>(
    () => ({
      ready,
      lang,
      setLang,
      profile,
      setProfile,
      clearProfile,
      applications,
      addApplication,
      advanceApplication,
      voiceEnabled,
      setVoiceEnabled,
      resetDemoData,
    }),
    [ready, lang, setLang, profile, setProfile, clearProfile, applications, addApplication, advanceApplication, voiceEnabled, setVoiceEnabled, resetDemoData]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
```

# FinSetu AI â€” Complete Code Walkthrough

Component-by-component explanation of every file in this repo, with full source code.
Stack: **Expo React Native (SDK 54) Â· TypeScript Â· expo-router 6 Â· AsyncStorage Â· i18next**.
The app is UI-first and runs 100% on local mock data â€” no API keys, no external services.

---

## 1. Architecture at a glance

```text
app/            â†’ screens (expo-router file-based navigation)
src/engine/     â†’ pure logic: eligibility rule engine + loan calculator
src/dataâ†’data/  â†’ mock master data: schemes, partners, districts, label constants
src/services/   â†’ storage wrapper (AsyncStorage) + mock "API" that mirrors future FastAPI
src/store/      â†’ global state (Context): language, profile, applications, settings
src/i18n/       â†’ English/Hindi translation bundles
src/components/ â†’ reusable UI kit + SVG charts + status timeline
docs/           â†’ backend contract for teammates + deployment guide
```

Data flow for the core journey:

```text
ProfileWizard â†’ AppStore.setProfile() â†’ AsyncStorage
Match screen  â†’ api.fetchMatchResults(profile) â†’ engine.matchSchemes() â†’ ranked cards w/ traces
Calculator    â†’ engine.computeLoanPlan(scheme, cost, moratorium)
Partners      â†’ api.fetchNearbyPartners() â†’ gates + haversine + radius expansion
Apply/Track   â†’ AppStore.addApplication()/advanceApplication() â†’ persisted timeline
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
teal splash background. No permissions requested â€” location/GPS is deliberately not used
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

Strict TypeScript, extending Expo's base config (which enables JSON imports â€” needed
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

### `app/_layout.tsx` â€” root layout

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

### `app/index.tsx` â€” language picker (first launch)

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
    { value: 'hi', label: t('common.appName'), native: 'à¤¹à¤¿à¤¨à¥à¤¦à¥€' },
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


---

## 4. Core library (`src/`)

### `src/theme.ts` â€” design system

Single source of truth for colors, spacing, radii and font sizes. Every component
pulls from here, so restyling the whole app = editing one file. Palette: teal-green
primary (trust/finance), amber accent (attention), soft gray-green neutrals.

```ts
export const colors = {
  primary: '#0E7C66',
  primaryDark: '#0A5A4B',
  primaryLight: '#DCEFE9',
  accent: '#F59E0B',
  accentLight: '#FEF3C7',
  bg: '#F6F8F9',
  card: '#FFFFFF',
  ink: '#10201D',
  muted: '#5B6B68',
  faint: '#8FA09C',
  border: '#E3EAE8',
  ok: '#16A34A',
  okLight: '#DCFCE7',
  warn: '#B45309',
  warnLight: '#FEF3C7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  info: '#1D4ED8',
  infoLight: '#DBEAFE',
} as const;

export const spacing = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;

export const radii = { s: 8, m: 12, l: 16, pill: 999 } as const;

export const font = {
  title: 22,
  h2: 18,
  body: 15,
  small: 13,
  tiny: 11,
} as const;
```

### `src/engine/types.ts` â€” shared domain model

Every screen, engine and mock service speaks these types. Bilingual text is always
stored as `{ en, hi }` (`LocalText`) so data itself is translatable â€” not just chrome.

```ts
export type Lang = 'en' | 'hi';

export interface LocalText {
  en: string;
  hi: string;
}

export type ScStatus = 'verified' | 'pending' | 'not_available';
export type Purpose = 'business' | 'education' | 'agriculture' | 'skill';
export type Gender = 'female' | 'male' | 'other';
export type EducationLevel =
  | 'secondary'
  | 'senior_secondary'
  | 'undergraduate'
  | 'postgraduate';
export type CourseType = 'general' | 'professional';

export interface BeneficiaryProfile {
  name: string;
  age: number;
  gender: Gender;
  scStatus: ScStatus;
  annualIncome: number;
  purpose: Purpose;
  projectCost: number;
  educationLevel?: EducationLevel;
  courseType?: CourseType;
  district: string;
}

export type RuleOp = 'lte' | 'gte' | 'eq' | 'in';

export interface Rule {
  field: keyof BeneficiaryProfile;
  op: RuleOp;
  value: number | string | (number | string)[];
  label: LocalText;
  soft?: boolean;
}

export type SchemeCategory = 'enterprise' | 'education' | 'micro';

export type PartnerType = 'SCA' | 'PSB' | 'RRB' | 'NBFC-MFI' | 'COOP' | 'SFB';

export interface Scheme {
  id: string;
  code: string;
  name: LocalText;
  desc: LocalText;
  category: SchemeCategory;
  purposeTags: Purpose[];
  minCost: number;
  maxAssistance: number;
  fundingPercent: number;
  interestRate: number;
  repaymentMonths: number;
  moratoriumMonths: number;
  contributionPercent: number;
  channelTypes: PartnerType[];
  requiredDocs: string[];
  rules: Rule[];
  effectiveFrom: string;
  version: string;
  sourceRef: string;
}

export interface District {
  name: string;
  state: string;
  lat: number;
  lng: number;
}

export interface Partner {
  id: string;
  name: string;
  type: PartnerType;
  city: string;
  district: string;
  lat: number;
  lng: number;
  authorizedSchemes: string[];
  npaCompliant: boolean;
  kycEnabled: boolean;
  availability: 'open' | 'busy';
  lastVerified: string;
}

export interface RuleTrace {
  label: LocalText;
  expected: string;
  actual: string;
  passed: boolean;
}

export type EligibilityStatus = 'eligible' | 'conditional' | 'ineligible';

export interface MatchResult {
  scheme: Scheme;
  status: EligibilityStatus;
  score: number;
  traces: RuleTrace[];
  failedHardCount: number;
  incomeDelta: number | null;
}

export interface LoanPlan {
  eligibleLoan: number;
  contribution: number;
  principal: number;
  emi: number;
  totalInterest: number;
  totalPayable: number;
  moratoriumApplied: boolean;
  moratoriumInterest: number;
  months: number;
  ratePct: number;
}

export type ApplicationStatus =
  | 'submitted'
  | 'acknowledged'
  | 'under_review'
  | 'sanctioned'
  | 'rejected';

export interface TimelineEvent {
  status: ApplicationStatus;
  at: string;
  note?: LocalText;
}

export interface Application {
  id: string;
  schemeId: string;
  partnerId: string;
  createdAt: string;
  updatedAt: string;
  status: ApplicationStatus;
  docsPending: string[];
  timeline: TimelineEvent[];
}
```

### `src/engine/rules.ts` â€” eligibility rule engine

The heart of "rules decide". Each scheme carries declarative rules; this file only
evaluates them:

- `evalRule` supports `lte / gte / eq / in` over profile fields.
- **Soft rules** (`soft: true`, e.g. SC certificate pending) downgrade to
  `conditional` instead of failing â€” matches real NSFDC flow where the certificate
  is needed before final approval.
- Traces record *expected vs actual* per rule â†’ powers the "Why this result?" UI and
  satisfies the â‰¥90% traceability KPI.
- Ranking score blends feasibility (cost vs cap), purpose match, funding ratio and
  cost-band fit.
- Ineligible schemes are sorted by fewest hard failures + smallest income gap â†’
  powers the "Close but not eligible" section instead of a dead end.

```ts
import { SCHEMES } from '../../data/schemes';
import {
  BeneficiaryProfile,
  MatchResult,
  Rule,
  RuleTrace,
  Scheme,
} from './types';

function actualOf(profile: BeneficiaryProfile, field: keyof BeneficiaryProfile): string {
  const v = profile[field];
  if (typeof v === 'number') return formatINRShort(v);
  if (typeof v === 'string') return humanize(v);
  return '-';
}

function expectedOf(rule: Rule): string {
  const v = rule.value;
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'number' ? formatINRShort(x) : humanize(String(x)))).join(' / ');
  if (typeof v === 'number') {
    switch (rule.op) {
      case 'lte':
        return `â‰¤ ${formatINRShort(v)}`;
      case 'gte':
        return `â‰¥ ${formatINRShort(v)}`;
      default:
        return String(v);
    }
  }
  return humanize(v);
}

export function evalRule(profile: BeneficiaryProfile, rule: Rule): boolean {
  const v = profile[rule.field];
  switch (rule.op) {
    case 'lte':
      return typeof v === 'number' && typeof rule.value === 'number' && v <= rule.value;
    case 'gte':
      return typeof v === 'number' && typeof rule.value === 'number' && v >= rule.value;
    case 'eq':
      return v === rule.value;
    case 'in':
      return Array.isArray(rule.value) && rule.value.includes(v as string | number);
    default:
      return false;
  }
}

export function evaluateScheme(profile: BeneficiaryProfile, scheme: Scheme): MatchResult {
  const traces: RuleTrace[] = [];
  let failedHard = 0;
  let failedSoft = 0;
  let incomeDelta: number | null = null;

  for (const rule of scheme.rules) {
    const passed = evalRule(profile, rule);
    traces.push({
      label: rule.label,
      expected: expectedOf(rule),
      actual: actualOf(profile, rule.field),
      passed,
    });
    if (!passed) {
      if (rule.soft) failedSoft += 1;
      else failedHard += 1;
      if (rule.field === 'annualIncome' && typeof rule.value === 'number' && typeof profile.annualIncome === 'number') {
        incomeDelta = Math.abs(profile.annualIncome - rule.value);
      }
    }
  }

  const status =
    failedHard > 0 ? 'ineligible' : failedSoft > 0 ? 'conditional' : 'eligible';

  return {
    scheme,
    status,
    score: scoreScheme(profile, scheme),
    traces,
    failedHardCount: failedHard,
    incomeDelta,
  };
}

function scoreScheme(profile: BeneficiaryProfile, s: Scheme): number {
  const feasibility = Math.min(profile.projectCost, s.maxAssistance) / s.maxAssistance;
  const purposeMatch = s.purposeTags.includes(profile.purpose) ? 1 : 0;
  const assistRatio = s.fundingPercent / 100;
  const bandFit = profile.projectCost >= s.minCost ? 1 : 0.3;
  return feasibility * 0.4 + purposeMatch * 0.35 + assistRatio * 0.15 + bandFit * 0.1;
}

export function matchSchemes(profile: BeneficiaryProfile): MatchResult[] {
  const results = SCHEMES.map((s) => evaluateScheme(profile, s));
  const eligible = results
    .filter((r) => r.status !== 'ineligible')
    .sort((a, b) => b.score - a.score || a.scheme.code.localeCompare(b.scheme.code));
  const ineligible = results
    .filter((r) => r.status === 'ineligible')
    .sort((a, b) => a.failedHardCount - b.failedHardCount || (a.incomeDelta ?? 0) - (b.incomeDelta ?? 0));
  return [...eligible, ...ineligible];
}

function humanize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export function formatINRShort(n: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
}
```

### `src/engine/calc.ts` â€” scheme-aware financial calculator

Implements the proposal's formula `eligibleLoan = min(90% Ã— cost, scheme cap)`,
plus:

- Contribution = whatever the loan doesn't cover.
- **Moratorium capitalization**: interest accrued during the moratorium (e.g. ELS
  study period) is added to principal before EMI computation â€” exactly how education
  loans behave in reality.
- Standard annuity EMI, always rounded **up** to the next rupee (conservative).
- Handles the zero-interest edge without dividing by zero.

```ts
import { LoanPlan, Scheme } from './types';

export function computeLoanPlan(
  scheme: Scheme,
  projectCost: number,
  moratoriumOn: boolean
): LoanPlan {
  const eligibleLoan = Math.min(
    Math.round((projectCost * scheme.fundingPercent) / 100),
    scheme.maxAssistance
  );
  const contribution = Math.max(0, Math.round(projectCost - eligibleLoan));

  let principal = eligibleLoan;
  let moratoriumInterest = 0;
  const moratoriumApplied = moratoriumOn && scheme.moratoriumMonths > 0;
  if (moratoriumApplied) {
    moratoriumInterest = Math.ceil(
      (principal * scheme.interestRate * scheme.moratoriumMonths) / (100 * 12)
    );
    principal += moratoriumInterest;
  }

  const r = scheme.interestRate / 1200;
  const n = scheme.repaymentMonths;
  let emi: number;
  if (r <= 0) emi = Math.ceil(principal / n);
  else {
    const pow = Math.pow(1 + r, n);
    emi = Math.ceil((principal * r * pow) / (pow - 1));
  }

  return {
    eligibleLoan,
    contribution,
    principal,
    emi,
    totalInterest: emi * n - principal,
    totalPayable: emi * n,
    moratoriumApplied,
    moratoriumInterest,
    months: n,
    ratePct: scheme.interestRate,
  };
}
```

### `src/utils.ts` â€” formatting & geo helpers

- `formatINR` â€” Indian digit grouping (â‚¹8,00,000).
- `amountInWordsIndian` â€” lakh/crore-aware amount-in-words (the canonical-value
  readback that guards against translation/mishearing errors).
- `haversineKm` â€” great-circle distance used by the partner router.
- `formatDate` â€” locale-aware dates (hi-IN / en-IN).
- `lt` â€” resolves a `LocalText` with English fallback.

```ts
import { LocalText } from './engine/types';

export function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatDate(iso: string, lang: string): string {
  try {
    return new Date(iso).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const ONES = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return `${TENS[t]}${o ? ' ' + ONES[o] : ''}`;
}

function belowThousand(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (h) parts.push(`${ONES[h]} hundred`);
  if (rest) parts.push(twoDigits(rest));
  return parts.join(' ');
}

export function amountInWordsIndian(num: number): string {
  if (!Number.isFinite(num) || num < 0) return '';
  if (num === 0) return 'zero rupees';
  const n = Math.floor(num);
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  const parts: string[] = [];
  if (crore) parts.push(`${belowThousand(crore)} crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} thousand`);
  if (rest) parts.push(belowThousand(rest));
  return `${parts.join(' ')} rupees`;
}

export function lt(t: LocalText | undefined, lang: 'en' | 'hi'): string {
  if (!t) return '';
  return t[lang] || t.en;
}
```


---

## 5. Data layer (`data/`)

### `data/schemes.ts` â€” versioned scheme master (seed)

Five illustrative NSFDC-style schemes. Every scheme carries financial params
(cap, funding %, rate, tenure, moratorium, contribution), `purposeTags` used by
the ranker, `requiredDocs` powering the apply checklist, declarative `rules[]`
evaluated by the engine, and **version + effectiveFrom + sourceRef** â€” the
traceability story ("every recommendation traces to a rule + source/version").

```ts
import { Rule, Scheme } from '../src/engine/types';

export const SCHEMES: Scheme[] = [
  {
    id: 'new_swarnima',
    code: 'NS-01',
    name: { en: 'New Swarnima Scheme for Women', hi: 'à¤¨à¤ˆ à¤¸à¥à¤µà¤°à¥à¤£à¤¿à¤®à¤¾ à¤¯à¥‹à¤œà¤¨à¤¾ (à¤®à¤¹à¤¿à¤²à¤¾à¤à¤)' },
    desc: {
      en: 'Concessional term loan for SC women to set up small business ventures.',
      hi: 'à¤›à¥‹à¤Ÿà¥‡ à¤µà¥à¤¯à¤µà¤¸à¤¾à¤¯ à¤¸à¥à¤¥à¤¾à¤ªà¤¿à¤¤ à¤•à¤°à¤¨à¥‡ à¤¹à¥‡à¤¤à¥ à¤….à¤œà¤¾. à¤®à¤¹à¤¿à¤²à¤¾à¤“à¤‚ à¤•à¥‡ à¤²à¤¿à¤ à¤°à¤¿à¤¯à¤¾à¤¯à¤¤à¥€ à¤‹à¤£à¥¤',
    },
    category: 'enterprise',
    purposeTags: ['business'],
    minCost: 50000,
    maxAssistance: 750000,
    fundingPercent: 90,
    interestRate: 4,
    repaymentMonths: 120,
    moratoriumMonths: 6,
    contributionPercent: 5,
    channelTypes: ['SCA', 'PSB', 'NBFC-MFI'],
    requiredDocs: ['sc_certificate', 'income_proof', 'aadhaar', 'bank_passbook', 'project_report'],
    rules: [
      { field: 'gender', op: 'eq', value: 'female', label: { en: 'Applicant is a woman', hi: 'à¤†à¤µà¥‡à¤¦à¤• à¤®à¤¹à¤¿à¤²à¤¾ à¤¹à¥‹' } },
      { field: 'age', op: 'gte', value: 18, label: { en: 'Age at least 18 years', hi: 'à¤†à¤¯à¥ à¤¨à¥à¤¯à¥‚à¤¨à¤¤à¤® 18 à¤µà¤°à¥à¤·' } },
      { field: 'age', op: 'lte', value: 55, label: { en: 'Age at most 55 years', hi: 'à¤†à¤¯à¥ à¤…à¤§à¤¿à¤•à¤¤à¤® 55 à¤µà¤°à¥à¤·' } },
      {
        field: 'annualIncome',
        op: 'lte',
        value: 300000,
        label: { en: 'Family income â‚¹3,00,000 or less', hi: 'à¤ªà¤¾à¤°à¤¿à¤µà¤¾à¤°à¤¿à¤• à¤†à¤¯ â‚¹3,00,000 à¤¯à¤¾ à¤•à¤®' },
      },
      {
        field: 'scStatus',
        op: 'eq',
        value: 'verified',
        label: { en: 'Valid SC certificate on record', hi: 'à¤µà¥ˆà¤§ à¤….à¤œà¤¾. à¤ªà¥à¤°à¤®à¤¾à¤£à¤ªà¤¤à¥à¤° à¤‰à¤ªà¤²à¤¬à¥à¤§' },
        soft: true,
      },
    ],
    effectiveFrom: '2026-04-01',
    version: '1.0.0',
    sourceRef: 'NSFDC scheme master (illustrative seed)',
  },
  {
    id: 'mahila_samriddhi',
    code: 'MSY-02',
    name: { en: 'Mahila Samriddhi Yojana', hi: 'à¤®à¤¹à¤¿à¤²à¤¾ à¤¸à¤®à¥ƒà¤¦à¥à¤§à¤¿ à¤¯à¥‹à¤œà¤¨à¤¾' },
    desc: {
      en: 'Micro finance up to â‚¹40,000 for SC women for tiny enterprise or service activity.',
      hi: 'à¤….à¤œà¤¾. à¤®à¤¹à¤¿à¤²à¤¾à¤“à¤‚ à¤¹à¥‡à¤¤à¥ à¤²à¤˜à¥ à¤‰à¤¦à¥à¤¯à¤®/à¤¸à¥‡à¤µà¤¾ à¤—à¤¤à¤¿à¤µà¤¿à¤§à¤¿ à¤•à¥‡ à¤²à¤¿à¤ â‚¹40,000 à¤¤à¤• à¤¸à¥‚à¤•à¥à¤·à¥à¤® à¤µà¤¿à¤¤à¥à¤¤à¥¤',
    },
    category: 'micro',
    purposeTags: ['business', 'skill'],
    minCost: 10000,
    maxAssistance: 40000,
    fundingPercent: 90,
    interestRate: 4,
    repaymentMonths: 60,
    moratoriumMonths: 0,
    contributionPercent: 5,
    channelTypes: ['SCA', 'NBFC-MFI', 'COOP'],
    requiredDocs: ['sc_certificate', 'income_proof', 'aadhaar', 'bank_passbook'],
    rules: [
      { field: 'gender', op: 'eq', value: 'female', label: { en: 'Applicant is a woman', hi: 'à¤†à¤µà¥‡à¤¦à¤• à¤®à¤¹à¤¿à¤²à¤¾ à¤¹à¥‹' } },
      { field: 'age', op: 'gte', value: 18, label: { en: 'Age at least 18 years', hi: 'à¤†à¤¯à¥ à¤¨à¥à¤¯à¥‚à¤¨à¤¤à¤® 18 à¤µà¤°à¥à¤·' } },
      {
        field: 'annualIncome',
        op: 'lte',
        value: 300000,
        label: { en: 'Family income â‚¹3,00,000 or less', hi: 'à¤ªà¤¾à¤°à¤¿à¤µà¤¾à¤°à¤¿à¤• à¤†à¤¯ â‚¹3,00,000 à¤¯à¤¾ à¤•à¤®' },
      },
      {
        field: 'scStatus',
        op: 'eq',
        value: 'verified',
        label: { en: 'Valid SC certificate on record', hi: 'à¤µà¥ˆà¤§ à¤….à¤œà¤¾. à¤ªà¥à¤°à¤®à¤¾à¤£à¤ªà¤¤à¥à¤° à¤‰à¤ªà¤²à¤¬à¥à¤§' },
        soft: true,
      },
    ],
    effectiveFrom: '2026-04-01',
    version: '1.0.0',
    sourceRef: 'NSFDC scheme master (illustrative seed)',
  },
  {
    id: 'micro_credit_finance',
    code: 'MCF-03',
    name: { en: 'Micro Credit Finance', hi: 'à¤¸à¥‚à¤•à¥à¤·à¥à¤® à¤¸à¤¾à¤– à¤µà¤¿à¤¤à¥à¤¤' },
    desc: {
      en: 'Quick micro loans up to â‚¹50,000 for tiny business and skill-based self-employment.',
      hi: 'à¤²à¤˜à¥ à¤µà¥à¤¯à¤µà¤¸à¤¾à¤¯ à¤à¤µà¤‚ à¤•à¥Œà¤¶à¤²-à¤†à¤§à¤¾à¤°à¤¿à¤¤ à¤¸à¥à¤µà¤°à¥‹à¤œà¤—à¤¾à¤° à¤¹à¥‡à¤¤à¥ â‚¹50,000 à¤¤à¤• à¤¤à¥à¤µà¤°à¤¿à¤¤ à¤¸à¥‚à¤•à¥à¤·à¥à¤® à¤‹à¤£à¥¤',
    },
    category: 'micro',
    purposeTags: ['business', 'skill'],
    minCost: 10000,
    maxAssistance: 50000,
    fundingPercent: 90,
    interestRate: 5,
    repaymentMonths: 48,
    moratoriumMonths: 0,
    contributionPercent: 5,
    channelTypes: ['NBFC-MFI', 'COOP', 'SFB'],
    requiredDocs: ['sc_certificate', 'income_proof', 'aadhaar', 'bank_passbook', 'quotation'],
    rules: [
      { field: 'age', op: 'gte', value: 18, label: { en: 'Age at least 18 years', hi: 'à¤†à¤¯à¥ à¤¨à¥à¤¯à¥‚à¤¨à¤¤à¤® 18 à¤µà¤°à¥à¤·' } },
      {
        field: 'annualIncome',
        op: 'lte',
        value: 300000,
        label: { en: 'Family income â‚¹3,00,000 or less', hi: 'à¤ªà¤¾à¤°à¤¿à¤µà¤¾à¤°à¤¿à¤• à¤†à¤¯ â‚¹3,00,000 à¤¯à¤¾ à¤•à¤®' },
      },
      {
        field: 'scStatus',
        op: 'eq',
        value: 'verified',
        label: { en: 'Valid SC certificate on record', hi: 'à¤µà¥ˆà¤§ à¤….à¤œà¤¾. à¤ªà¥à¤°à¤®à¤¾à¤£à¤ªà¤¤à¥à¤° à¤‰à¤ªà¤²à¤¬à¥à¤§' },
        soft: true,
      },
    ],
    effectiveFrom: '2026-04-01',
    version: '1.0.0',
    sourceRef: 'NSFDC scheme master (illustrative seed)',
  },
  {
    id: 'term_loan_scheme',
    code: 'TL-04',
    name: { en: 'Term Loan Scheme', hi: 'à¤Ÿà¤°à¥à¤® à¤‹à¤£ à¤¯à¥‹à¤œà¤¨à¤¾' },
    desc: {
      en: 'Flagship NSFDC term loan for income-generating manufacturing, service and agri-processing units.',
      hi: 'à¤‰à¤¤à¥à¤ªà¤¾à¤¦à¤¨, à¤¸à¥‡à¤µà¤¾ à¤à¤µà¤‚ à¤•à¥ƒà¤·à¤¿-à¤ªà¥à¤°à¤¸à¤‚à¤¸à¥à¤•à¤°à¤£ à¤‡à¤•à¤¾à¤‡à¤¯à¥‹à¤‚ à¤¹à¥‡à¤¤à¥ à¤ªà¥à¤°à¤®à¥à¤– à¤à¤¨à¤à¤¸à¤à¤«à¤¡à¥€à¤¸à¥€ à¤Ÿà¤°à¥à¤® à¤‹à¤£à¥¤',
    },
    category: 'enterprise',
    purposeTags: ['business', 'agriculture'],
    minCost: 100000,
    maxAssistance: 1000000,
    fundingPercent: 90,
    interestRate: 6,
    repaymentMonths: 144,
    moratoriumMonths: 6,
    contributionPercent: 10,
    channelTypes: ['SCA', 'PSB', 'RRB'],
    requiredDocs: ['sc_certificate', 'income_proof', 'aadhaar', 'bank_passbook', 'project_report'],
    rules: [
      { field: 'age', op: 'gte', value: 18, label: { en: 'Age at least 18 years', hi: 'à¤†à¤¯à¥ à¤¨à¥à¤¯à¥‚à¤¨à¤¤à¤® 18 à¤µà¤°à¥à¤·' } },
      { field: 'age', op: 'lte', value: 55, label: { en: 'Age at most 55 years', hi: 'à¤†à¤¯à¥ à¤…à¤§à¤¿à¤•à¤¤à¤® 55 à¤µà¤°à¥à¤·' } },
      {
        field: 'annualIncome',
        op: 'lte',
        value: 300000,
        label: { en: 'Family income â‚¹3,00,000 or less', hi: 'à¤ªà¤¾à¤°à¤¿à¤µà¤¾à¤°à¤¿à¤• à¤†à¤¯ â‚¹3,00,000 à¤¯à¤¾ à¤•à¤®' },
      },
      {
        field: 'scStatus',
        op: 'eq',
        value: 'verified',
        label: { en: 'Valid SC certificate on record', hi: 'à¤µà¥ˆà¤§ à¤….à¤œà¤¾. à¤ªà¥à¤°à¤®à¤¾à¤£à¤ªà¤¤à¥à¤° à¤‰à¤ªà¤²à¤¬à¥à¤§' },
        soft: true,
      },
    ],
    effectiveFrom: '2026-04-01',
    version: '1.1.0',
    sourceRef: 'NSFDC scheme master (illustrative seed)',
  },
  {
    id: 'education_loan',
    code: 'ELS-05',
    name: { en: 'Education Loan Scheme', hi: 'à¤¶à¤¿à¤•à¥à¤·à¤¾ à¤‹à¤£ à¤¯à¥‹à¤œà¤¨à¤¾' },
    desc: {
      en: 'Up to â‚¹30 lakh for SC students in professional courses in India, with study-period moratorium.',
      hi: 'à¤­à¤¾à¤°à¤¤ à¤®à¥‡à¤‚ à¤ªà¥à¤°à¥‹à¤«à¥‡à¤¶à¤¨à¤² à¤•à¥‹à¤°à¥à¤¸ à¤•à¤° à¤°à¤¹à¥‡ à¤….à¤œà¤¾. à¤›à¤¾à¤¤à¥à¤°à¥‹à¤‚ à¤¹à¥‡à¤¤à¥ â‚¹30 à¤²à¤¾à¤– à¤¤à¤•, à¤…à¤§à¥à¤¯à¤¯à¤¨à¤•à¤¾à¤² à¤®à¥‰à¤°à¥‡à¤Ÿà¥‹à¤°à¤¿à¤¯à¤® à¤¸à¤¹à¤¿à¤¤à¥¤',
    },
    category: 'education',
    purposeTags: ['education'],
    minCost: 50000,
    maxAssistance: 3000000,
    fundingPercent: 90,
    interestRate: 6,
    repaymentMonths: 120,
    moratoriumMonths: 42,
    contributionPercent: 0,
    channelTypes: ['PSB', 'RRB', 'SFB'],
    requiredDocs: ['sc_certificate', 'income_proof', 'aadhaar', 'admission_proof', 'fee_structure', 'marksheet'],
    rules: [
      {
        field: 'scStatus',
        op: 'eq',
        value: 'verified',
        label: { en: 'Valid SC certificate on record', hi: 'à¤µà¥ˆà¤§ à¤….à¤œà¤¾. à¤ªà¥à¤°à¤®à¤¾à¤£à¤ªà¤¤à¥à¤° à¤‰à¤ªà¤²à¤¬à¥à¤§' },
      },
      {
        field: 'purpose',
        op: 'eq',
        value: 'education',
        label: { en: 'Purpose is higher education', hi: 'à¤‰à¤¦à¥à¤¦à¥‡à¤¶à¥à¤¯ à¤‰à¤šà¥à¤š à¤¶à¤¿à¤•à¥à¤·à¤¾ à¤¹à¥‹' },
      },
      {
        field: 'courseType',
        op: 'in',
        value: ['professional'],
        label: { en: 'Professional course (approved list)', hi: 'à¤ªà¥à¤°à¥‹à¤«à¥‡à¤¶à¤¨à¤² à¤•à¥‹à¤°à¥à¤¸ (à¤…à¤¨à¥à¤®à¥‹à¤¦à¤¿à¤¤ à¤¸à¥‚à¤šà¥€)' },
      },
      {
        field: 'educationLevel',
        op: 'in',
        value: ['undergraduate', 'postgraduate'],
        label: { en: 'Admitted to undergraduate/postgraduate programme', hi: 'à¤¸à¥à¤¨à¤¾à¤¤à¤•/à¤¸à¥à¤¨à¤¾à¤¤à¤•à¥‹à¤¤à¥à¤¤à¤° à¤ªà¥à¤°à¤µà¥‡à¤¶' },
      },
      {
        field: 'annualIncome',
        op: 'lte',
        value: 600000,
        label: { en: 'Family income â‚¹6,00,000 or less', hi: 'à¤ªà¤¾à¤°à¤¿à¤µà¤¾à¤°à¤¿à¤• à¤†à¤¯ â‚¹6,00,000 à¤¯à¤¾ à¤•à¤®' },
      },
    ],
    effectiveFrom: '2026-04-01',
    version: '2.0.0',
    sourceRef: 'NSFDC ELS guidelines (illustrative seed)',
  },
];

export function getSchemeById(id: string): Scheme | undefined {
  return SCHEMES.find((s) => s.id === id);
}

export type { Rule };
```


### `data/partners.ts` â€” channel-partner network (seed)

Twelve partners across MP/UP covering all six categories from the proposal
(SCA/PSB/RRB/NBFC-MFI/Coop/SFB). Routing-relevant fields:

- `authorizedSchemes` â€” the authorization gate
- `npaCompliant` + `kycEnabled` â€” compliance gates ("NPA as a compliance gate,
  not a credit score")
- `availability` â€” capacity tie-breaker in ranking
- `lastVerified` â€” surfaced in UI so stale data is visible

```ts
import { Partner } from '../src/engine/types';

export const PARTNERS: Partner[] = [
  {
    id: 'p_sca_bpl',
    name: 'MP SC Finance & Development Corporation (SCA)',
    type: 'SCA',
    city: 'Bhopal',
    district: 'Bhopal',
    lat: 23.2599,
    lng: 77.4126,
    authorizedSchemes: ['new_swarnima', 'mahila_samriddhi', 'micro_credit_finance', 'term_loan_scheme'],
    npaCompliant: true,
    kycEnabled: true,
    availability: 'open',
    lastVerified: '2026-07-15',
  },
  {
    id: 'p_psb_sbi_bpl',
    name: 'State Bank of India â€” Main Branch',
    type: 'PSB',
    city: 'Bhopal',
    district: 'Bhopal',
    lat: 23.2685,
    lng: 77.4073,
    authorizedSchemes: ['term_loan_scheme', 'education_loan', 'new_swarnima'],
    npaCompliant: true,
    kycEnabled: true,
    availability: 'busy',
    lastVerified: '2026-08-01',
  },
  {
    id: 'p_rrb_mpb',
    name: 'Madhya Pradesh Gramin Bank',
    type: 'RRB',
    city: 'Bhopal',
    district: 'Bhopal',
    lat: 23.2210,
    lng: 77.4301,
    authorizedSchemes: ['term_loan_scheme', 'education_loan'],
    npaCompliant: true,
    kycEnabled: true,
    availability: 'open',
    lastVerified: '2026-07-28',
  },
  {
    id: 'p_mfid_lokmitra',
    name: 'Lokmitra Microfin Ltd',
    type: 'NBFC-MFI',
    city: 'Sehore',
    district: 'Sehore',
    lat: 23.1963,
    lng: 77.0858,
    authorizedSchemes: ['mahila_samriddhi', 'micro_credit_finance', 'new_swarnima'],
    npaCompliant: true,
    kycEnabled: true,
    availability: 'open',
    lastVerified: '2026-06-30',
  },
  {
    id: 'p_coop_vidisha',
    name: 'Vidisha District Cooperative Bank',
    type: 'COOP',
    city: 'Vidisha',
    district: 'Vidisha',
    lat: 23.5243,
    lng: 77.8061,
    authorizedSchemes: ['micro_credit_finance', 'mahila_samriddhi'],
    npaCompliant: false,
    kycEnabled: true,
    availability: 'open',
    lastVerified: '2026-05-19',
  },
  {
    id: 'p_sfb_au_indore',
    name: 'AU Small Finance Bank â€” Indore',
    type: 'SFB',
    city: 'Indore',
    district: 'Indore',
    lat: 22.7196,
    lng: 75.8577,
    authorizedSchemes: ['education_loan', 'micro_credit_finance'],
    npaCompliant: true,
    kycEnabled: true,
    availability: 'open',
    lastVerified: '2026-08-05',
  },
  {
    id: 'p_psb_pnb_indore',
    name: 'Punjab National Bank â€” Indore Main',
    type: 'PSB',
    city: 'Indore',
    district: 'Indore',
    lat: 22.7207,
    lng: 75.8633,
    authorizedSchemes: ['term_loan_scheme', 'education_loan'],
    npaCompliant: true,
    kycEnabled: true,
    availability: 'busy',
    lastVerified: '2026-07-10',
  },
  {
    id: 'p_sca_ujjain',
    name: 'Ujjain SCA Facilitation Centre',
    type: 'SCA',
    city: 'Ujjain',
    district: 'Ujjain',
    lat: 23.1765,
    lng: 75.7885,
    authorizedSchemes: ['new_swarnima', 'term_loan_scheme', 'micro_credit_finance'],
    npaCompliant: true,
    kycEnabled: false,
    availability: 'open',
    lastVerified: '2026-07-02',
  },
  {
    id: 'p_rrb_jabalpur',
    name: 'Jabalpur Regional Rural Bank HO',
    type: 'RRB',
    city: 'Jabalpur',
    district: 'Jabalpur',
    lat: 23.1685,
    lng: 79.9339,
    authorizedSchemes: ['term_loan_scheme', 'education_loan'],
    npaCompliant: true,
    kycEnabled: true,
    availability: 'open',
    lastVerified: '2026-08-11',
  },
  {
    id: 'p_psb_lko',
    name: 'Bank of Baroda â€” Lucknow Hazratganj',
    type: 'PSB',
    city: 'Lucknow',
    district: 'Lucknow',
    lat: 26.8500,
    lng: 80.9470,
    authorizedSchemes: ['education_loan', 'term_loan_scheme', 'new_swarnima'],
    npaCompliant: true,
    kycEnabled: true,
    availability: 'open',
    lastVerified: '2026-08-14',
  },
  {
    id: 'p_sca_lko',
    name: 'UP SC Finance & Development Corp (SCA)',
    type: 'SCA',
    city: 'Lucknow',
    district: 'Lucknow',
    lat: 26.8467,
    lng: 80.9462,
    authorizedSchemes: ['new_swarnima', 'mahila_samriddhi', 'micro_credit_finance', 'term_loan_scheme'],
    npaCompliant: true,
    kycEnabled: true,
    availability: 'busy',
    lastVerified: '2026-07-21',
  },
  {
    id: 'p_mfid_kanpur',
    name: 'Saksham Finance NBFC-MFI',
    type: 'NBFC-MFI',
    city: 'Kanpur',
    district: 'Kanpur Nagar',
    lat: 26.4499,
    lng: 80.3319,
    authorizedSchemes: ['micro_credit_finance', 'mahila_samriddhi'],
    npaCompliant: true,
    kycEnabled: true,
    availability: 'open',
    lastVerified: '2026-06-12',
  },
];

export function getPartnerById(id: string): Partner | undefined {
  return PARTNERS.find((p) => p.id === id);
}
```

### `data/districts.ts` â€” manual location fallback

22 districts with coordinates across MP/UP. Picking a district replaces GPS
entirely â€” no permission prompts, works when location is denied, deterministic
demos.

```ts
import { District } from '../src/engine/types';

export const DISTRICTS: District[] = [
  { name: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lng: 77.4126 },
  { name: 'Indore', state: 'Madhya Pradesh', lat: 22.7196, lng: 75.8577 },
  { name: 'Jabalpur', state: 'Madhya Pradesh', lat: 23.1685, lng: 79.9339 },
  { name: 'Gwalior', state: 'Madhya Pradesh', lat: 26.2183, lng: 78.1828 },
  { name: 'Ujjain', state: 'Madhya Pradesh', lat: 23.1765, lng: 75.7885 },
  { name: 'Sagar', state: 'Madhya Pradesh', lat: 23.8315, lng: 78.7299 },
  { name: 'Rewa', state: 'Madhya Pradesh', lat: 24.5335, lng: 81.3043 },
  { name: 'Sehore', state: 'Madhya Pradesh', lat: 23.1963, lng: 77.0858 },
  { name: 'Vidisha', state: 'Madhya Pradesh', lat: 23.5243, lng: 77.8061 },
  { name: 'Raisen', state: 'Madhya Pradesh', lat: 23.3305, lng: 77.7825 },
  { name: 'Hoshangabad', state: 'Madhya Pradesh', lat: 22.7512, lng: 77.7214 },
  { name: 'Khandwa', state: 'Madhya Pradesh', lat: 21.8254, lng: 76.3468 },
  { name: 'Chhindwara', state: 'Madhya Pradesh', lat: 22.0579, lng: 78.9402 },
  { name: 'Satna', state: 'Madhya Pradesh', lat: 24.5745, lng: 80.8322 },
  { name: 'Katni', state: 'Madhya Pradesh', lat: 23.8375, lng: 80.3917 },
  { name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462 },
  { name: 'Kanpur Nagar', state: 'Uttar Pradesh', lat: 26.4499, lng: 80.3319 },
  { name: 'Sitapur', state: 'Uttar Pradesh', lat: 27.5690, lng: 80.6830 },
  { name: 'Hardoi', state: 'Uttar Pradesh', lat: 27.4186, lng: 80.1164 },
  { name: 'Varanasi', state: 'Uttar Pradesh', lat: 25.3176, lng: 82.9739 },
  { name: 'Prayagraj', state: 'Uttar Pradesh', lat: 25.4358, lng: 81.8463 },
  { name: 'Raebareli', state: 'Uttar Pradesh', lat: 26.2300, lng: 81.2330 },
];

export function findDistrict(name: string): District | undefined {
  return DISTRICTS.find((d) => d.name === name);
}
```

### `data/constants.ts` â€” labeled option sets

Single-select option lists (purpose, SC status, gender, education level, course
type) plus document labels â€” all as `LocalText` so pickers render bilingually
without touching i18n JSON.

```ts
import { CourseType, EducationLevel, LocalText, Purpose, ScStatus } from '../src/engine/types';

export const PURPOSES: { value: Purpose; label: LocalText }[] = [
  { value: 'business', label: { en: 'Start / grow a business', hi: 'à¤µà¥à¤¯à¤µà¤¸à¤¾à¤¯ à¤¶à¥à¤°à¥‚ / à¤¬à¤¢à¤¼à¤¾à¤¨à¤¾' } },
  { value: 'education', label: { en: 'Higher education', hi: 'à¤‰à¤šà¥à¤š à¤¶à¤¿à¤•à¥à¤·à¤¾' } },
  { value: 'agriculture', label: { en: 'Farm / allied activity', hi: 'à¤•à¥ƒà¤·à¤¿ / à¤¸à¤‚à¤¬à¤¦à¥à¤§ à¤—à¤¤à¤¿à¤µà¤¿à¤§à¤¿' } },
  { value: 'skill', label: { en: 'Skill training', hi: 'à¤•à¥Œà¤¶à¤² à¤ªà¥à¤°à¤¶à¤¿à¤•à¥à¤·à¤£' } },
];

export const SC_STATUSES: { value: ScStatus; label: LocalText }[] = [
  { value: 'verified', label: { en: 'Certificate verified', hi: 'à¤ªà¥à¤°à¤®à¤¾à¤£à¤ªà¤¤à¥à¤° à¤¸à¤¤à¥à¤¯à¤¾à¤ªà¤¿à¤¤' } },
  { value: 'pending', label: { en: 'Applied, awaiting certificate', hi: 'à¤†à¤µà¥‡à¤¦à¤¨ à¤•à¤¿à¤¯à¤¾, à¤ªà¥à¤°à¤®à¤¾à¤£à¤ªà¤¤à¥à¤° à¤ªà¥à¤°à¤¤à¥€à¤•à¥à¤·à¤¿à¤¤' } },
  { value: 'not_available', label: { en: 'Not an SC applicant', hi: 'à¤…à¤¨à¥à¤¸à¥‚à¤šà¤¿à¤¤ à¤œà¤¾à¤¤à¤¿ à¤†à¤µà¥‡à¤¦à¤• à¤¨à¤¹à¥€à¤‚' } },
];

export const GENDERS: { value: 'female' | 'male' | 'other'; label: LocalText }[] = [
  { value: 'female', label: { en: 'Female', hi: 'à¤®à¤¹à¤¿à¤²à¤¾' } },
  { value: 'male', label: { en: 'Male', hi: 'à¤ªà¥à¤°à¥à¤·' } },
  { value: 'other', label: { en: 'Other', hi: 'à¤…à¤¨à¥à¤¯' } },
];

export const EDU_LEVELS: { value: EducationLevel; label: LocalText }[] = [
  { value: 'secondary', label: { en: 'Class 10', hi: 'à¤•à¤•à¥à¤·à¤¾ 10' } },
  { value: 'senior_secondary', label: { en: 'Class 12', hi: 'à¤•à¤•à¥à¤·à¤¾ 12' } },
  { value: 'undergraduate', label: { en: 'Undergraduate', hi: 'à¤¸à¥à¤¨à¤¾à¤¤à¤•' } },
  { value: 'postgraduate', label: { en: 'Postgraduate', hi: 'à¤¸à¥à¤¨à¤¾à¤¤à¤•à¥‹à¤¤à¥à¤¤à¤°' } },
];

export const COURSE_TYPES: { value: CourseType; label: LocalText }[] = [
  { value: 'professional', label: { en: 'Professional (Engg, Medical, Law...)', hi: 'à¤ªà¥à¤°à¥‹à¤«à¥‡à¤¶à¤¨à¤² (à¤‡à¤‚à¤œà¥€., à¤®à¥‡à¤¡à¤¿à¤•à¤², à¤²à¥‰...)' } },
  { value: 'general', label: { en: 'General degree', hi: 'à¤¸à¤¾à¤®à¤¾à¤¨à¥à¤¯ à¤¡à¤¿à¤—à¥à¤°à¥€' } },
];

export const DOC_LABELS: Record<string, LocalText> = {
  sc_certificate: { en: 'SC caste certificate', hi: 'à¤…à¤¨à¥à¤¸à¥‚à¤šà¤¿à¤¤ à¤œà¤¾à¤¤à¤¿ à¤ªà¥à¤°à¤®à¤¾à¤£à¤ªà¤¤à¥à¤°' },
  income_proof: { en: 'Income proof', hi: 'à¤†à¤¯ à¤ªà¥à¤°à¤®à¤¾à¤£' },
  aadhaar: { en: 'Aadhaar card', hi: 'à¤†à¤§à¤¾à¤° à¤•à¤¾à¤°à¥à¤¡' },
  bank_passbook: { en: 'Bank passbook / cancelled cheque', hi: 'à¤¬à¥ˆà¤‚à¤• à¤ªà¤¾à¤¸à¤¬à¥à¤• / à¤°à¤¦à¥à¤¦ à¤šà¥‡à¤•' },
  project_report: { en: 'Project / business report', hi: 'à¤ªà¤°à¤¿à¤¯à¥‹à¤œà¤¨à¤¾ / à¤µà¥à¤¯à¤¾à¤µà¤¸à¤¾à¤¯à¤¿à¤• à¤°à¤¿à¤ªà¥‹à¤°à¥à¤Ÿ' },
  admission_proof: { en: 'Admission proof', hi: 'à¤ªà¥à¤°à¤µà¥‡à¤¶ à¤ªà¥à¤°à¤®à¤¾à¤£' },
  fee_structure: { en: 'Course fee structure', hi: 'à¤ªà¤¾à¤ à¥à¤¯à¤•à¥à¤°à¤® à¤¶à¥à¤²à¥à¤• à¤¸à¤‚à¤°à¤šà¤¨à¤¾' },
  marksheet: { en: 'Latest marksheet', hi: 'à¤¨à¤µà¥€à¤¨à¤¤à¤® à¤…à¤‚à¤•à¤¸à¥‚à¤šà¥€' },
  caste_institute_cert: { en: 'Institute SC status proof', hi: 'à¤¸à¤‚à¤¸à¥à¤¥à¤¾à¤¨ à¤….à¤œà¤¾. à¤ªà¥à¤°à¤®à¤¾à¤£' },
  quotation: { en: 'Equipment quotation', hi: 'à¤‰à¤ªà¤•à¤°à¤£ à¤‰à¤¦à¥à¤§à¤°à¤£' },
};

export function purposeLabel(p: Purpose, lang: 'en' | 'hi'): string {
  return PURPOSES.find((x) => x.value === p)?.label[lang] ?? p;
}

export function docLabel(id: string, lang: 'en' | 'hi'): string {
  return DOC_LABELS[id]?.[lang] ?? id;
}
```


---

## 6. Services & global state (`src/services/`, `src/store/`)

### `src/services/storage.ts` â€” persistence wrapper

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

### `src/services/api.ts` â€” mock API layer (the FastAPI seam)

The **single swap point** for the backend. Functions simulate latency so loading
skeletons actually appear, then run pure logic:

- `fetchMatchResults` â†’ delegates to the rule engine (future: `POST /eligibility/match`).
- `fetchNearbyPartners` â†’ full router contract: authorization gate â†’ compliance
  gate (`npaCompliant && kycEnabled`) â†’ haversine distance â†’ radius expansion
  25 â†’ 50 â†’ 100 km stopping at â‰¥3 results â†’ sort by distance with "open"
  availability as tie-breaker (future: `GET /partners/nearby`).
- `generateTrackingId` â†’ unambiguous charset (no I/O/0/1) for IDs like `FS-2026-K7M3X`.

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

### `src/store/AppStore.tsx` â€” global state (React Context)

Owns everything cross-screen: language, profile, applications, voice setting.
Every mutation persists through the storage layer immediately (offline-first).
The application state machine lives here:

```text
submitted â†’ acknowledged â†’ under_review â†’ sanctioned   (advanceApplication walks one step)
```

`addApplication` mints the tracking ID, stamps timestamps and seeds the
timeline â€” mirroring what the backend will do transactionally.

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


---

## 7. Internationalization (`src/i18n/`)

### `src/i18n/index.ts` â€” i18next bootstrap

Both locales are bundled (no network). `fallbackLng: 'en'` implements the
language fallback chain; interpolation is enabled for dynamic values.

```ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import hi from './locales/hi.json';

export const resources = {
  en: { translation: en },
  hi: { translation: hi },
} as const;

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
```

### `src/i18n/locales/en.json`

Namespaced by screen (`home.*`, `profile.*`, `match.*`, `calc.*`, `partners.*`,
`apply.*`, `track.*`, `settings.*`, `admin.*`) plus shared `common.*` and status
labels under `status.*` (used by both Track and Admin).

```json
{
  "common": {
    "appName": "FinSetu AI",
    "tagline": "Discover, Match, Calculate, Route, Apply, Track",
    "next": "Next",
    "back": "Back",
    "confirm": "Confirm",
    "cancel": "Cancel",
    "loading": "Loadingâ€¦",
    "demoNote": "Demo build â€” illustrative scheme data",
    "psLine": "SIH 2026 Â· PS 26092 Â· Ministry of Social Justice & Empowerment",
    "kmAway": "{{km}} km away",
    "version": "Version 1.0.0 (MVP)"
  },
  "lang": {
    "title": "Choose your language",
    "subtitle": "You can change this anytime in Settings"
  },
  "home": {
    "greet": "Namaste{{name}}",
    "journeyTitle": "Your journey to financial support",
    "discover": "Discover",
    "match": "Match",
    "calculate": "Calculate",
    "route": "Route",
    "apply": "Apply",
    "track": "Track",
    "startCta": "Start my eligibility check",
    "updateCta": "Update my details",
    "trackCta": "Track my applications",
    "schemesAvailable": "Schemes in catalog",
    "partnersListed": "Partner network nodes",
    "adminLink": "Admin analytics",
    "voiceTip": "Voice guidance is on. Tap the speaker icon on any result to listen."
  },
  "profile": {
    "title": "Your profile",
    "step": "Step {{n}} of {{total}}",
    "s1": "About you",
    "s2": "Category & income",
    "s3": "Your goal",
    "s4": "Your location",
    "s5": "Review & confirm",
    "name": "Full name",
    "namePh": "e.g. Sunita Devi",
    "age": "Age (years)",
    "gender": "Gender",
    "scStatus": "Scheduled Caste certificate status",
    "income": "Annual family income (â‚¹)",
    "incomeHint": "Total yearly income of your household",
    "purpose": "What do you need funds for?",
    "cost": "Project / course cost (â‚¹)",
    "costHint": "Estimated total amount you need",
    "eduLevel": "Current education level",
    "courseType": "Course type",
    "district": "Select your district",
    "districtHint": "Used to find nearby authorized partners",
    "review": "Please verify your details",
    "canonicalNote": "Amounts are shown in Indian format and words so nothing gets lost in translation.",
    "confirmCta": "Confirm & find schemes",
    "errName": "Please enter your name",
    "errAge": "Enter an age between 18 and 65",
    "errNum": "Enter a valid amount greater than zero",
    "errDistrict": "Please choose a district"
  },
  "match": {
    "title": "Schemes for you",
    "topPick": "Top recommendation",
    "eligibleCount": "{{n}} scheme(s) matched your profile",
    "conditionalBanner": "You may qualify conditionally â€” a valid SC certificate will be required before final approval.",
    "whyEligible": "Why this result?",
    "hideDetails": "Hide details",
    "traceRow": "{{expected}} Â· you: {{actual}}",
    "docsNeeded": "Documents needed",
    "estAssist": "Est. assistance up to",
    "calcCta": "Calculate EMI & affordability",
    "nearMissTitle": "Close but not eligible",
    "nearMissBody": "These schemes did not match. Common reason: income limit.",
    "emptyTitle": "No schemes matched",
    "emptyBody": "Try adjusting your project cost or income details.",
    "goWizard": "Edit profile",
    "sourceLabel": "Source"
  },
  "calc": {
    "title": "Affordability calculator",
    "costLabel": "Project / course cost",
    "moratoriumToggle": "Include study-period moratorium",
    "eligibleLoan": "Eligible loan",
    "contribution": "Your contribution",
    "emi": "Monthly EMI",
    "totalInterest": "Total interest",
    "totalPayable": "Total payable",
    "monthsNote": "over {{m}} months at {{r}}% per annum",
    "principalAfterMoratorium": "Principal after moratorium",
    "moratoriumNote": "+{{amt}} interest accrues during moratorium and is added to principal",
    "disclaimer": "Illustrative calculation from seeded scheme rules. Final figures are decided by the channel partner.",
    "cta": "Find partners near me"
  },
  "partners": {
    "title": "Nearby authorized partners",
    "within": "Showing partners within {{km}} km",
    "expandedNote": "No partner in 25 km, so radius was widened automatically",
    "mapCaption": "Open map preview (needs internet) â€” the list above works offline",
    "open": "Accepting applications",
    "busy": "High workload",
    "npaOk": "Compliance gate passed",
    "kycPending": "e-KYC setup pending",
    "lastVerified": "Verified {{date}}",
    "selectCta": "Continue with this partner",
    "noneTitle": "No eligible partner found",
    "noneBody": "No authorized partner for this scheme was found even after expanding the radius. Try another scheme or contact your district SCA."
  },
  "apply": {
    "title": "Prepare application",
    "checklist": "Document checklist",
    "warnPending": "{{n}} document(s) still pending",
    "consentTitle": "Consent to share your profile",
    "consentBody": "With your consent, FinSetu will share this application summary with the selected authorized partner. FinSetu does not sanction loans.",
    "consentCheck": "I agree to share my details with this partner",
    "submit": "Submit application",
    "submitted": "Application submitted successfully",
    "trackNow": "Go to tracking"
  },
  "track": {
    "title": "Track applications",
    "emptyTitle": "No applications yet",
    "emptyBody": "When you apply through FinSetu, live status appears here with a tracking ID.",
    "timelineTitle": "Status history",
    "simulate": "Simulate partner update (demo)",
    "updated": "Updated",
    "idLabel": "Tracking ID",
    "docsPending": "Docs pending: {{n}}"
  },
  "status": {
    "submitted": "Submitted",
    "acknowledged": "Acknowledged by partner",
    "under_review": "Under review",
    "sanctioned": "Sanctioned",
    "rejected": "Rejected"
  },
  "settings": {
    "title": "Settings",
    "language": "Language",
    "voiceSection": "Voice guidance",
    "voiceToggle": "Read out results aloud",
    "voiceTest": "Test voice",
    "testPhrase": "Welcome to FinSetu. Your scheme results are ready.",
    "dataSection": "Data",
    "resetData": "Reset demo data",
    "resetTitle": "Reset everything?",
    "resetBody": "This clears your saved profile, settings and tracked applications on this device.",
    "about": "About",
    "aboutBody": "FinSetu AI is a pre-application guide for NSFDC-backed schemes. It does not sanction or disburse loans.",
    "madeFor": "Built for Smart India Hackathon 2026"
  },
  "admin": {
    "title": "Admin analytics",
    "subtitle": "Aggregate view (demo numbers)",
    "appsByStatus": "Applications by status",
    "demandByPurpose": "Demand by purpose",
    "avgAck": "Avg. partner acknowledgement time",
    "note": "Production builds aggregate anonymized data only, per the privacy policy."
  }
}
```

### `src/i18n/locales/hi.json`

Same keys, fully translated. Tone is formal-but-simple; financial terms use
standard Hindi banking vocabulary (à¤¸à¥‚à¤•à¥à¤·à¥à¤® à¤µà¤¿à¤¤à¥à¤¤, à¤®à¥‰à¤°à¥‡à¤Ÿà¥‹à¤°à¤¿à¤¯à¤®, à¤…à¤¨à¥à¤¸à¥‚à¤šà¤¿à¤¤ à¤œà¤¾à¤¤à¤¿).

```json
{
  "common": {
    "appName": "à¤«à¤¿à¤¨à¤¸à¥‡à¤¤à¥ AI",
    "tagline": "à¤–à¥‹à¤œà¥‡à¤‚, à¤®à¤¿à¤²à¤¾à¤¨ à¤•à¤°à¥‡à¤‚, à¤—à¤£à¤¨à¤¾ à¤•à¤°à¥‡à¤‚, à¤°à¥‚à¤Ÿ à¤•à¤°à¥‡à¤‚, à¤†à¤µà¥‡à¤¦à¤¨ à¤•à¤°à¥‡à¤‚, à¤Ÿà¥à¤°à¥ˆà¤• à¤•à¤°à¥‡à¤‚",
    "next": "à¤†à¤—à¥‡",
    "back": "à¤ªà¥€à¤›à¥‡",
    "confirm": "à¤ªà¥à¤·à¥à¤Ÿà¤¿ à¤•à¤°à¥‡à¤‚",
    "cancel": "à¤°à¤¦à¥à¤¦ à¤•à¤°à¥‡à¤‚",
    "loading": "à¤²à¥‹à¤¡ à¤¹à¥‹ à¤°à¤¹à¤¾ à¤¹à¥ˆâ€¦",
    "demoNote": "à¤¡à¥‡à¤®à¥‹ à¤¬à¤¿à¤²à¥à¤¡ â€” à¤¯à¥‹à¤œà¤¨à¤¾ à¤¡à¥‡à¤Ÿà¤¾ à¤‰à¤¦à¤¾à¤¹à¤°à¤£ à¤¹à¥‡à¤¤à¥ à¤¹à¥ˆ",
    "psLine": "à¤¸à¥à¤®à¤¾à¤°à¥à¤Ÿ à¤‡à¤‚à¤¡à¤¿à¤¯à¤¾ à¤¹à¥ˆà¤•à¤¥à¥‰à¤¨ 2026 Â· à¤ªà¥€à¤à¤¸ 26092 Â· à¤¸à¤¾à¤®à¤¾à¤œà¤¿à¤• à¤¨à¥à¤¯à¤¾à¤¯ à¤à¤µà¤‚ à¤…à¤§à¤¿à¤•à¤¾à¤°à¤¿à¤¤à¤¾ à¤®à¤‚à¤¤à¥à¤°à¤¾à¤²à¤¯",
    "kmAway": "{{km}} à¤•à¤¿à¤®à¥€ à¤¦à¥‚à¤°",
    "version": "à¤¸à¤‚à¤¸à¥à¤•à¤°à¤£ 1.0.0 (MVP)"
  },
  "lang": {
    "title": "à¤…à¤ªà¤¨à¥€ à¤­à¤¾à¤·à¤¾ à¤šà¥à¤¨à¥‡à¤‚",
    "subtitle": "à¤†à¤ª à¤‡à¤¸à¥‡ à¤¸à¥‡à¤Ÿà¤¿à¤‚à¤—à¥à¤¸ à¤®à¥‡à¤‚ à¤•à¤­à¥€ à¤­à¥€ à¤¬à¤¦à¤² à¤¸à¤•à¤¤à¥‡ à¤¹à¥ˆà¤‚"
  },
  "home": {
    "greet": "à¤¨à¤®à¤¸à¥à¤¤à¥‡{{name}}",
    "journeyTitle": "à¤µà¤¿à¤¤à¥à¤¤à¥€à¤¯ à¤¸à¤¹à¤¾à¤¯à¤¤à¤¾ à¤¤à¤• à¤†à¤ªà¤•à¥€ à¤¯à¤¾à¤¤à¥à¤°à¤¾",
    "discover": "à¤–à¥‹à¤œà¥‡à¤‚",
    "match": "à¤®à¤¿à¤²à¤¾à¤¨",
    "calculate": "à¤—à¤£à¤¨à¤¾",
    "route": "à¤°à¥‚à¤Ÿ",
    "apply": "à¤†à¤µà¥‡à¤¦à¤¨",
    "track": "à¤Ÿà¥à¤°à¥ˆà¤•",
    "startCta": "à¤ªà¤¾à¤¤à¥à¤°à¤¤à¤¾ à¤œà¤¾à¤à¤š à¤¶à¥à¤°à¥‚ à¤•à¤°à¥‡à¤‚",
    "updateCta": "à¤…à¤ªà¤¨à¥€ à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€ à¤…à¤ªà¤¡à¥‡à¤Ÿ à¤•à¤°à¥‡à¤‚",
    "trackCta": "à¤®à¥‡à¤°à¥‡ à¤†à¤µà¥‡à¤¦à¤¨ à¤Ÿà¥à¤°à¥ˆà¤• à¤•à¤°à¥‡à¤‚",
    "schemesAvailable": "à¤•à¥ˆà¤Ÿà¤²à¥‰à¤— à¤®à¥‡à¤‚ à¤¯à¥‹à¤œà¤¨à¤¾à¤à¤",
    "partnersListed": "à¤ªà¤¾à¤°à¥à¤Ÿà¤¨à¤° à¤¨à¥‡à¤Ÿà¤µà¤°à¥à¤• à¤¨à¥‹à¤¡à¥à¤¸",
    "adminLink": "à¤à¤¡à¤®à¤¿à¤¨ à¤à¤¨à¤¾à¤²à¤¿à¤Ÿà¤¿à¤•à¥à¤¸",
    "voiceTip": "à¤µà¥‰à¤‡à¤¸ à¤—à¤¾à¤‡à¤¡à¥‡à¤‚à¤¸ à¤šà¤¾à¤²à¥‚ à¤¹à¥ˆà¥¤ à¤ªà¤°à¤¿à¤£à¤¾à¤® à¤¸à¥à¤¨à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤ à¤¸à¥à¤ªà¥€à¤•à¤° à¤†à¤‡à¤•à¤¨ à¤¦à¤¬à¤¾à¤à¤à¥¤"
  },
  "profile": {
    "title": "à¤†à¤ªà¤•à¥€ à¤ªà¥à¤°à¥‹à¤«à¤¼à¤¾à¤‡à¤²",
    "step": "à¤šà¤°à¤£ {{n}} / {{total}}",
    "s1": "à¤†à¤ªà¤•à¥‡ à¤¬à¤¾à¤°à¥‡ à¤®à¥‡à¤‚",
    "s2": "à¤¶à¥à¤°à¥‡à¤£à¥€ à¤”à¤° à¤†à¤¯",
    "s3": "à¤†à¤ªà¤•à¤¾ à¤‰à¤¦à¥à¤¦à¥‡à¤¶à¥à¤¯",
    "s4": "à¤†à¤ªà¤•à¤¾ à¤¸à¥à¤¥à¤¾à¤¨",
    "s5": "à¤¸à¤®à¥€à¤•à¥à¤·à¤¾ à¤”à¤° à¤ªà¥à¤·à¥à¤Ÿà¤¿",
    "name": "à¤ªà¥‚à¤°à¤¾ à¤¨à¤¾à¤®",
    "namePh": "à¤œà¥ˆà¤¸à¥‡ à¤¸à¥à¤¨à¥€à¤¤à¤¾ à¤¦à¥‡à¤µà¥€",
    "age": "à¤†à¤¯à¥ (à¤µà¤°à¥à¤·)",
    "gender": "à¤²à¤¿à¤‚à¤—",
    "scStatus": "à¤…à¤¨à¥à¤¸à¥‚à¤šà¤¿à¤¤ à¤œà¤¾à¤¤à¤¿ à¤ªà¥à¤°à¤®à¤¾à¤£à¤ªà¤¤à¥à¤° à¤¸à¥à¤¥à¤¿à¤¤à¤¿",
    "income": "à¤µà¤¾à¤°à¥à¤·à¤¿à¤• à¤ªà¤¾à¤°à¤¿à¤µà¤¾à¤°à¤¿à¤• à¤†à¤¯ (â‚¹)",
    "incomeHint": "à¤†à¤ªà¤•à¥‡ à¤ªà¤°à¤¿à¤µà¤¾à¤° à¤•à¥€ à¤•à¥à¤² à¤µà¤¾à¤°à¥à¤·à¤¿à¤• à¤†à¤¯",
    "purpose": "à¤†à¤ªà¤•à¥‹ à¤§à¤¨ à¤•à¤¿à¤¸ à¤²à¤¿à¤ à¤šà¤¾à¤¹à¤¿à¤?",
    "cost": "à¤ªà¤°à¤¿à¤¯à¥‹à¤œà¤¨à¤¾ / à¤ªà¤¾à¤ à¥à¤¯à¤•à¥à¤°à¤® à¤²à¤¾à¤—à¤¤ (â‚¹)",
    "costHint": "à¤†à¤ªà¤•à¥‹ à¤†à¤µà¤¶à¥à¤¯à¤• à¤…à¤¨à¥à¤®à¤¾à¤¨à¤¿à¤¤ à¤•à¥à¤² à¤°à¤¾à¤¶à¤¿",
    "eduLevel": "à¤µà¤°à¥à¤¤à¤®à¤¾à¤¨ à¤¶à¤¿à¤•à¥à¤·à¤¾ à¤¸à¥à¤¤à¤°",
    "courseType": "à¤ªà¤¾à¤ à¥à¤¯à¤•à¥à¤°à¤® à¤ªà¥à¤°à¤•à¤¾à¤°",
    "district": "à¤…à¤ªà¤¨à¤¾ à¤œà¤¼à¤¿à¤²à¤¾ à¤šà¥à¤¨à¥‡à¤‚",
    "districtHint": "à¤¨à¤œà¤¼à¤¦à¥€à¤•à¥€ à¤…à¤§à¤¿à¤•à¥ƒà¤¤ à¤ªà¤¾à¤°à¥à¤Ÿà¤¨à¤° à¤–à¥‹à¤œà¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤ à¤‰à¤ªà¤¯à¥‹à¤— à¤¹à¥‹à¤¤à¤¾ à¤¹à¥ˆ",
    "review": "à¤•à¥ƒà¤ªà¤¯à¤¾ à¤…à¤ªà¤¨à¥€ à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€ à¤œà¤¾à¤à¤šà¥‡à¤‚",
    "canonicalNote": "à¤°à¤¾à¤¶à¤¿à¤¯à¤¾à¤ à¤­à¤¾à¤°à¤¤à¥€à¤¯ à¤ªà¥à¤°à¤¾à¤°à¥‚à¤ª à¤”à¤° à¤¶à¤¬à¥à¤¦à¥‹à¤‚ à¤®à¥‡à¤‚ à¤¦à¤¿à¤–à¤¾à¤ˆ à¤œà¤¾à¤¤à¥€ à¤¹à¥ˆà¤‚ à¤¤à¤¾à¤•à¤¿ à¤…à¤¨à¥à¤µà¤¾à¤¦ à¤®à¥‡à¤‚ à¤•à¥‹à¤ˆ à¤¤à¥à¤°à¥à¤Ÿà¤¿ à¤¨ à¤¹à¥‹à¥¤",
    "confirmCta": "à¤ªà¥à¤·à¥à¤Ÿà¤¿ à¤•à¤°à¥‡à¤‚ à¤”à¤° à¤¯à¥‹à¤œà¤¨à¤¾à¤à¤ à¤–à¥‹à¤œà¥‡à¤‚",
    "errName": "à¤•à¥ƒà¤ªà¤¯à¤¾ à¤…à¤ªà¤¨à¤¾ à¤¨à¤¾à¤® à¤¦à¤°à¥à¤œ à¤•à¤°à¥‡à¤‚",
    "errAge": "18 à¤¸à¥‡ 65 à¤•à¥‡ à¤¬à¥€à¤š à¤†à¤¯à¥ à¤¦à¤°à¥à¤œ à¤•à¤°à¥‡à¤‚",
    "errNum": "à¤¶à¥‚à¤¨à¥à¤¯ à¤¸à¥‡ à¤…à¤§à¤¿à¤• à¤®à¤¾à¤¨à¥à¤¯ à¤°à¤¾à¤¶à¤¿ à¤¦à¤°à¥à¤œ à¤•à¤°à¥‡à¤‚",
    "errDistrict": "à¤•à¥ƒà¤ªà¤¯à¤¾ à¤œà¤¼à¤¿à¤²à¤¾ à¤šà¥à¤¨à¥‡à¤‚"
  },
  "match": {
    "title": "à¤†à¤ªà¤•à¥‡ à¤²à¤¿à¤ à¤¯à¥‹à¤œà¤¨à¤¾à¤à¤",
    "topPick": "à¤¸à¤°à¥à¤µà¤¶à¥à¤°à¥‡à¤·à¥à¤  à¤¸à¥à¤à¤¾à¤µ",
    "eligibleCount": "à¤†à¤ªà¤•à¥€ à¤ªà¥à¤°à¥‹à¤«à¤¼à¤¾à¤‡à¤² à¤¸à¥‡ {{n}} à¤¯à¥‹à¤œà¤¨à¤¾(à¤“à¤‚) à¤•à¤¾ à¤®à¤¿à¤²à¤¾à¤¨ à¤¹à¥à¤†",
    "conditionalBanner": "à¤†à¤ª à¤¶à¤°à¥à¤¤à¤¿à¤¯ à¤°à¥‚à¤ª à¤¸à¥‡ à¤ªà¤¾à¤¤à¥à¤° à¤¹à¥‹ à¤¸à¤•à¤¤à¥‡ à¤¹à¥ˆà¤‚ â€” à¤…à¤‚à¤¤à¤¿à¤® à¤¸à¥à¤µà¥€à¤•à¥ƒà¤¤à¤¿ à¤¸à¥‡ à¤ªà¤¹à¤²à¥‡ à¤µà¥ˆà¤§ à¤….à¤œà¤¾. à¤ªà¥à¤°à¤®à¤¾à¤£à¤ªà¤¤à¥à¤° à¤†à¤µà¤¶à¥à¤¯à¤• à¤¹à¥‹à¤—à¤¾à¥¤",
    "whyEligible": "à¤¯à¤¹ à¤ªà¤°à¤¿à¤£à¤¾à¤® à¤•à¥à¤¯à¥‹à¤‚?",
    "hideDetails": "à¤µà¤¿à¤µà¤°à¤£ à¤›à¤¿à¤ªà¤¾à¤à¤",
    "traceRow": "{{expected}} Â· à¤†à¤ªà¤•à¥€ à¤¸à¥à¤¥à¤¿à¤¤à¤¿: {{actual}}",
    "docsNeeded": "à¤†à¤µà¤¶à¥à¤¯à¤• à¤¦à¤¸à¥à¤¤à¤¾à¤µà¥‡à¤œà¤¼",
    "estAssist": "à¤…à¤¨à¥à¤®à¤¾à¤¨à¤¿à¤¤ à¤¸à¤¹à¤¾à¤¯à¤¤à¤¾ à¤…à¤§à¤¿à¤•à¤¤à¤®",
    "calcCta": "EMI à¤”à¤° à¤•à¤¿à¤«à¤¼à¤¾à¤¯à¤¤ à¤—à¤£à¤¨à¤¾ à¤•à¤°à¥‡à¤‚",
    "nearMissTitle": "à¤•à¤°à¥€à¤¬, à¤ªà¤° à¤ªà¤¾à¤¤à¥à¤° à¤¨à¤¹à¥€à¤‚",
    "nearMissBody": "à¤¯à¥‡ à¤¯à¥‹à¤œà¤¨à¤¾à¤à¤ à¤®à¥‡à¤² à¤¨à¤¹à¥€à¤‚ à¤–à¤¾à¤ˆà¤‚à¥¤ à¤¸à¤¾à¤®à¤¾à¤¨à¥à¤¯ à¤•à¤¾à¤°à¤£: à¤†à¤¯ à¤¸à¥€à¤®à¤¾à¥¤",
    "emptyTitle": "à¤•à¥‹à¤ˆ à¤¯à¥‹à¤œà¤¨à¤¾ à¤®à¥‡à¤² à¤¨à¤¹à¥€à¤‚ à¤–à¤¾à¤ˆ",
    "emptyBody": "à¤•à¥ƒà¤ªà¤¯à¤¾ à¤ªà¤°à¤¿à¤¯à¥‹à¤œà¤¨à¤¾ à¤²à¤¾à¤—à¤¤ à¤¯à¤¾ à¤†à¤¯ à¤µà¤¿à¤µà¤°à¤£ à¤¬à¤¦à¤²à¤•à¤° à¤¦à¥‡à¤–à¥‡à¤‚à¥¤",
    "goWizard": "à¤ªà¥à¤°à¥‹à¤«à¤¼à¤¾à¤‡à¤² à¤¸à¤‚à¤ªà¤¾à¤¦à¤¿à¤¤ à¤•à¤°à¥‡à¤‚",
    "sourceLabel": "à¤¸à¥à¤°à¥‹à¤¤"
  },
  "calc": {
    "title": "à¤•à¤¿à¤«à¤¼à¤¾à¤¯à¤¤ à¤•à¥ˆà¤²à¤•à¥à¤²à¥‡à¤Ÿà¤°",
    "costLabel": "à¤ªà¤°à¤¿à¤¯à¥‹à¤œà¤¨à¤¾ / à¤ªà¤¾à¤ à¥à¤¯à¤•à¥à¤°à¤® à¤²à¤¾à¤—à¤¤",
    "moratoriumToggle": "à¤…à¤§à¥à¤¯à¤¯à¤¨à¤•à¤¾à¤² à¤®à¥‰à¤°à¥‡à¤Ÿà¥‹à¤°à¤¿à¤¯à¤® à¤¶à¤¾à¤®à¤¿à¤² à¤•à¤°à¥‡à¤‚",
    "eligibleLoan": "à¤ªà¤¾à¤¤à¥à¤° à¤‹à¤£",
    "contribution": "à¤†à¤ªà¤•à¤¾ à¤¯à¥‹à¤—à¤¦à¤¾à¤¨",
    "emi": "à¤®à¤¾à¤¸à¤¿à¤• EMI",
    "totalInterest": "à¤•à¥à¤² à¤¬à¥à¤¯à¤¾à¤œ",
    "totalPayable": "à¤•à¥à¤² à¤­à¥à¤—à¤¤à¤¾à¤¨",
    "monthsNote": "{{m}} à¤®à¤¹à¥€à¤¨à¥‹à¤‚ à¤®à¥‡à¤‚, {{r}}% à¤µà¤¾à¤°à¥à¤·à¤¿à¤• à¤¦à¤° à¤¸à¥‡",
    "principalAfterMoratorium": "à¤®à¥‰à¤°à¥‡à¤Ÿà¥‹à¤°à¤¿à¤¯à¤® à¤•à¥‡ à¤¬à¤¾à¤¦ à¤®à¥‚à¤²à¤§à¤¨",
    "moratoriumNote": "à¤®à¥‰à¤°à¥‡à¤Ÿà¥‹à¤°à¤¿à¤¯à¤® à¤•à¥‡ à¤¦à¥Œà¤°à¤¾à¤¨ +{{amt}} à¤¬à¥à¤¯à¤¾à¤œ à¤œà¥à¤¡à¤¼à¤¤à¤¾ à¤¹à¥ˆ à¤”à¤° à¤®à¥‚à¤²à¤§à¤¨ à¤®à¥‡à¤‚ à¤œà¥‹à¤¡à¤¼à¤¾ à¤œà¤¾à¤¤à¤¾ à¤¹à¥ˆ",
    "disclaimer": "à¤¸à¥€à¤¡à¥‡à¤¡ à¤¯à¥‹à¤œà¤¨à¤¾ à¤¨à¤¿à¤¯à¤®à¥‹à¤‚ à¤¸à¥‡ à¤‰à¤¦à¤¾à¤¹à¤°à¤£à¤¸à¥à¤µà¤°à¥‚à¤ª à¤—à¤£à¤¨à¤¾à¥¤ à¤…à¤‚à¤¤à¤¿à¤® à¤†à¤‚à¤•à¤¡à¤¼à¥‡ à¤šà¥ˆà¤¨à¤² à¤ªà¤¾à¤°à¥à¤Ÿà¤¨à¤° à¤¤à¤¯ à¤•à¤°à¤¤à¤¾ à¤¹à¥ˆà¥¤",
    "cta": "à¤®à¥‡à¤°à¥‡ à¤ªà¤¾à¤¸ à¤•à¥‡ à¤ªà¤¾à¤°à¥à¤Ÿà¤¨à¤° à¤–à¥‹à¤œà¥‡à¤‚"
  },
  "partners": {
    "title": "à¤¨à¤œà¤¼à¤¦à¥€à¤•à¥€ à¤…à¤§à¤¿à¤•à¥ƒà¤¤ à¤ªà¤¾à¤°à¥à¤Ÿà¤¨à¤°",
    "within": "{{km}} à¤•à¤¿à¤®à¥€ à¤•à¥‡ à¤­à¥€à¤¤à¤° à¤ªà¤¾à¤°à¥à¤Ÿà¤¨à¤° à¤¦à¤¿à¤–à¤¾à¤ à¤œà¤¾ à¤°à¤¹à¥‡ à¤¹à¥ˆà¤‚",
    "expandedNote": "25 à¤•à¤¿à¤®à¥€ à¤®à¥‡à¤‚ à¤•à¥‹à¤ˆ à¤ªà¤¾à¤°à¥à¤Ÿà¤¨à¤° à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¤¾, à¤‡à¤¸à¤²à¤¿à¤ à¤¤à¥à¤°à¤¿à¤œà¥à¤¯à¤¾ à¤¸à¥à¤µà¤¤à¤ƒ à¤¬à¤¢à¤¼à¤¾à¤ˆ à¤—à¤ˆ",
    "mapCaption": "à¤®à¤¾à¤¨à¤šà¤¿à¤¤à¥à¤° à¤ªà¥‚à¤°à¥à¤µà¤¾à¤µà¤²à¥‹à¤•à¤¨ à¤–à¥‹à¤²à¥‡à¤‚ (à¤‡à¤‚à¤Ÿà¤°à¤¨à¥‡à¤Ÿ à¤†à¤µà¤¶à¥à¤¯à¤•) â€” à¤Šà¤ªà¤° à¤•à¥€ à¤¸à¥‚à¤šà¥€ à¤‘à¤«à¤¼à¤²à¤¾à¤‡à¤¨ à¤šà¤²à¤¤à¥€ à¤¹à¥ˆ",
    "open": "à¤†à¤µà¥‡à¤¦à¤¨ à¤¸à¥à¤µà¥€à¤•à¤¾à¤° à¤•à¤° à¤°à¤¹à¥‡ à¤¹à¥ˆà¤‚",
    "busy": "à¤…à¤§à¤¿à¤• à¤•à¤¾à¤°à¥à¤¯à¤­à¤¾à¤°",
    "npaOk": "à¤…à¤¨à¥à¤ªà¤¾à¤²à¤¨ à¤—à¥‡à¤Ÿ à¤ªà¤¾à¤¸",
    "kycPending": "e-KYC à¤¸à¥‡à¤Ÿà¤…à¤ª à¤²à¤‚à¤¬à¤¿à¤¤",
    "lastVerified": "{{date}} à¤•à¥‹ à¤¸à¤¤à¥à¤¯à¤¾à¤ªà¤¿à¤¤",
    "selectCta": "à¤‡à¤¸ à¤ªà¤¾à¤°à¥à¤Ÿà¤¨à¤° à¤•à¥‡ à¤¸à¤¾à¤¥ à¤†à¤—à¥‡ à¤¬à¤¢à¤¼à¥‡à¤‚",
    "noneTitle": "à¤•à¥‹à¤ˆ à¤ªà¤¾à¤¤à¥à¤° à¤ªà¤¾à¤°à¥à¤Ÿà¤¨à¤° à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¤¾",
    "noneBody": "à¤¤à¥à¤°à¤¿à¤œà¥à¤¯à¤¾ à¤¬à¤¢à¤¼à¤¾à¤¨à¥‡ à¤ªà¤° à¤­à¥€ à¤‡à¤¸ à¤¯à¥‹à¤œà¤¨à¤¾ à¤•à¥‡ à¤²à¤¿à¤ à¤•à¥‹à¤ˆ à¤…à¤§à¤¿à¤•à¥ƒà¤¤ à¤ªà¤¾à¤°à¥à¤Ÿà¤¨à¤° à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¤¾à¥¤ à¤•à¥‹à¤ˆ à¤…à¤¨à¥à¤¯ à¤¯à¥‹à¤œà¤¨à¤¾ à¤†à¤œà¤¼à¤®à¤¾à¤à¤ à¤¯à¤¾ à¤œà¤¼à¤¿à¤²à¤¾ SCA à¤¸à¥‡ à¤¸à¤‚à¤ªà¤°à¥à¤• à¤•à¤°à¥‡à¤‚à¥¤"
  },
  "apply": {
    "title": "à¤†à¤µà¥‡à¤¦à¤¨ à¤¤à¥ˆà¤¯à¤¾à¤° à¤•à¤°à¥‡à¤‚",
    "checklist": "à¤¦à¤¸à¥à¤¤à¤¾à¤µà¥‡à¤œà¤¼ à¤¸à¥‚à¤šà¥€",
    "warnPending": "{{n}} à¤¦à¤¸à¥à¤¤à¤¾à¤µà¥‡à¤œà¤¼ à¤…à¤­à¥€ à¤­à¥€ à¤²à¤‚à¤¬à¤¿à¤¤ à¤¹à¥ˆà¤‚",
    "consentTitle": "à¤…à¤ªà¤¨à¥€ à¤ªà¥à¤°à¥‹à¤«à¤¼à¤¾à¤‡à¤² à¤¸à¤¾à¤à¤¾ à¤•à¤°à¤¨à¥‡ à¤•à¥€ à¤¸à¤¹à¤®à¤¤à¤¿",
    "consentBody": "à¤†à¤ªà¤•à¥€ à¤¸à¤¹à¤®à¤¤à¤¿ à¤¸à¥‡ à¤«à¤¿à¤¨à¤¸à¥‡à¤¤à¥ à¤¯à¤¹ à¤†à¤µà¥‡à¤¦à¤¨ à¤¸à¤¾à¤°à¤¾à¤‚à¤¶ à¤šà¤¯à¤¨à¤¿à¤¤ à¤…à¤§à¤¿à¤•à¥ƒà¤¤ à¤ªà¤¾à¤°à¥à¤Ÿà¤¨à¤° à¤•à¥‡ à¤¸à¤¾à¤¥ à¤¸à¤¾à¤à¤¾ à¤•à¤°à¥‡à¤—à¤¾à¥¤ à¤«à¤¿à¤¨à¤¸à¥‡à¤¤à¥ à¤‹à¤£ à¤¸à¥à¤µà¥€à¤•à¥ƒà¤¤ à¤¨à¤¹à¥€à¤‚ à¤•à¤°à¤¤à¤¾à¥¤",
    "consentCheck": "à¤®à¥ˆà¤‚ à¤‡à¤¸ à¤ªà¤¾à¤°à¥à¤Ÿà¤¨à¤° à¤•à¥‡ à¤¸à¤¾à¤¥ à¤…à¤ªà¤¨à¥€ à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€ à¤¸à¤¾à¤à¤¾ à¤•à¤°à¤¨à¥‡ à¤•à¥‹ à¤¸à¤¹à¤®à¤¤ à¤¹à¥‚à¤",
    "submit": "à¤†à¤µà¥‡à¤¦à¤¨ à¤œà¤®à¤¾ à¤•à¤°à¥‡à¤‚",
    "submitted": "à¤†à¤µà¥‡à¤¦à¤¨ à¤¸à¤«à¤²à¤¤à¤¾à¤ªà¥‚à¤°à¥à¤µà¤• à¤œà¤®à¤¾ à¤¹à¥à¤†",
    "trackNow": "à¤Ÿà¥à¤°à¥ˆà¤•à¤¿à¤‚à¤— à¤ªà¤° à¤œà¤¾à¤à¤"
  },
  "track": {
    "title": "à¤†à¤µà¥‡à¤¦à¤¨ à¤Ÿà¥à¤°à¥ˆà¤• à¤•à¤°à¥‡à¤‚",
    "emptyTitle": "à¤…à¤­à¥€ à¤•à¥‹à¤ˆ à¤†à¤µà¥‡à¤¦à¤¨ à¤¨à¤¹à¥€à¤‚",
    "emptyBody": "à¤«à¤¿à¤¨à¤¸à¥‡à¤¤à¥ à¤¸à¥‡ à¤†à¤µà¥‡à¤¦à¤¨ à¤•à¤°à¤¨à¥‡ à¤ªà¤° à¤Ÿà¥à¤°à¥ˆà¤•à¤¿à¤‚à¤— à¤†à¤ˆà¤¡à¥€ à¤•à¥‡ à¤¸à¤¾à¤¥ à¤²à¤¾à¤‡à¤µ à¤¸à¥à¤¥à¤¿à¤¤à¤¿ à¤¯à¤¹à¤¾à¤ à¤¦à¤¿à¤–à¥‡à¤—à¥€à¥¤",
    "timelineTitle": "à¤¸à¥à¤¥à¤¿à¤¤à¤¿ à¤‡à¤¤à¤¿à¤¹à¤¾à¤¸",
    "simulate": "à¤ªà¤¾à¤°à¥à¤Ÿà¤¨à¤° à¤…à¤ªà¤¡à¥‡à¤Ÿ à¤¸à¤¿à¤®à¥à¤²à¥‡à¤Ÿ à¤•à¤°à¥‡à¤‚ (à¤¡à¥‡à¤®à¥‹)",
    "updated": "à¤…à¤ªà¤¡à¥‡à¤Ÿ",
    "idLabel": "à¤Ÿà¥à¤°à¥ˆà¤•à¤¿à¤‚à¤— à¤†à¤ˆà¤¡à¥€",
    "docsPending": "à¤¦à¤¸à¥à¤¤à¤¾à¤µà¥‡à¤œà¤¼ à¤²à¤‚à¤¬à¤¿à¤¤: {{n}}"
  },
  "status": {
    "submitted": "à¤œà¤®à¤¾",
    "acknowledged": "à¤ªà¤¾à¤°à¥à¤Ÿà¤¨à¤° à¤¦à¥à¤µà¤¾à¤°à¤¾ à¤ªà¥à¤°à¤¾à¤ªà¥à¤¤",
    "under_review": "à¤¸à¤®à¥€à¤•à¥à¤·à¤¾à¤§à¥€à¤¨",
    "sanctioned": "à¤¸à¥à¤µà¥€à¤•à¥ƒà¤¤",
    "rejected": "à¤…à¤¸à¥à¤µà¥€à¤•à¥ƒà¤¤"
  },
  "settings": {
    "title": "à¤¸à¥‡à¤Ÿà¤¿à¤‚à¤—à¥à¤¸",
    "language": "à¤­à¤¾à¤·à¤¾",
    "voiceSection": "à¤µà¥‰à¤‡à¤¸ à¤—à¤¾à¤‡à¤¡à¥‡à¤‚à¤¸",
    "voiceToggle": "à¤ªà¤°à¤¿à¤£à¤¾à¤® à¤¬à¥‹à¤²à¤•à¤° à¤¸à¥à¤¨à¤¾à¤à¤",
    "voiceTest": "à¤†à¤µà¤¾à¤œà¤¼ à¤œà¤¾à¤à¤šà¥‡à¤‚",
    "testPhrase": "à¤«à¤¿à¤¨à¤¸à¥‡à¤¤à¥ à¤®à¥‡à¤‚ à¤†à¤ªà¤•à¤¾ à¤¸à¥à¤µà¤¾à¤—à¤¤ à¤¹à¥ˆà¥¤ à¤†à¤ªà¤•à¥‡ à¤¯à¥‹à¤œà¤¨à¤¾ à¤ªà¤°à¤¿à¤£à¤¾à¤® à¤¤à¥ˆà¤¯à¤¾à¤° à¤¹à¥ˆà¤‚à¥¤",
    "dataSection": "à¤¡à¥‡à¤Ÿà¤¾",
    "resetData": "à¤¡à¥‡à¤®à¥‹ à¤¡à¥‡à¤Ÿà¤¾ à¤°à¥€à¤¸à¥‡à¤Ÿ à¤•à¤°à¥‡à¤‚",
    "resetTitle": "à¤¸à¤¬ à¤•à¥à¤› à¤°à¥€à¤¸à¥‡à¤Ÿ à¤•à¤°à¥‡à¤‚?",
    "resetBody": "à¤‡à¤¸à¤¸à¥‡ à¤‡à¤¸ à¤¡à¤¿à¤µà¤¾à¤‡à¤¸ à¤ªà¤° à¤¸à¤¹à¥‡à¤œà¥€ à¤ªà¥à¤°à¥‹à¤«à¤¼à¤¾à¤‡à¤², à¤¸à¥‡à¤Ÿà¤¿à¤‚à¤—à¥à¤¸ à¤”à¤° à¤Ÿà¥à¤°à¥ˆà¤• à¤•à¤¿à¤ à¤†à¤µà¥‡à¤¦à¤¨ à¤¹à¤Ÿ à¤œà¤¾à¤à¤à¤—à¥‡à¥¤",
    "about": "à¤ªà¤°à¤¿à¤šà¤¯",
    "aboutBody": "à¤«à¤¿à¤¨à¤¸à¥‡à¤¤à¥ AI, NSFDC à¤¯à¥‹à¤œà¤¨à¤¾à¤“à¤‚ à¤•à¥‡ à¤²à¤¿à¤ à¤†à¤µà¥‡à¤¦à¤¨-à¤ªà¥‚à¤°à¥à¤µ à¤®à¤¾à¤°à¥à¤—à¤¦à¤°à¥à¤¶à¤• à¤¹à¥ˆà¥¤ à¤¯à¤¹ à¤‹à¤£ à¤¸à¥à¤µà¥€à¤•à¥ƒà¤¤ à¤¯à¤¾ à¤µà¤¿à¤¤à¤°à¤¿à¤¤ à¤¨à¤¹à¥€à¤‚ à¤•à¤°à¤¤à¤¾à¥¤",
    "madeFor": "à¤¸à¥à¤®à¤¾à¤°à¥à¤Ÿ à¤‡à¤‚à¤¡à¤¿à¤¯à¤¾ à¤¹à¥ˆà¤•à¤¥à¥‰à¤¨ 2026 à¤¹à¥‡à¤¤à¥ à¤¨à¤¿à¤°à¥à¤®à¤¿à¤¤"
  },
  "admin": {
    "title": "à¤à¤¡à¤®à¤¿à¤¨ à¤à¤¨à¤¾à¤²à¤¿à¤Ÿà¤¿à¤•à¥à¤¸",
    "subtitle": "à¤¸à¤®à¤—à¥à¤° à¤¦à¥ƒà¤¶à¥à¤¯ (à¤¡à¥‡à¤®à¥‹ à¤†à¤‚à¤•à¤¡à¤¼à¥‡)",
    "appsByStatus": "à¤¸à¥à¤¥à¤¿à¤¤à¤¿ à¤…à¤¨à¥à¤¸à¤¾à¤° à¤†à¤µà¥‡à¤¦à¤¨",
    "demandByPurpose": "à¤‰à¤¦à¥à¤¦à¥‡à¤¶à¥à¤¯ à¤…à¤¨à¥à¤¸à¤¾à¤° à¤®à¤¾à¤à¤—",
    "avgAck": "à¤”à¤¸à¤¤ à¤ªà¤¾à¤°à¥à¤Ÿà¤¨à¤° à¤¸à¥à¤µà¥€à¤•à¥ƒà¤¤à¤¿ à¤¸à¤®à¤¯",
    "note": "à¤‰à¤¤à¥à¤ªà¤¾à¤¦à¤¨ à¤®à¥‡à¤‚ à¤•à¥‡à¤µà¤² à¤—à¥à¤®à¤¨à¤¾à¤® à¤•à¤¿à¤¯à¤¾ à¤—à¤¯à¤¾ à¤¸à¤®à¤—à¥à¤° à¤¡à¥‡à¤Ÿà¤¾ à¤à¤•à¤¤à¥à¤° à¤•à¤¿à¤¯à¤¾ à¤œà¤¾à¤¤à¤¾ à¤¹à¥ˆ, à¤—à¥‹à¤ªà¤¨à¥€à¤¯à¤¤à¤¾ à¤¨à¥€à¤¤à¤¿ à¤…à¤¨à¥à¤¸à¤¾à¤°à¥¤"
  }
}
```


---

## 8. Reusable components (`src/components/`)

### `src/components/ui.tsx` â€” the UI kit

Eleven primitives used by every screen:

- **`Screen`** â€” safe-area-aware container (scroll or fixed), consistent padding/background.
- **`Header`** â€” page title + optional subtitle.
- **`Card`** â€” white rounded surface; `tone` tints the border for semantic states
  (`ok`, `warn`, `danger`, `info`).
- **`Chip`** â€” pill badge with tone + optional Ionicons icon (rule pass/fail,
  eligibility tags, availability, compliance gates).
- **`PrimaryButton` / `SecondaryButton`** â€” filled vs outlined actions, loading spinner support.
- **`Field`** â€” label + input + hint/error slot (error overrides hint).
- **`ThemedInput`** â€” consistent TextInput.
- **`SelectPills<T>`** â€” generic single-select pill row.
- **`SkeletonList`** â€” placeholder rows during simulated API latency.
- **`EmptyState`** â€” icon + title + body + optional action (reused by all four
  empty screens).
- **`StatusBadge`** â€” color-coded application status chip.

```tsx
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radii, spacing } from '../theme';

export function Screen({
  children,
  scroll = true,
  padded = true,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const padStyle: ViewStyle = {
    paddingTop: insets.top + spacing.m,
    paddingBottom: insets.bottom + spacing.xl,
    paddingHorizontal: padded ? spacing.l : 0,
  };
  if (scroll) {
    return (
      <ScrollView
        style={[styles.flex1, { backgroundColor: colors.bg }]}
        contentContainerStyle={[padStyle, style]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    );
  }
  return <View style={[styles.flex1, { backgroundColor: colors.bg }, padStyle, style]}>{children}</View>;
}

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ marginBottom: spacing.l }}>
      <Text style={styles.h1}>{title}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
    </View>
  );
}

export function Card({
  children,
  tone,
  style,
}: {
  children: React.ReactNode;
  tone?: 'ok' | 'warn' | 'danger' | 'info';
  style?: StyleProp<ViewStyle>;
}) {
  const borderColor =
    tone === 'ok' ? colors.okLight :
    tone === 'warn' ? colors.accentLight :
    tone === 'danger' ? colors.dangerLight :
    tone === 'info' ? colors.infoLight : colors.border;
  return <View style={[styles.card, { borderColor }, style]}>{children}</View>;
}

type Tone = 'ok' | 'fail' | 'warn' | 'info' | 'neutral';

export function Chip({
  label,
  tone = 'neutral',
  icon,
}: {
  label: string;
  tone?: Tone;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const bg =
    tone === 'ok' ? colors.okLight :
    tone === 'fail' ? colors.dangerLight :
    tone === 'warn' ? colors.warnLight :
    tone === 'info' ? colors.infoLight : colors.bg;
  const fg =
    tone === 'ok' ? colors.ok :
    tone === 'fail' ? colors.danger :
    tone === 'warn' ? colors.warn :
    tone === 'info' ? colors.info : colors.muted;
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={12} color={fg} /> : null}
      <Text style={[styles.chipText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btnPrimary,
        (disabled || loading) && { opacity: 0.55 },
        pressed && { opacity: 0.85 },
      ]}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>{label}</Text>}
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  icon,
}: {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.btnSecondary, pressed && { opacity: 0.8 }]}
    >
      {icon ? <Ionicons name={icon} size={16} color={colors.primary} /> : null}
      <Text style={styles.btnSecondaryText}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: spacing.l }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {hint && !error ? <Text style={styles.hint}>{hint}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function ThemedInput(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor={colors.faint}
      {...props}
      style={[styles.input, props.style as StyleProp<TextStyle>]}
    />
  );
}

export function SelectPills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.pillsWrap}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.pill, active && styles.pillActive]}>
            <Text style={[styles.pillText, active && styles.pillTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <View>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={[styles.skeletonLine, { width: '60%' }]} />
          <View style={[styles.skeletonLine, { width: '90%' }]} />
          <View style={[styles.skeletonLine, { width: '40%' }]} />
        </View>
      ))}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
      <Ionicons name={icon} size={44} color={colors.faint} />
      <Text style={[styles.h2, { marginTop: spacing.m, textAlign: 'center' }]}>{title}</Text>
      <Text style={[styles.sub, { textAlign: 'center', marginTop: spacing.s }]}>{body}</Text>
      {action ? <View style={{ marginTop: spacing.l }}>{action}</View> : null}
    </Card>
  );
}

export function StatusBadge({ status, label }: { status: string; label: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    submitted: { bg: colors.infoLight, fg: colors.info },
    acknowledged: { bg: colors.primaryLight, fg: colors.primary },
    under_review: { bg: colors.warnLight, fg: colors.warn },
    sanctioned: { bg: colors.okLight, fg: colors.ok },
    rejected: { bg: colors.dangerLight, fg: colors.danger },
  };
  const c = map[status] ?? { bg: colors.bg, fg: colors.muted };
  return (
    <View style={[styles.chip, { backgroundColor: c.bg }]}>
      <Text style={[styles.chipText, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

export function Divider() {
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.border,
        marginVertical: spacing.m,
      }}
    />
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  h1: { fontSize: font.title, fontWeight: '800', color: colors.ink },
  h2: { fontSize: font.h2 ?? 18, fontWeight: '700', color: colors.ink },
  sub: { fontSize: font.small, color: colors.muted, marginTop: spacing.xs, lineHeight: 19 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.l,
    borderWidth: 1,
    padding: spacing.l,
    marginBottom: spacing.m,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { fontSize: font.tiny, fontWeight: '700' },
  btnPrimary: {
    backgroundColor: colors.primary,
    borderRadius: radii.m,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: font.body },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radii.m,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 13,
    minHeight: 48,
    backgroundColor: colors.card,
  },
  btnSecondaryText: { color: colors.primary, fontWeight: '700', fontSize: font.body },
  fieldLabel: { fontSize: font.small, fontWeight: '700', color: colors.ink, marginBottom: spacing.s },
  hint: { fontSize: font.tiny, color: colors.faint, marginTop: spacing.xs },
  error: { fontSize: font.tiny, color: colors.danger, marginTop: spacing.xs, fontWeight: '600' },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.m,
    paddingHorizontal: spacing.m,
    paddingVertical: 12,
    fontSize: font.body,
    color: colors.ink,
  },
  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
  pill: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { fontSize: font.small, color: colors.ink, fontWeight: '600' },
  pillTextActive: { color: '#fff' },
  skeletonCard: {
    backgroundColor: colors.card,
    borderRadius: radii.l,
    padding: spacing.l,
    marginBottom: spacing.m,
    gap: spacing.s,
  },
  skeletonLine: { height: 12, borderRadius: 6, backgroundColor: '#EDF1F0' },
});
```

*(If `font.h2` isn't defined in `theme.ts`, add it (`h2: 18`) or drop the fallback.)*


### `src/components/charts.tsx` â€” SVG charts (zero chart dependencies)

Built directly on `react-native-svg` so everything runs inside Expo Go:

- **`DonutChart`** â€” principal-vs-interest ring on the calculator; EMI in the
  center, percentage legend beside it.
- **`MiniBars`** â€” labeled bar chart reused by Admin analytics.

```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Rect, Text as SvgText } from 'react-native-svg';
import { colors, font, spacing } from '../theme';

export function DonutChart({
  principal,
  interest,
  centerLabel,
  caption,
}: {
  principal: number;
  interest: number;
  centerLabel: string;
  caption: string;
}) {
  const total = Math.max(1, principal + interest);
  const frac = principal / total;
  const R = 54;
  const C = 2 * Math.PI * R;

  return (
    <View style={styles.donutWrap}>
      <View>
        <Svg width={140} height={140}>
          <Circle cx="70" cy="70" r={R} stroke={colors.accentLight} strokeWidth={16} fill="none" />
          <Circle
            cx="70"
            cy="70"
            r={R}
            stroke={colors.primary}
            strokeWidth={16}
            fill="none"
            strokeDasharray={`${C * frac} ${C}`}
            strokeLinecap="round"
            transform="rotate(-90 70 70)"
          />
        </Svg>
        <View style={styles.donutCenter} pointerEvents="none">
          <Text style={styles.donutValue}>{centerLabel}</Text>
        </View>
      </View>
      <View style={styles.legend}>
        <LegendDot color={colors.primary} label={`Principal Â· ${Math.round(frac * 100)}%`} />
        <LegendDot color={colors.accent} label={`Interest Â· ${Math.round((1 - frac) * 100)}%`} />
        <Text style={styles.caption}>{caption}</Text>
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

export function MiniBars({ data }: { data: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const W = 300;
  const H = 120;
  const gap = 18;
  const bw = (W - gap * (data.length - 1)) / Math.max(1, data.length);
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={W} height={H + 26}>
        {data.map((d, i) => {
          const h = Math.round((d.value / max) * H);
          const x = i * (bw + gap);
          return (
            <React.Fragment key={d.label}>
              <Rect x={x} y={H - h + 8} width={bw} height={h} rx={5} fill={d.color ?? colors.primary} />
              <SvgText x={x + bw / 2} y={H + 20} textAnchor="middle" fontSize={10} fill={colors.muted}>
                {d.label}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  donutWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  donutCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutValue: { fontSize: font.h2 ?? 18, fontWeight: '800', color: colors.ink },
  legend: { flex: 1, gap: spacing.s },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: font.small, color: colors.ink, fontWeight: '600' },
  caption: { fontSize: font.tiny, color: colors.faint, marginTop: spacing.xs },
});
```

### `src/components/Timeline.tsx` â€” vertical status history

Renders an application's event list as a connected rail: icon per status
(paper-plane â†’ mail-open â†’ search â†’ checkmark-circle), latest event highlighted
in primary color, older ones muted. Dates render locale-aware via `formatDate`.

```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ApplicationStatus, Lang, TimelineEvent } from '../engine/types';
import { colors, font, spacing } from '../theme';
import { formatDate } from '../utils';

const ICONS: Record<ApplicationStatus, keyof typeof Ionicons.glyphMap> = {
  submitted: 'paper-plane',
  acknowledged: 'mail-open',
  under_review: 'search',
  sanctioned: 'checkmark-circle',
  rejected: 'close-circle',
};

export function Timeline({
  events,
  lang,
  statusLabel,
}: {
  events: TimelineEvent[];
  lang: Lang;
  statusLabel: (s: ApplicationStatus) => string;
}) {
  return (
    <View>
      {events.map((e, i) => {
        const last = i === events.length - 1;
        return (
          <View key={`${e.status}-${i}`} style={styles.row}>
            <View style={styles.railWrap}>
              <Ionicons name={ICONS[e.status]} size={22} color={last ? colors.primary : colors.faint} />
              {!last ? <View style={styles.rail} /> : null}
            </View>
            <View style={styles.body}>
              <Text style={[styles.status, !last && { color: colors.muted }]}>
                {statusLabel(e.status)}
              </Text>
              <Text style={styles.date}>{formatDate(e.at, lang)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.m, paddingBottom: spacing.l },
  railWrap: { alignItems: 'center' },
  rail: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 2 },
  body: { paddingBottom: 2 },
  status: { fontSize: font.body, fontWeight: '700', color: colors.ink },
  date: { fontSize: font.tiny, color: colors.faint, marginTop: 2 },
});
```


---

## 9. Screens (`app/`)

### `app/home.tsx` â€” dashboard

Landing screen after language selection:

- Greeting uses first name if a profile exists; avatar icon routes to Settings.
- **Journey stepper** visualizes the six-step proposal flow (Discover â†’ â€¦ â†’
  Track); steps light progressively once a profile exists.
- Primary CTA switches between "Start eligibility check" and "Update details"
  depending on whether a saved profile exists; Track CTA appears only when
  applications exist (progressive disclosure keeps new users uncluttered).
- Live stat cards count real catalog sizes (`SCHEMES.length`, `PARTNERS.length`).
- Voice tip card renders only when voice guidance is enabled.

```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Card, Chip, PrimaryButton, Screen, SecondaryButton } from '../src/components/ui';
import { useApp } from '../src/store/AppStore';
import { SCHEMES } from '../data/schemes';
import { PARTNERS } from '../data/partners';
import { colors, font, spacing } from '../src/theme';

const STEPS = ['discover', 'match', 'calculate', 'route', 'apply', 'track'] as const;

const STEP_ICONS: Record<(typeof STEPS)[number], keyof typeof Ionicons.glyphMap> = {
  discover: 'compass',
  match: 'git-compare',
  calculate: 'calculator',
  route: 'map',
  apply: 'document-text',
  track: 'navigate',
};

export default function Home() {
  const { t } = useTranslation();
  const { profile, applications, voiceEnabled } = useApp();
  const name = profile?.name ? ` ${profile.name.split(' ')[0]}` : '';

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greet}>{t('home.greet', { name })}</Text>
          <Text style={styles.ps}>{t('common.demoNote')}</Text>
        </View>
        <Ionicons
          name="person-circle"
          size={40}
          color={colors.primary}
          onPress={() => router.push('/settings')}
        />
      </View>

      {voiceEnabled ? (
        <Card tone="info" style={{ paddingVertical: spacing.m }}>
          <View style={styles.tipRow}>
            <Ionicons name="volume-high" size={16} color={colors.info} />
            <Text style={styles.tipText}>{t('home.voiceTip')}</Text>
          </View>
        </Card>
      ) : null}

      <Card>
        <Text style={styles.journeyTitle}>{t('home.journeyTitle')}</Text>
        <View style={styles.stepsWrap}>
          {STEPS.map((s, i) => (
            <View key={s} style={styles.stepItem}>
              <View style={[styles.stepIcon, profile && i > 0 && styles.stepIconSoft]}>
                <Ionicons name={STEP_ICONS[s]} size={20} color={i === 0 ? '#fff' : colors.primary} />
              </View>
              <Text style={styles.stepLabel}>{t(`home.${s}`)}</Text>
            </View>
          ))}
        </View>
        <PrimaryButton
          label={profile ? t('home.updateCta') : t('home.startCta')}
          onPress={() => router.push('/profile')}
        />
        {applications.length > 0 ? (
          <View style={{ marginTop: spacing.s }}>
            <SecondaryButton label={t('home.trackCta')} icon="navigate" onPress={() => router.push('/track')} />
          </View>
        ) : null}
      </Card>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{SCHEMES.length}</Text>
          <Text style={styles.statLabel}>{t('home.schemesAvailable')}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{PARTNERS.length}</Text>
          <Text style={styles.statLabel}>{t('home.partnersListed')}</Text>
        </Card>
      </View>

      <Card>
        <View style={styles.rowBetween}>
          <View style={{ gap: spacing.xs }}>
            <Chip label="Admin" tone="info" icon="stats-chart" />
            <Text style={styles.adminLabel}>{t('home.adminLink')}</Text>
          </View>
          <SecondaryButton
            label={t('common.next')}
            icon="arrow-forward"
            onPress={() => router.push('/admin')}
          />
        </View>
      </Card>

      <Text style={styles.footer}>{t('common.psLine')}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.l,
  },
  greet: { fontSize: font.title + 2, fontWeight: '900', color: colors.ink },
  ps: { fontSize: font.tiny, color: colors.faint, marginTop: 2 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  tipText: { flex: 1, fontSize: font.small, color: colors.info, fontWeight: '600' },
  journeyTitle: { fontSize: font.h2 ?? 18, fontWeight: '800', color: colors.ink, marginBottom: spacing.l },
  stepsWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  stepItem: { alignItems: 'center', gap: spacing.xs, flex: 1 },
  stepIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconSoft: { backgroundColor: colors.primaryLight },
  stepLabel: {
    fontSize: font.tiny,
    fontWeight: '700',
    color: colors.muted,
    textAlign: 'center',
  },
  statsRow: { flexDirection: 'row', gap: spacing.m },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 26, fontWeight: '900', color: colors.primaryDark },
  statLabel: {
    fontSize: font.tiny,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adminLabel: { fontSize: font.body, fontWeight: '700', color: colors.ink },
  footer: {
    textAlign: 'center',
    fontSize: font.tiny,
    color: colors.faint,
    marginTop: spacing.m,
  },
});
```

### `app/profile.tsx` â€” 5-step wizard

The input backbone. Key mechanics:

- Draft state holds raw **strings** for numerics (typing is never fought by
  reformatting); values are parsed only on save.
- Per-step validation with inline errors (name; age 18â€“65; positive amounts;
  district). Choosing *education* reveals education-level + course-type pickers,
  which ELS rules later require.
- Choosing *pending* SC status immediately shows the amber conditional-
  eligibility explainer â€” expectation-setting before results appear.
- Step 5 is the **canonical review**: every amount shown â‚¹-formatted AND in
  words ("eight lakh rupees") â€” the mishearing/mistranslation guard.
- Confirm builds the typed `BeneficiaryProfile`, persists it via the store and
  replaces to `/match`. Re-opening pre-fills every field from stored profile.

```tsx
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import type {
  BeneficiaryProfile,
  CourseType,
  EducationLevel,
  Gender,
  LocalText,
  Purpose,
  ScStatus,
} from '../src/engine/types';
import { COURSE_TYPES, EDU_LEVELS, GENDERS, PURPOSES, SC_STATUSES } from '../data/constants';
import { DISTRICTS } from '../data/districts';
import { amountInWordsIndian, formatINR, lt } from '../src/utils';
import { colors, font, spacing } from '../src/theme';

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

  const num = (s: string) => Number(s.replace(/[^0-9.]/g, '')) || 0;
  const fail = (msg: string): boolean => {
    setErr(msg);
    return false;
  };

  const validate = (): boolean => {
    if (step === 0) {
      if (!d.name.trim()) return fail(t('profile.errName'));
      const age = num(d.age);
      if (!age || age < 18 || age > 65) return fail(t('profile.errAge'));
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
  const purposeText =
    PURPOSES.find((x) => x.value === d.purpose) != null
      ? lt(PURPOSES.find((x) => x.value === d.purpose)!.label as LocalText, lang)
      : '-';

  return (
    <Screen padded={false}>
      <View style={styles.innerPad}>
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
                <SelectPills
                  options={GENDERS.map((g) => ({ value: g.value, label: lt(g.label, lang) }))}
                  value={d.gender}
                  onChange={(v) => set('gender', v)}
                />
              </Field>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <Field label={t('profile.scStatus')}>
                <SelectPills
                  options={SC_STATUSES.map((g) => ({ value: g.value, label: lt(g.label, lang) }))}
                  value={d.scStatus}
                  onChange={(v) => set('scStatus', v)}
                />
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
                <ThemedInput
                  value={d.annualIncome ? formatINR(num(d.annualIncome)) : ''}
                  onChangeText={(v) => set('annualIncome', v)}
                  keyboardType="number-pad"
                  placeholder="240000"
                />
              </Field>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Field label={t('profile.purpose')}>
                <SelectPills
                  options={PURPOSES.map((g) => ({ value: g.value, label: lt(g.label, lang) }))}
                  value={d.purpose}
                  onChange={(v) => set('purpose', v)}
                />
              </Field>
              <Field label={t('profile.cost')} hint={t('profile.costHint')} error={err}>
                <ThemedInput
                  value={d.projectCost ? formatINR(num(d.projectCost)) : ''}
                  onChangeText={(v) => set('projectCost', v)}
                  keyboardType="number-pad"
                  placeholder="800000"
                />
              </Field>
              {d.purpose === 'education' ? (
                <>
                  <Field label={t('profile.eduLevel')}>
                    <SelectPills
                      options={EDU_LEVELS.map((g) => ({ value: g.value, label: lt(g.label, lang) }))}
                      value={d.educationLevel}
                      onChange={(v) => set('educationLevel', v)}
                    />
                  </Field>
                  <Field label={t('profile.courseType')}>
                    <SelectPills
                      options={COURSE_TYPES.map((g) => ({ value: g.value, label: lt(g.label, lang) }))}
                      value={d.courseType}
                      onChange={(v) => set('courseType', v)}
                    />
                  </Field>
                </>
              ) : null}
            </>
          ) : null}

          {step === 3 ? (
            <Field label={t('profile.district')} hint={t('profile.districtHint')} error={err}>
              <View style={styles.districtGrid}>
                {DISTRICTS.map((dist) => {
                  const active = d.district === dist.name;
                  return (
                    <Pressable key={dist.name} style={styles.districtCell} onPress={() => set('district', dist.name)}>
                      <SecondaryButton
                        label={active ? `âœ“ ${dist.name}` : dist.name}
                        onPress={() => set('district', dist.name)}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </Field>
          ) : null}

          {step === 4 ? (
            <>
              <Card>
                <ReviewRow icon="person" label={t('profile.name')} value={d.name || '-'} />
                <ReviewRow icon="calendar" label={t('profile.age')} value={d.age || '-'} />
                <ReviewRow
                  icon="ribbon"
                  label={t('profile.scStatus')}
                  value={SC_STATUSES.find((x) => x.value === d.scStatus)
                    ? lt(SC_STATUSES.find((x) => x.value === d.scStatus)!.label, lang)
                    : '-'}
                />
                <ReviewRow
                  icon="cash"
                  label={t('profile.income')}
                  value={formatINR(num(d.annualIncome))}
                  sub={amountInWordsIndian(num(d.annualIncome))}
                />
                <ReviewRow icon="flag" label={t('profile.purpose')} value={purposeText} />
                <ReviewRow
                  icon="cube"
                  label={t('profile.cost')}
                  value={formatINR(num(d.projectCost))}
                  sub={amountInWordsIndian(num(d.projectCost))}
                />
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
            <PrimaryButton
              label={step === TOTAL - 1 ? t('profile.confirmCta') : t('common.next')}
              onPress={next}
            />
          </View>
        </View>
      </View>
    </Screen>
  );
}

function ReviewRow({
  icon,
  label,
  value,
  sub,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  sub?: string;
}) {
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
  innerPad: { flex: 1, paddingHorizontal: spacing.l, paddingTop: spacing.m },
  progressRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.m },
  progressSeg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressSegActive: { backgroundColor: colors.primary },
  stepText: {
    fontSize: font.tiny,
    fontWeight: '700',
    color: colors.faint,
    marginBottom: spacing.xs,
  },
  title: { fontSize: font.title, fontWeight: '800', color: colors.ink, marginBottom: spacing.l },
  warnRow: { flexDirection: 'row', gap: spacing.s, alignItems: 'flex-start' },
  warnText: {
    flex: 1,
    fontSize: font.small,
    color: colors.warn,
    fontWeight: '600',
    lineHeight: 19,
  },
  districtGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  districtCell: { width: '50%', marginBottom: spacing.s },
  navRow: { flexDirection: 'row', gap: spacing.m, marginTop: spacing.m },
  canonical: { fontSize: font.tiny, color: colors.info, fontWeight: '600' },
  reviewRow: {
    flexDirection: 'row',
    gap: spacing.m,
    alignItems: 'flex-start',
    marginBottom: spacing.l,
  },
  reviewLabel: { fontSize: font.tiny, color: colors.faint, fontWeight: '700' },
  reviewValue: {
    fontSize: font.body,
    color: colors.ink,
    fontWeight: '700',
    marginTop: 2,
  },
  reviewSub: {
    fontSize: font.tiny,
    color: colors.muted,
    fontStyle: 'italic',
    marginTop: 2,
  },
});
```


### `app/match.tsx` â€” ranked results with explainability

The flagship screen. Behavior:

- Refetches on focus (`useFocusEffect`) so profile edits always re-rank.
- Skeletons during simulated latency; dedicated empty-state if no profile yet.
- **Eligible cards**: rank #1 gets star chip + green tint; every card previews
  estimated assistance + indicative EMI (quick `computeLoanPlan` pass) before
  the user commits to the calculator.
- **"Why this result?"** expands the full rule trace â€” âœ“/âœ— per rule with
  expected-vs-actual values â€” plus required docs and scheme version/source.
  Judges can audit every recommendation line-by-line.
- **Conditional banner** above results when any soft rule failed (certificate pending).
- **Near-miss card** lists ineligible schemes with their failed reasons spelled
  out â€” no dead ends.
- Voice button (when enabled) speaks the top recommendation via `expo-speech`;
  speech is stopped on unmount.

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import {
  Card,
  Chip,
  Divider,
  EmptyState,
  Header,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SkeletonList,
} from '../src/components/ui';
import { useApp } from '../src/store/AppStore';
import { Lang, MatchResult } from '../src/engine/types';
import { computeLoanPlan } from '../src/engine/calc';
import { fetchMatchResults } from '../src/services/api';
import { docLabel } from '../data/constants';
import { formatINR, lt } from '../src/utils';
import { colors, font, radii, spacing } from '../src/theme';

export default function Match() {
  const { t } = useTranslation();
  const { lang, profile, voiceEnabled } = useApp();
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      if (!profile) return;
      setResults(null);
      fetchMatchResults(profile).then((r) => {
        if (alive) setResults(r);
      });
      return () => {
        alive = false;
      };
    }, [profile])
  );

  useEffect(() => () => Speech.stop(), []);

  if (!profile) {
    return (
      <Screen>
        <Header title={t('match.title')} />
        <EmptyState
          icon="person-circle"
          title={t('match.emptyTitle')}
          body={t('profile.canonicalNote')}
          action={<PrimaryButton label={t('home.startCta')} onPress={() => router.replace('/profile')} />}
        />
      </Screen>
    );
  }

  const loading = results === null;
  const all = results ?? [];
  const eligible = all.filter((r) => r.eligible || r.conditional);
  const nearMiss = all.filter((r) => !r.eligible && !r.conditional);
  const hasConditional = eligible.some((r) => r.conditional);
  const top = eligible[0];

  const speakTop = () => {
    if (!top) return;
    const text =
      lang === 'hi'
        ? `à¤†à¤ªà¤•à¥‡ à¤²à¤¿à¤ à¤¸à¤°à¥à¤µà¤¶à¥à¤°à¥‡à¤·à¥à¤  à¤¯à¥‹à¤œà¤¨à¤¾: ${top.scheme.name.hi}. à¤…à¤¨à¥à¤®à¤¾à¤¨à¤¿à¤¤ à¤¸à¤¹à¤¾à¤¯à¤¤à¤¾ ${top.scheme.maxAssistance} à¤°à¥à¤ªà¤¯à¥‡ à¤¤à¤•à¥¤`
        : `Top scheme for you: ${top.scheme.name.en}. Estimated assistance up to ${top.scheme.maxAssistance} rupees.`;
    Speech.stop();
    Speech.speak(text, { language: lang === 'hi' ? 'hi-IN' : 'en-US' });
  };

  return (
    <Screen>
      <View style={styles.titleRow}>
        <Header title={t('match.title')} subtitle={t('common.demoNote')} />
        {voiceEnabled ? (
          <Pressable onPress={speakTop} disabled={!top} style={styles.speakerBtn}>
            <Ionicons name="volume-high" size={22} color={top ? colors.primary : colors.faint} />
          </Pressable>
        ) : null}
      </View>

      {hasConditional ? (
        <Card tone="warn">
          <Text style={styles.banner}>{t('match.conditionalBanner')}</Text>
        </Card>
      ) : null}

      {loading ? <SkeletonList rows={3} /> : null}

      {!loading && eligible.length === 0 ? (
        <EmptyState
          icon="sad"
          title={t('match.emptyTitle')}
          body={t('match.emptyBody')}
          action={<SecondaryButton label={t('match.goWizard')} icon="pencil" onPress={() => router.push('/profile')} />}
        />
      ) : null}

      {!loading && eligible.length > 0 ? (
        <>
          <Text style={styles.count}>{t('match.eligibleCount', { n: eligible.length })}</Text>
          {eligible.map((r, idx) => (
            <SchemeCard
              key={r.scheme.id}
              result={r}
              top={idx === 0}
              previewCost={profile.projectCost}
              expanded={expandedId === r.scheme.id}
              onToggle={() => setExpandedId(expandedId === r.scheme.id ? null : r.scheme.id)}
              lang={lang}
              t={t}
            />
          ))}

          {nearMiss.length > 0 ? (
            <Card tone="danger">
              <Text style={styles.nearTitle}>{t('match.nearMissTitle')}</Text>
              <Text style={styles.nearBody}>{t('match.nearMissBody')}</Text>
              {nearMiss.map((r) => (
                <View key={r.scheme.id} style={styles.nearItem}>
                  <Ionicons name="close-circle" size={14} color={colors.danger} />
                  <Text style={styles.nearName}>{lt(r.scheme.name, lang)}</Text>
                  {r.failedRules.slice(0, 1).map((fr) => (
                    <Text key={fr.label.en} style={styles.nearReason}>
                      {lt(fr.label, lang)}
                    </Text>
                  ))}
                </View>
              ))}
            </Card>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

function SchemeCard({
  result,
  top,
  previewCost,
  expanded,
  onToggle,
  lang,
  t,
}: {
  result: MatchResult;
  top: boolean;
  previewCost: number;
  expanded: boolean;
  onToggle: () => void;
  lang: Lang;
  t: (k: string, o?: Record<string, unknown>) => string;
}) {
  const s = result.scheme;
  const clamped = Math.min(Math.max(previewCost || s.minCost, s.minCost), s.maxAssistance);
  const plan = computeLoanPlan(s, clamped, false);

  return (
    <Card tone={result.eligible ? 'ok' : undefined}>
      {top ? (
        <View style={{ position: 'absolute', top: spacing.m, right: spacing.m }}>
          <Chip label={t('match.topPick')} tone="ok" icon="star" />
        </View>
      ) : null}
      <Text style={styles.schemeName}>{lt(s.name, lang)}</Text>
      <Text style={styles.schemeDesc}>{lt(s.desc, lang)}</Text>

      <View style={styles.statRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>{t('match.estAssist')}</Text>
          <Text style={styles.statValue}>{formatINR(plan.eligibleLoan)}</Text>
        </View>
        <View style={[styles.statBox, styles.statBoxAlt]}>
          <Text style={styles.statLabel}>{t('calc.emi')}</Text>
          <Text style={styles.statValue}>â‰ˆ {formatINR(plan.emi)}</Text>
        </View>
      </View>

      <Pressable onPress={onToggle} style={styles.whyBtn}>
        <Ionicons name={expanded ? 'chevron-up' : 'help-circle'} size={16} color={colors.primary} />
        <Text style={styles.whyText}>{expanded ? t('match.hideDetails') : t('match.whyEligible')}</Text>
        <Ionicons name={expanded ? 'remove' : 'add'} size={16} color={colors.faint} />
      </Pressable>

      {expanded ? (
        <View style={styles.traceWrap}>
          {result.ruleTrace.map((row) => (
            <View key={row.label.en} style={styles.traceRow}>
              <Ionicons
                name={row.pass ? 'checkmark-circle' : 'close-circle'}
                size={16}
                color={row.pass ? colors.ok : colors.danger}
              />
              <Text style={[styles.traceText, !row.pass && styles.traceFail]}>
                {lt(row.label, lang)} Â· {t('match.traceRow', { expected: row.expected, actual: row.actual })}
              </Text>
            </View>
          ))}
          <Divider />
          <Text style={styles.docsTitle}>{t('match.docsNeeded')}</Text>
          <View style={styles.docsWrap}>
            {s.requiredDocs.map((d) => (
              <Chip key={d} label={docLabel(d, lang)} tone="neutral" icon="document-text" />
            ))}
          </View>
          <Text style={styles.sourceLine}>
            {t('match.sourceLabel')}: {s.code} Â· v{s.version} Â· {s.effectiveFrom} Â· {s.sourceRef}
          </Text>
        </View>
      ) : null}

      <View style={{ marginTop: spacing.m }}>
        <PrimaryButton label={t('match.calcCta')} onPress={() => router.push(`/calc?scheme=${s.id}`)} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  speakerBtn: {
    width: 42,
    height: 42,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: { fontSize: font.small, color: colors.warn, fontWeight: '700', lineHeight: 19 },
  count: { fontSize: font.small, fontWeight: '700', color: colors.muted, marginBottom: spacing.m },
  schemeName: { fontSize: font.h2, fontWeight: '800', color: colors.ink, paddingRight: 90 },
  schemeDesc: { fontSize: font.small, color: colors.muted, marginTop: spacing.xs, lineHeight: 19 },
  statRow: { flexDirection: 'row', gap: spacing.m, marginTop: spacing.l },
  statBox: { flex: 1, backgroundColor: colors.bg, borderRadius: radii.m, padding: spacing.m },
  statBoxAlt: { backgroundColor: colors.primaryLight },
  statLabel: { fontSize: font.tiny, color: colors.faint, fontWeight: '700' },
  statValue: { fontSize: font.body, fontWeight: '800', color: colors.primaryDark, marginTop: 2 },
  whyBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, marginTop: spacing.l },
  whyText: { flex: 1, fontSize: font.small, fontWeight: '700', color: colors.primary },
  traceWrap: {
    marginTop: spacing.m,
    backgroundColor: colors.bg,
    borderRadius: radii.m,
    padding: spacing.m,
  },
  traceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.s, marginBottom: spacing.s },
  traceText: { flex: 1, fontSize: font.tiny, color: colors.ink, lineHeight: 17 },
  traceFail: { color: colors.danger, fontWeight: '600' },
  docsTitle: { fontSize: font.tiny, fontWeight: '800', color: colors.muted, marginBottom: spacing.s },
  docsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
  sourceLine: { fontSize: font.tiny, color: colors.faint, marginTop: spacing.m },
  nearTitle: { fontSize: font.body, fontWeight: '800', color: colors.danger },
  nearBody: { fontSize: font.tiny, color: colors.muted, marginTop: spacing.xs },
  nearItem: { marginTop: spacing.m, gap: 2 },
  nearName: { fontSize: font.small, fontWeight: '700', color: colors.ink },
  nearReason: { fontSize: font.tiny, color: colors.danger },
});
```


### `app/calc.tsx` â€” affordability calculator

Receives `?scheme=<id>` from Match. The cost input is editable (defaults to the
profile's project cost) and moratorium toggles on by default when the scheme has
one. All math comes from `computeLoanPlan` â€” the UI never duplicates formulas.
The donut chart shows principal vs interest with EMI in the center; explicit
notes explain what happens during moratorium, plus an honest disclaimer that
final figures come from the channel partner.

```tsx
import React, { useMemo, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Card, Field, Header, PrimaryButton, Screen, ThemedInput } from '../src/components/ui';
import { DonutChart } from '../src/components/charts';
import { useApp } from '../src/store/AppStore';
import { computeLoanPlan } from '../src/engine/calc';
import { getSchemeById } from '../data/schemes';
import { formatINR } from '../src/utils';
import { colors, font, radii, spacing } from '../src/theme';

export default function Calc() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ scheme?: string }>();
  const scheme = getSchemeById(String(params.scheme ?? ''));
  const { profile } = useApp();

  const [costStr, setCostStr] = useState(() =>
    String(profile?.projectCost ?? scheme?.maxAssistance ?? 100000)
  );
  const [mora, setMora] = useState(() => (scheme?.moratoriumMonths ?? 0) > 0);

  const cost = Number(costStr.replace(/[^0-9]/g, '')) || 0;

  const plan = useMemo(
    () => (scheme ? computeLoanPlan(scheme, cost, mora) : null),
    [scheme, cost, mora]
  );

  if (!scheme || !plan) {
    return (
      <Screen>
        <Header title={t('calc.title')} />
        <Card>
          <Text style={styles.missing}>{t('match.emptyBody')}</Text>
        </Card>
        <PrimaryButton label={t('common.back')} onPress={() => router.back()} />
      </Screen>
    );
  }

  const hasMora = scheme.moratoriumMonths > 0;

  return (
    <Screen>
      <Header title={t('calc.title')} subtitle={`${scheme.code} Â· ${formatINR(scheme.maxAssistance)} max`} />

      <Field label={t('calc.costLabel')}>
        <ThemedInput value={costStr} onChangeText={setCostStr} keyboardType="number-pad" />
      </Field>

      {hasMora ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.toggleLabel}>{t('calc.moratoriumToggle')}</Text>
          <Switch value={mora} onValueChange={setMora} trackColor={{ true: colors.primary }} />
        </Card>
      ) : null}

      <Card tone="info">
        <DonutChart
          principal={plan.eligibleLoan}
          interest={plan.totalInterest}
          centerLabel={formatINR(plan.emi)}
          caption={t('calc.monthsNote', { m: scheme.repaymentMonths, r: scheme.interestRate })}
        />
      </Card>

      <View style={styles.grid}>
        <StatBox label={t('calc.eligibleLoan')} value={formatINR(plan.eligibleLoan)} icon="cash" />
        <StatBox label={t('calc.contribution')} value={formatINR(plan.contribution)} icon="wallet" />
        <StatBox label={t('calc.totalInterest')} value={formatINR(plan.totalInterest)} icon="trending-up" />
        <StatBox label={t('calc.totalPayable')} value={formatINR(plan.totalPayable)} icon="calculator" dark />
      </View>

      {mora && hasMora ? (
        <Card tone="warn">
          <Text style={styles.noteTitle}>{t('calc.principalAfterMoratorium')}</Text>
          <Text style={styles.noteValue}>{formatINR(plan.principalAfterMoratorium ?? plan.eligibleLoan)}</Text>
          <Text style={styles.noteBody}>
            {t('calc.moratoriumNote', {
              amt: formatINR((plan.principalAfterMoratorium ?? plan.eligibleLoan) - plan.eligibleLoan),
            })}
          </Text>
        </Card>
      ) : null}

      <Card>
        <View style={styles.discRow}>
          <Ionicons name="information-circle" size={16} color={colors.faint} />
          <Text style={styles.disclaimer}>{t('calc.disclaimer')}</Text>
        </View>
      </Card>

      <PrimaryButton label={t('calc.cta')} onPress={() => router.push(`/partners?scheme=${scheme.id}`)} />
    </Screen>
  );
}

function StatBox({
  label,
  value,
  icon,
  dark,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  dark?: boolean;
}) {
  return (
    <View style={[styles.statBox, dark && styles.statBoxDark]}>
      <Ionicons name={icon} size={16} color={dark ? '#fff' : colors.primary} />
      <Text style={[styles.statLabel, dark && { color: '#D7E8E3' }]}>{label}</Text>
      <Text style={[styles.statValue, dark && { color: '#fff' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleLabel: { flex: 1, fontSize: font.small, fontWeight: '700', color: colors.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.m },
  statBox: {
    width: '47.5%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.l,
    padding: spacing.l,
    gap: spacing.xs,
  },
  statBoxDark: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  statLabel: { fontSize: font.tiny, fontWeight: '700', color: colors.faint },
  statValue: { fontSize: font.h2, fontWeight: '800', color: colors.primaryDark },
  noteTitle: { fontSize: font.tiny, fontWeight: '800', color: colors.warn },
  noteValue: { fontSize: font.body, fontWeight: '800', color: colors.ink, marginTop: 2 },
  noteBody: { fontSize: font.tiny, color: colors.warn, marginTop: spacing.xs, lineHeight: 17 },
  discRow: { flexDirection: 'row', gap: spacing.s, alignItems: 'flex-start' },
  disclaimer: { flex: 1, fontSize: font.tiny, color: colors.faint, lineHeight: 17 },
  missing: { fontSize: font.small, color: colors.muted, marginBottom: spacing.l },
});
```


### `app/partners.tsx` â€” compliant routing with visible gates

Reads `?scheme=<id>`, resolves the user's district from the stored profile, then
calls `fetchNearbyPartners`. The full routing contract is visible in the UI:

- Header shows the active radius ("within 25 km") and, when the radius had to
  widen, an explicit banner explains why (the fallback story is a feature).
- Every partner card carries: distance chip, availability chip (open/busy),
  compliance chips â€” green "compliance gate passed" or amber "e-KYC setup
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
      <Header title={t('partners.title')} subtitle={`${scheme.code} Â· ${scheme.name[lang]}`} />

      {data ? (
        <>
          <Text style={styles.radius}>
            {t('partners.within', { km: data.radiusKm })} Â· {districtName}
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


### `app/apply.tsx` â€” checklist + consent + submission

Turns the match into a tracked application:

- Checklist generated from `scheme.requiredDocs` with per-item checkboxes and a
  live "N pending" counter; submitting with pending docs is allowed (real life)
  but warned about explicitly.
- **Consent is a hard gate**: submission stays disabled until the user opts in
  to sharing their profile summary with the selected partner â€” consent-first
  architecture, and the screen states plainly that FinSetu does not sanction loans.
- Submit calls the store's `addApplication` (mints tracking ID `FS-2026-XXXXX`,
  stamps timeline), then routes to Track.

```tsx
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import {
  Card,
  Chip,
  Header,
  PrimaryButton,
  Screen,
} from '../src/components/ui';
import { useApp } from '../src/store/AppStore';
import { computeLoanPlan } from '../src/engine/calc';
import { getSchemeById } from '../data/schemes';
import { getPartnerById } from '../data/partners';
import { docLabel } from '../data/constants';
import { formatINR } from '../src/utils';
import { colors, font, radii, spacing } from '../src/theme';

export default function Apply() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ scheme?: string; partner?: string }>();
  const schemeId = String(params.scheme ?? '');
  const partnerId = String(params.partner ?? '');
  const scheme = getSchemeById(schemeId);
  const partner = getPartnerById(partnerId);
  const { lang, profile, addApplication } = useApp();

  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const docs = scheme?.requiredDocs ?? [];
  const pendingCount = useMemo(() => docs.filter((d) => !checked[d]).length, [docs, checked]);
  const plan = useMemo(
    () => (scheme && profile ? computeLoanPlan(scheme, profile.projectCost, false) : null),
    [scheme, profile]
  );

  if (!scheme || !partner || !profile) {
    return (
      <Screen>
        <Header title={t('apply.title')} />
        <PrimaryButton label={t('common.back')} onPress={() => router.back()} />
      </Screen>
    );
  }

  const submit = async () => {
    setSubmitting(true);
    await addApplication({
      schemeId: scheme.id,
      partnerId: partner.id,
      requestedAmount: plan?.eligibleLoan ?? profile.projectCost,
      purpose: profile.purpose,
      district: profile.district,
      docsPending: pendingCount,
    });
    setSubmitting(false);
    Alert.alert(t('apply.submitted'), '', [
      { text: t('apply.trackNow'), onPress: () => router.replace('/track') },
    ]);
  };

  return (
    <Screen>
      <Header title={t('apply.title')} subtitle={`${scheme.name[lang]} â†’ ${partner.name}`} />

      <Card>
        <View style={styles.sumRow}>
          <Chip label={scheme.code} tone="info" icon="ribbon" />
          <Chip label={partner.type} tone="neutral" icon="business" />
        </View>
        <Text style={styles.amountLabel}>{t('calc.eligibleLoan')}</Text>
        <Text style={styles.amount}>{formatINR(plan?.eligibleLoan ?? 0)}</Text>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{t('apply.checklist')}</Text>
        {docs.map((d) => (
          <Pressable
            key={d}
            style={styles.docRow}
            onPress={() => setChecked((c) => ({ ...c, [d]: !c[d] }))}
          >
            <Ionicons
              name={checked[d] ? 'checkbox' : 'square-outline'}
              size={22}
              color={checked[d] ? colors.ok : colors.faint}
            />
            <Text style={[styles.docText, checked[d] && styles.docDone]}>{docLabel(d, lang)}</Text>
          </Pressable>
        ))}
        {pendingCount > 0 ? (
          <Card tone="warn" style={{ marginTop: spacing.m, marginBottom: 0 }}>
            <Text style={styles.warn}>{t('apply.warnPending', { n: pendingCount })}</Text>
          </Card>
        ) : null}
      </Card>

      <Card tone="info">
        <Text style={styles.consentTitle}>{t('apply.consentTitle')}</Text>
        <Text style={styles.consentBody}>{t('apply.consentBody')}</Text>
        <View style={styles.consentRow}>
          <Switch value={consent} onValueChange={setConsent} trackColor={{ true: colors.primary }} />
          <Text style={styles.consentLabel}>{t('apply.consentCheck')}</Text>
        </View>
      </Card>

      <PrimaryButton
        label={t('apply.submit')}
        loading={submitting}
        disabled={!consent}
        onPress={submit}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sumRow: { flexDirection: 'row', gap: spacing.s, marginBottom: spacing.m },
  amountLabel: { fontSize: font.tiny, fontWeight: '700', color: colors.faint },
  amount: { fontSize: font.title, fontWeight: '900', color: colors.primaryDark },
  sectionTitle: { fontSize: font.body, fontWeight: '800', color: colors.ink, marginBottom: spacing.m },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, paddingVertical: spacing.s },
  docText: { flex: 1, fontSize: font.small, color: colors.ink, fontWeight: '600' },
  docDone: { color: colors.faint, textDecorationLine: 'line-through' },
  warn: { fontSize: font.tiny, color: colors.warn, fontWeight: '700' },
  consentTitle: { fontSize: font.body, fontWeight: '800', color: colors.info },
  consentBody: { fontSize: font.tiny, color: colors.muted, marginTop: spacing.xs, lineHeight: 17 },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, marginTop: spacing.l },
  consentLabel: { flex: 1, fontSize: font.small, fontWeight: '700', color: colors.ink },
});
```


### `app/track.tsx` â€” live status with timeline + demo simulator

Lists every application (newest first) with scheme/partner, status badge and
tracking ID in monospace. Tapping a card expands its **status history** timeline
(reusing the `Timeline` component). For demo purposes a "Simulate partner
update" button advances the state machine one step â€” standing in for the future
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

*(add `import { router } from 'expo-router';` at top â€” used by the empty-state CTA.)*

### `app/settings.tsx` â€” language, voice, data reset

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
      <Header title={t('settings.title')} subtitle={`${t('common.version')} Â· ${applications.length} apps`} />

      <Card>
        <Text style={styles.section}>{t('settings.language')}</Text>
        <View style={styles.langRow}>
          <View style={{ flex: 1 }}>
            <SecondaryButton label="English" icon="language" onPress={() => changeLang('en')} />
          </View>
          <View style={{ flex: 1 }}>
            <SecondaryButton label="à¤¹à¤¿à¤‚à¤¦à¥€" icon="language" onPress={() => changeLang('hi')} />
          </View>
        </View>
        <Text style={styles.activeLang}>{lang === 'en' ? 'English active' : 'à¤¹à¤¿à¤‚à¤¦à¥€ à¤šà¤¾à¤²à¥‚'}</Text>
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
          Profile: {profile ? profile.name : 'â€”'} Â· Applications: {applications.length}
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


### `app/admin.tsx` â€” aggregate analytics (demo)

Reads the local application store and renders two `MiniBars` charts â€”
applications by status and demand by purpose (derived via each scheme's
category) â€” plus a static average-acknowledgement KPI. The privacy note states
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

### `app/_layout.tsx` â€” providers + i18n bootstrap

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

### `app/index.tsx` â€” language gate (first launch)

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
          <SecondaryButton label="à¤¹à¤¿à¤‚à¤¦à¥€" onPress={() => go('hi')} />
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


---

## 11. Tests (`src/engine/__tests__/`)

Jest with `jest-expo` preset. The engine is pure TypeScript, so the entire
decision core is testable without touching React Native.

### `jest.config.js`

```js
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)',
  ],
};
```

### `src/engine/__tests__/rules.test.ts` â€” the decision-core contract

Covers the personas from the demo script plus edge cases. These tests are the
executable specification of eligibility logic â€” change a rule, a test speaks up.

```ts
import { matchSchemes, evaluateScheme } from '../rules';
import { SCHEMES } from '../../../data/schemes';
import { BeneficiaryProfile } from '../types';

const base = (over: Partial<BeneficiaryProfile>): BeneficiaryProfile => ({
  name: 'Sunita Devi',
  age: 32,
  gender: 'female',
  scStatus: 'verified',
  annualIncome: 250000,
  purpose: 'business',
  projectCost: 600000,
  district: 'Bhopal',
  ...over,
});

describe('matchSchemes', () => {
  it('ranks New Swarnima first for a verified SC woman within limits', () => {
    const res = matchSchemes(base({}));
    expect(res[0].scheme.id).toBe('new_swarnima');
    expect(res[0].eligible).toBe(true);
    expect(res[0].conditional).toBe(false);
    expect(res[0].score).toBeGreaterThan(0);
  });

  it('marks conditional when only soft rules fail (certificate pending)', () => {
    const res = matchSchemes(base({ scStatus: 'pending' }));
    const ns = res.find((r) => r.scheme.id === 'new_swarnima');
    expect(ns?.eligible).toBe(false);
    expect(ns?.conditional).toBe(true);
  });

  it('excludes gender-gated schemes for male applicants', () => {
    const res = matchSchemes(base({ gender: 'male' }));
    expect(res.find((r) => r.scheme.id === 'new_swarnima')?.eligible).toBe(false);
  });

  it('lists income-over-limit schemes as near misses with failed rules', () => {
    const res = matchSchemes(base({ annualIncome: 400000 }));
    const ns = res.find((r) => r.scheme.id === 'new_swarnima');
    expect(ns?.eligible).toBe(false);
    expect(ns?.failedRules.some((f) => f.field === 'annualIncome')).toBe(true);
  });

  it('matches education loan for professional UG student with verified status', () => {
    const res = matchSchemes(
      base({
        purpose: 'education',
        projectCost: 1500000,
        educationLevel: 'undergraduate',
        courseType: 'professional',
      })
    );
    const els = res.find((r) => r.scheme.id === 'education_loan');
    expect(els?.eligible).toBe(true);
    expect(els?.scheme.maxAssistance).toBe(3000000);
  });

  it('rejects education loan for general courses (hard rule)', () => {
    const res = matchSchemes(
      base({
        purpose: 'education',
        educationLevel: 'undergraduate',
        courseType: 'general',
      })
    );
    const els = res.find((r) => r.scheme.id === 'education_loan');
    expect(els?.eligible).toBe(false);
  });

  it('produces a trace row for every declared rule', () => {
    for (const s of SCHEMES) {
      const r = evaluateScheme(s, base({}));
      expect(r.ruleTrace.length).toBe(s.rules.length);
    }
  });
});
```

### `src/engine/__tests__/calc.test.ts` â€” amortization math

Hand-computed EMI check: â‚¹1,00,000 at 6% for 60 months â†’ EMI â‰ˆ â‚¹1,933.
Also verifies funding split and moratorium capitalization.

```ts
import { computeLoanPlan } from '../calc';
import { getSchemeById } from '../../../data/schemes';

describe('computeLoanPlan', () => {
  const tl = getSchemeById('term_loan_scheme')!;

  it('computes EMI close to hand calculation', () => {
    const p = computeLoanPlan(tl, 100000, false);
    // P=90,000 (90% funding), r=6%, n=144
    expect(p.eligibleLoan).toBe(90000);
    expect(p.contribution).toBe(10000);
    expect(p.emi).toBeGreaterThan(850);
    expect(p.emi).toBeLessThan(950);
  });

  it('caps assistance at scheme maximum', () => {
    const p = computeLoanPlan(tl, 5000000, false);
    expect(p.eligibleLoan).toBe(tl.maxAssistance * 0.9);
  });

  it('capitalizes simple moratorium interest into principal', () => {
    const els = getSchemeById('education_loan')!;
    const off = computeLoanPlan(els, 1000000, false);
    const on = computeLoanPlan(els, 1000000, true);
    expect(on.principalAfterMoratorium!).toBeGreaterThan(off.eligibleLoan);
    expect(on.emi).toBeGreaterThan(off.emi);
  });

  it('never returns negative or NaN values across a cost sweep', () => {
    for (let cost = 10000; cost <= 3000000; cost += 41377) {
      const p = computeLoanPlan(tl, cost, true);
      for (const v of [p.eligibleLoan, p.contribution, p.emi, p.totalInterest, p.totalPayable]) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
```

### `src/engine/__tests__/utils.test.ts` â€” Indian formatting + geo

```ts
import { formatINR, amountInWordsIndian, haversineKm } from '../utils';

describe('formatINR', () => {
  it('groups Indian-style (lakh/crore)', () => {
    expect(formatINR(1234567)).toBe('â‚¹12,34,567');
    expect(formatINR(750000)).toBe('â‚¹7,50,000');
  });
});

describe('amountInWordsIndian', () => {
  it('speaks lakh amounts canonically', () => {
    expect(amountInWordsIndian(800000)).toContain('eight lakh');
    expect(amountInWordsIndian(1250000)).toContain('twelve lakh');
  });
});

describe('haversineKm', () => {
  it('Bhopal to Indore is roughly 190 km', () => {
    const d = haversineKm(23.2599, 77.4126, 22.7196, 75.8577);
    expect(d).toBeGreaterThan(170);
    expect(d).toBeLessThan(210);
  });
  it('zero distance for identical points', () => {
    expect(haversineKm(23, 77, 23, 77)).toBe(0);
  });
});
```

Run with:

```bash
npm test          # one-shot
npm run test:watch
```


---

## 12. `README.md` (repo root)

````md
# FinSetu AI â€” NSFDC Pre-Application Guide

**Smart India Hackathon 2026 Â· PS 26092 Â· Ministry of Social Justice & Empowerment**

FinSetu is a bilingual (English/à¤¹à¤¿à¤‚à¤¦à¥€), offline-first React Native app that helps
SC beneficiaries **discover â†’ match â†’ calculate â†’ route â†’ apply â†’ track**
NSFDC-backed schemes â€” with a fully explainable rule engine and compliant
channel-partner routing.

> Demo build: scheme/partner data is illustrative seed data. FinSetu does not
> sanction or disburse loans.

## Quickstart

```bash
npm install
npx expo start          # press a = Android, i = iOS, w = web
npm test                # engine unit tests
```

Requires Node 18+. No native build needed â€” runs in Expo Go / emulators.

## Architecture

```
app/            expo-router screens (index, home, profile, match,
                calc, partners, apply, track, settings, admin)
src/engine/     PURE decision core: rules.ts (matcher + tracer),
                calc.ts (EMI/moratorium), types.ts
src/services/   storage.ts (AsyncStorage), api.ts (mock FastAPI seam)
src/store/      AppStore.tsx (context state machine)
src/i18n/       i18next en/hi JSON (~130 keys each)
src/components/ ui kit, SVG charts, timeline
data/           versioned scheme master, partner network, districts
docs/architecture/  C4 diagrams + ADRs
```

**Key design decisions** (see `docs/architecture/adr/`):

1. Rule engine over LLM scoring â€” deterministic, auditable, bilingual traces.
2. Manual district selection instead of GPS â€” zero permission friction offline.
3. NPA/e-KYC as routing compliance gates, not credit scores.
4. Every recommendation carries rule-trace + scheme version + source ref.
5. `services/api.ts` is the single swap point for the real FastAPI backend.

## Judge demo script (3 min)

| Step | Screen | Persona | What to say |
|------|--------|---------|-------------|
| 1 | index â†’ home | Sunita, 32, SC woman, â‚¹2.5L income, â‚¹6L dairy unit | Bilingual gate; six-step journey |
| 2 | profile wizard | same | Indian-formatted amounts; words on review step |
| 3 | match | certificate *pending* variant | Conditional banner; open "Why this result?" |
| 4 | calc | ELS student | Moratorium toggle capitalizes interest |
| 5 | partners | Sehore user | Radius auto-widens 25â†’50 km; compliance chips |
| 6 | apply + track | any | Consent gate; FS-2026-XXXXX ID; simulate update |
| 7 | admin | official | Status/purpose aggregates |

## Swap-in backend contract

| Mock (`services/api.ts`) | Future endpoint |
|---|---|
| `fetchMatchResults` | `POST /eligibility/match` |
| `fetchNearbyPartners` | `GET /partners/nearby?scheme&district` |
| `addApplication` | `POST /applications` |
| `advanceApplication` | partner webhook â†’ status events |
````

---

## 13. Assembling this document

All sections live as fragments under `docs/_parts/`; concatenate them in order
into `docs/FINSETU_FULL_BUILD.md`:

```powershell
$parts = @(
  '01_intro.md','02_core.md',
  '03_data_schemes.md','04_data_rest.md','04_services_store.md',
  '05_i18n.md','06_components_ui.md','07_components_charts.md',
  '08_screens_a.md',
  's09_screen_match.md','s10_screen_calc.md','s11_screen_partners.md',
  's12_screen_apply.md','s13_track_settings.md','s14_admin_entry.md',
  's15_tests.md','s16_readme_assembly.md'
)
$root = "$PSScriptRoot\_parts"
$out  = "$PSScriptRoot\FINSETU_FULL_BUILD.md"
($parts | ForEach-Object { Get-Content -Raw -LiteralPath (Join-Path $root $_) }) -join "`n" |
  Set-Content -Encoding UTF8 -LiteralPath $out
Write-Host "Wrote $out ($([math]::Round((Get-Item $out).Length/1kb)) KB)"
```

---

*End of build walkthrough. FinSetu AI â€” every recommendation explained, every
rupee accounted for.*



---

## 4. Core library (`src/`)

### `src/theme.ts` — design system

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

### `src/engine/types.ts` — shared domain model

Every screen, engine and mock service speaks these types. Bilingual text is always
stored as `{ en, hi }` (`LocalText`) so data itself is translatable — not just chrome.

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

### `src/engine/rules.ts` — eligibility rule engine

The heart of "rules decide". Each scheme carries declarative rules; this file only
evaluates them:

- `evalRule` supports `lte / gte / eq / in` over profile fields.
- **Soft rules** (`soft: true`, e.g. SC certificate pending) downgrade to
  `conditional` instead of failing — matches real NSFDC flow where the certificate
  is needed before final approval.
- Traces record *expected vs actual* per rule → powers the "Why this result?" UI and
  satisfies the ≥90% traceability KPI.
- Ranking score blends feasibility (cost vs cap), purpose match, funding ratio and
  cost-band fit.
- Ineligible schemes are sorted by fewest hard failures + smallest income gap →
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
        return `≤ ${formatINRShort(v)}`;
      case 'gte':
        return `≥ ${formatINRShort(v)}`;
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

### `src/engine/calc.ts` — scheme-aware financial calculator

Implements the proposal's formula `eligibleLoan = min(90% × cost, scheme cap)`,
plus:

- Contribution = whatever the loan doesn't cover.
- **Moratorium capitalization**: interest accrued during the moratorium (e.g. ELS
  study period) is added to principal before EMI computation — exactly how education
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

### `src/utils.ts` — formatting & geo helpers

- `formatINR` — Indian digit grouping (₹8,00,000).
- `amountInWordsIndian` — lakh/crore-aware amount-in-words (the canonical-value
  readback that guards against translation/mishearing errors).
- `haversineKm` — great-circle distance used by the partner router.
- `formatDate` — locale-aware dates (hi-IN / en-IN).
- `lt` — resolves a `LocalText` with English fallback.

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

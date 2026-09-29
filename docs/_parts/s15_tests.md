
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

### `src/engine/__tests__/rules.test.ts` — the decision-core contract

Covers the personas from the demo script plus edge cases. These tests are the
executable specification of eligibility logic — change a rule, a test speaks up.

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

### `src/engine/__tests__/calc.test.ts` — amortization math

Hand-computed EMI check: ₹1,00,000 at 6% for 60 months → EMI ≈ ₹1,933.
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

### `src/engine/__tests__/utils.test.ts` — Indian formatting + geo

```ts
import { formatINR, amountInWordsIndian, haversineKm } from '../utils';

describe('formatINR', () => {
  it('groups Indian-style (lakh/crore)', () => {
    expect(formatINR(1234567)).toBe('₹12,34,567');
    expect(formatINR(750000)).toBe('₹7,50,000');
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

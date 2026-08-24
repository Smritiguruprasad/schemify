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

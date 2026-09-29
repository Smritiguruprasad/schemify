import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(root, 'data/schemes.source.json');
const OUT = resolve(root, 'data/schemes.generated.json');

const source = JSON.parse(readFileSync(SRC, 'utf8'));

const TEXT = (s) => s ?? '';
const lower = (s) => TEXT(s).toLowerCase();

const DOC_RULES = [
  ['shareholding', ['shareholding']],
  ['loan_sanction', ['sanction letter', 'sanctioned by']],
  ['apprenticeship_agreement', ['apprenticeship agreement']],
  ['pmcares_proof', ['pm cares', 'pmcares']],
  ['pan_card', ['pan card', 'pan no', 'pan number']],
  ['domicile', ['domicile']],
  ['achievement_cert', ['achievement certificate']],
  ['fee_receipt', ['fee receipt', 'processing fee receipt']],
  ['quotation', ['quotation', 'quote for']],
  ['employment_proof', ['employment proof']],
  ['shg_membership', ['shg', 'jlg', 'dwcra']],
  ['study_abroad', ['passport', 'foreign university', 'offer letter']],
  ['tbi_recommendation', ['tbi recommendation', 'incubator']],
  ['bank_passbook', ['bank account', 'bank passbook', 'passbook', 'bank statement']],
  ['project_report', ['project report', 'project profile', 'project proposal', 'project detail', 'business plan', 'project ', 'business idea', 'pitch deck', 'dpr']],
  ['aadhaar', ['aadhar', 'aadhaar', 'identity proof', 'identity & address', 'identity and address', 'identity document']],
  ['address_proof', ['address proof']],
  ['income_proof', ['income certificate', 'income tax', 'bpl card', 'bpl certificate', 'income proof']],
  ['caste_certificate', ['caste certificate', 'sc certificate', 'sc/st certificate', 'sc/st', 'community certificate', 'tribe certificate', 'tribal', 'dnt']],
  ['enrollment_proof', ['enrollment proof', 'enrolment proof', 'enrollment', 'enrolment']],
  ['admission_proof', ['admission letter', 'admission proof', 'admission / fee', 'admission']],
  ['marksheet', ['marksheet', 'marks sheet', 'qualifying examination', 'educational certificate', 'educational qualification', 'education proof', 'previous year mark', 'iti admission', 'qualification']],
  ['fee_structure', ['fee structure']],
  ['business_proof', ['incorporation', 'registration certificate', 'udyam registration', 'company registration', 'partnership deed', 'business license', 'business licence', 'recognition certificate', 'ugc affiliation', 'quality improvement', 'proposal for']],
  ['financials', ['audited financial', 'financial statement']],
  ['kyc', ['kyc']],
  ['application_form', ['application form', 'loan application']],
];

function docSlug(text) {
  const t = lower(text);
  for (const [slug, needles] of DOC_RULES) {
    if (needles.some((n) => t.includes(n))) return slug;
  }
  return 'other_doc';
}

const PARTNER_RULES = [
  ['SCA', ['channelizing agency', 'sca', 'district social welfare', 'state social welfare', 'sc/st/ bc', 'scheduled castes and scheduled tribes development']],
  ['NBFC-MFI', ['nbfc-mfi', 'nbfc', 'mfi']],
  ['RRB', ['regional rural bank', 'rrb', 'rural bank']],
  ['SFB', ['small finance bank', 'sfb']],
  ['COOP', ['cooperative', 'co-op', 'cooperative bank']],
  ['PSB', ['public sector bank', 'psb', 'scheduled commercial bank', 'private sector bank', 'bank', 'sidbi', 'nsthub', 'nodal bank', 'lending bank', 'nabard', 'nsic', 'kvic', 'kvib', 'dic', 'ugc', 'nta', 'nsp', 'ministry', 'department', 'district administration', 'tribal council', 'ifci', 'nsfdc', 'nbcfdc', 'nskfdc', 'dgt', 'ministry of tribal']],
];

function partnerTypes(partners) {
  if (!Array.isArray(partners) || partners.length === 0) return [];
  const out = new Set();
  for (const p of partners) {
    const t = lower(p.partner_type);
    for (const [type, needles] of PARTNER_RULES) {
      if (needles.some((n) => t.includes(n))) {
        out.add(type);
        break;
      }
    }
  }
  return out.size ? [...out] : ['PSB'];
}

const EDU_WORDS = ['education', 'scholarship', 'fellowship', 'coaching', 'higher education', 'student', 'school', 'iti', 'matric', 'matriculation', 'class xi', 'university', 'degree', 'quality improvement', 'top class', 'overseas scholarship', 'study', 'studies'];
const SKILL_WORDS = ['skill', 'training', 'vocational', 'apprentice', 'upskilling', 'reskilling', 'employment generation', 'sanitation', 'tribal', 'incubation', 'entrepreneurship development'];
const AGRI_WORDS = ['agriculture', 'agri', 'farm', 'animal husbandry', 'allied agriculture'];
const STRONG_BIZ_WORDS = ['loan', 'credit', 'microfinance', 'micro credit', 'term loan', 'business', 'enterprise', 'self-employment', 'subsidy', 'capital', 'guarantee', 'livelihood', 'reimbursement', 'processing fee'];
const WEAK_BIZ_WORDS = ['entrepreneurship', 'employment', 'women', 'income generation'];

const wordCache = new Map();
function matchesWord(hay, word) {
  let re = wordCache.get(word);
  if (!re) {
    const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    re = new RegExp(`(?<![a-z0-9])${esc}(?![a-z0-9])`, 'i');
    wordCache.set(word, re);
  }
  return re.test(hay);
}

function has(hay, words) {
  return words.some((w) => matchesWord(hay, w));
}

function purposeTags(s) {
  const hay = `${lower(s.category)} ${lower(s.sub_category)} ${lower(s.scheme_name)} ${lower(s.project_purpose?.eligible_purposes?.join(' '))}`;
  const tags = [];
  const edu = has(hay, EDU_WORDS);
  const skill = has(hay, SKILL_WORDS);
  if (edu) tags.push('education');
  if (skill) tags.push('skill');
  if (has(hay, AGRI_WORDS)) tags.push('agriculture');
  if (has(hay, STRONG_BIZ_WORDS) || (!edu && !skill && has(hay, WEAK_BIZ_WORDS))) {
    tags.push('business');
  }
  if (!tags.length) tags.push('business');
  return [...new Set(tags)];
}

function category(s) {
  const tags = purposeTags(s);
  if (tags.includes('education')) return 'education';
  if (tags.includes('skill')) return 'micro';
  return 'enterprise';
}

function interestRate(s) {
  const raw = TEXT(s.financial_parameters?.interest_rate);
  const nums = raw.match(/\d+(?:\.\d+)?/g);
  if (!nums) return 0;
  return Math.min(...nums.map(Number));
}

function maxAssistance(s) {
  const f = s.financial_parameters ?? {};
  const p = s.project_purpose ?? {};
  return f.maximum_loan_amount_inr ?? p.project_cost_max_inr ?? 0;
}

function minCost(s) {
  const f = s.financial_parameters ?? {};
  const p = s.project_purpose ?? {};
  return p.project_cost_min_inr ?? f.minimum_loan_amount_inr ?? 0;
}

function benefit(s) {
  const f = s.financial_parameters ?? {};
  const p = s.project_purpose ?? {};
  if (f.subsidy_amount_inr) return `Up to Rs ${f.subsidy_amount_inr.toLocaleString('en-IN')} capital subsidy`;
  if (f.subsidy_percentage) return `${f.subsidy_percentage}% capital subsidy on project cost`;
  if (s.education_parameters?.living_expense_coverage) return s.education_parameters.living_expense_coverage;
  if (f.interest_rate_type === 'Free Training' || f.interest_rate_type === 'Free Training + Reward') return 'Free training, no cost to beneficiary';
  if (p.project_cost_max_inr) return `Covers projects up to Rs ${p.project_cost_max_inr.toLocaleString('en-IN')}`;
  return 'Assistance as per scheme guidelines';
}

const HI = (en) => ({ en, hi: en });

function rules(s) {
  const e = s.eligibility_rules ?? {};
  const cats = (e.social_category ?? []).map(lower);
  const out = [];

  if (cats.length && !cats.includes('sc')) {
    out.push({
      field: 'scStatus',
      op: 'eq',
      value: 'not_available',
      label: HI(`Not open to SC applicants (${e.social_category.join(', ')} only)`),
    });
  }

  const genders = (e.gender ?? []).map(lower);
  if (genders.length && !genders.includes('male') && !genders.includes('female')) {
    out.push({ field: 'gender', op: 'eq', value: 'other', label: HI(`Gender: ${e.gender.join(', ')}`) });
  } else if (genders.length && !genders.includes('female')) {
    out.push({ field: 'gender', op: 'eq', value: 'male', label: HI(`Gender: ${e.gender.join(', ')}`) });
  } else if (genders.length && !genders.includes('male')) {
    out.push({ field: 'gender', op: 'eq', value: 'female', label: HI('Applicant is a woman') });
  }

  if (typeof e.age_min === 'number') {
    out.push({ field: 'age', op: 'gte', value: e.age_min, label: HI(`Age at least ${e.age_min} years`) });
  }
  if (typeof e.age_max === 'number') {
    out.push({ field: 'age', op: 'lte', value: e.age_max, label: HI(`Age at most ${e.age_max} years`) });
  }
  if (typeof e.family_income_max_inr === 'number') {
    out.push({
      field: 'annualIncome',
      op: 'lte',
      value: e.family_income_max_inr,
      label: HI(`Family income Rs ${e.family_income_max_inr.toLocaleString('en-IN')} or less`),
    });
  }

  return out;
}

function allRules(s) {
  const out = rules(s);
  if (!out.length && category(s) === 'education') {
    out.push({
      field: 'purpose',
      op: 'eq',
      value: 'education',
      soft: true,
      label: HI('Purpose is education / scholarship'),
    });
  }
  return out;
}
const schemes = source.map((s) => {
  const f = s.financial_parameters ?? {};
  const v = s.verification ?? {};
  const docs = s.required_documents ?? [];
  const docDetails = {};
  for (const d of docs) {
    const slug = docSlug(d);
    if (!docDetails[slug]) docDetails[slug] = d;
  }

  return {
    id: lower(s.scheme_id),
    code: s.scheme_id,
    name: { en: s.scheme_name, hi: s.scheme_name },
    officialName: s.official_name ?? s.scheme_name,
    desc: { en: s.description ?? '', hi: s.description ?? '' },
    category: category(s),
    schemeCategoryLabel: s.category,
    subCategory: s.sub_category ?? '',
    ministry: s.implementing_ministry ?? '',
    agency: s.implementing_agency ?? '',
    status: s.scheme_status ?? 'Active',
    purposeTags: purposeTags(s),
    benefit: benefit(s),
    minCost: minCost(s),
    maxAssistance: maxAssistance(s),
    fundingPercent: f.government_funding_percentage ?? f.subsidy_percentage ?? 0,
    interestRate: interestRate(s),
    interestNote: f.interest_rate_conditions ?? f.interest_rate ?? '',
    repaymentMonths: f.repayment_period_months ?? 0,
    moratoriumMonths: f.moratorium_period_months ?? 0,
    contributionPercent: f.beneficiary_contribution_percentage ?? 0,
    collateral: f.collateral_requirement ?? '',
    channelTypes: partnerTypes(s.channel_partners),
    requiredDocs: Object.keys(docDetails),
    docDetails,
    conditions: s.eligibility_rules?.other_conditions ?? [],
    applicationUrl: s.application?.official_application_url ?? '',
    applicationMode: s.application?.application_mode ?? '',
    directApplication: s.application?.direct_application_allowed ?? false,
    educationNote: s.education_parameters?.living_expense_coverage ?? '',
    rules: allRules(s),
    effectiveFrom: v.effective_from ?? '',
    lastVerified: v.last_verified ?? '',
    version: '1.0.0',
    isNew: s.is_new ?? false,
    sourceRef: (s.sources ?? []).join(' | '),
  };
});

const ids = new Set();
for (const s of schemes) {
  if (ids.has(s.id)) throw new Error(`Duplicate scheme id: ${s.id}`);
  ids.add(s.id);
  if (!s.name.en) throw new Error(`Missing name for ${s.id}`);
  if (!s.maxAssistance && !s.educationNote && !s.benefit) throw new Error(`No benefit info for ${s.id}`);
}

writeFileSync(OUT, JSON.stringify(schemes, null, 2) + '\n');

const catCount = schemes.reduce((acc, s) => ({ ...acc, [s.category]: (acc[s.category] ?? 0) + 1 }), {});
const docCount = [...new Set(schemes.flatMap((s) => s.requiredDocs))].sort();
console.log(`Wrote ${schemes.length} schemes -> data/schemes.generated.json`);
console.log('categories:', catCount);
console.log('doc types :', docCount.join(', '));
console.log('no-channel:', schemes.filter((s) => !s.channelTypes.length).map((s) => s.id).join(', ') || 'none');
console.log('no-rules  :', schemes.filter((s) => !s.rules.length).map((s) => s.id).join(', ') || 'none');

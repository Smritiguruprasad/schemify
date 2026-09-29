
---

## 5. Data layer (`data/`)

### `data/schemes.ts` — versioned scheme master (seed)

Five illustrative NSFDC-style schemes. Every scheme carries financial params
(cap, funding %, rate, tenure, moratorium, contribution), `purposeTags` used by
the ranker, `requiredDocs` powering the apply checklist, declarative `rules[]`
evaluated by the engine, and **version + effectiveFrom + sourceRef** — the
traceability story ("every recommendation traces to a rule + source/version").

```ts
import { Rule, Scheme } from '../src/engine/types';

export const SCHEMES: Scheme[] = [
  {
    id: 'new_swarnima',
    code: 'NS-01',
    name: { en: 'New Swarnima Scheme for Women', hi: 'नई स्वर्णिमा योजना (महिलाएँ)' },
    desc: {
      en: 'Concessional term loan for SC women to set up small business ventures.',
      hi: 'छोटे व्यवसाय स्थापित करने हेतु अ.जा. महिलाओं के लिए रियायती ऋण।',
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
      { field: 'gender', op: 'eq', value: 'female', label: { en: 'Applicant is a woman', hi: 'आवेदक महिला हो' } },
      { field: 'age', op: 'gte', value: 18, label: { en: 'Age at least 18 years', hi: 'आयु न्यूनतम 18 वर्ष' } },
      { field: 'age', op: 'lte', value: 55, label: { en: 'Age at most 55 years', hi: 'आयु अधिकतम 55 वर्ष' } },
      {
        field: 'annualIncome',
        op: 'lte',
        value: 300000,
        label: { en: 'Family income ₹3,00,000 or less', hi: 'पारिवारिक आय ₹3,00,000 या कम' },
      },
      {
        field: 'scStatus',
        op: 'eq',
        value: 'verified',
        label: { en: 'Valid SC certificate on record', hi: 'वैध अ.जा. प्रमाणपत्र उपलब्ध' },
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
    name: { en: 'Mahila Samriddhi Yojana', hi: 'महिला समृद्धि योजना' },
    desc: {
      en: 'Micro finance up to ₹40,000 for SC women for tiny enterprise or service activity.',
      hi: 'अ.जा. महिलाओं हेतु लघु उद्यम/सेवा गतिविधि के लिए ₹40,000 तक सूक्ष्म वित्त।',
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
      { field: 'gender', op: 'eq', value: 'female', label: { en: 'Applicant is a woman', hi: 'आवेदक महिला हो' } },
      { field: 'age', op: 'gte', value: 18, label: { en: 'Age at least 18 years', hi: 'आयु न्यूनतम 18 वर्ष' } },
      {
        field: 'annualIncome',
        op: 'lte',
        value: 300000,
        label: { en: 'Family income ₹3,00,000 or less', hi: 'पारिवारिक आय ₹3,00,000 या कम' },
      },
      {
        field: 'scStatus',
        op: 'eq',
        value: 'verified',
        label: { en: 'Valid SC certificate on record', hi: 'वैध अ.जा. प्रमाणपत्र उपलब्ध' },
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
    name: { en: 'Micro Credit Finance', hi: 'सूक्ष्म साख वित्त' },
    desc: {
      en: 'Quick micro loans up to ₹50,000 for tiny business and skill-based self-employment.',
      hi: 'लघु व्यवसाय एवं कौशल-आधारित स्वरोजगार हेतु ₹50,000 तक त्वरित सूक्ष्म ऋण।',
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
      { field: 'age', op: 'gte', value: 18, label: { en: 'Age at least 18 years', hi: 'आयु न्यूनतम 18 वर्ष' } },
      {
        field: 'annualIncome',
        op: 'lte',
        value: 300000,
        label: { en: 'Family income ₹3,00,000 or less', hi: 'पारिवारिक आय ₹3,00,000 या कम' },
      },
      {
        field: 'scStatus',
        op: 'eq',
        value: 'verified',
        label: { en: 'Valid SC certificate on record', hi: 'वैध अ.जा. प्रमाणपत्र उपलब्ध' },
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
    name: { en: 'Term Loan Scheme', hi: 'टर्म ऋण योजना' },
    desc: {
      en: 'Flagship NSFDC term loan for income-generating manufacturing, service and agri-processing units.',
      hi: 'उत्पादन, सेवा एवं कृषि-प्रसंस्करण इकाइयों हेतु प्रमुख एनएसएफडीसी टर्म ऋण।',
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
      { field: 'age', op: 'gte', value: 18, label: { en: 'Age at least 18 years', hi: 'आयु न्यूनतम 18 वर्ष' } },
      { field: 'age', op: 'lte', value: 55, label: { en: 'Age at most 55 years', hi: 'आयु अधिकतम 55 वर्ष' } },
      {
        field: 'annualIncome',
        op: 'lte',
        value: 300000,
        label: { en: 'Family income ₹3,00,000 or less', hi: 'पारिवारिक आय ₹3,00,000 या कम' },
      },
      {
        field: 'scStatus',
        op: 'eq',
        value: 'verified',
        label: { en: 'Valid SC certificate on record', hi: 'वैध अ.जा. प्रमाणपत्र उपलब्ध' },
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
    name: { en: 'Education Loan Scheme', hi: 'शिक्षा ऋण योजना' },
    desc: {
      en: 'Up to ₹30 lakh for SC students in professional courses in India, with study-period moratorium.',
      hi: 'भारत में प्रोफेशनल कोर्स कर रहे अ.जा. छात्रों हेतु ₹30 लाख तक, अध्ययनकाल मॉरेटोरियम सहित।',
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
        label: { en: 'Valid SC certificate on record', hi: 'वैध अ.जा. प्रमाणपत्र उपलब्ध' },
      },
      {
        field: 'purpose',
        op: 'eq',
        value: 'education',
        label: { en: 'Purpose is higher education', hi: 'उद्देश्य उच्च शिक्षा हो' },
      },
      {
        field: 'courseType',
        op: 'in',
        value: ['professional'],
        label: { en: 'Professional course (approved list)', hi: 'प्रोफेशनल कोर्स (अनुमोदित सूची)' },
      },
      {
        field: 'educationLevel',
        op: 'in',
        value: ['undergraduate', 'postgraduate'],
        label: { en: 'Admitted to undergraduate/postgraduate programme', hi: 'स्नातक/स्नातकोत्तर प्रवेश' },
      },
      {
        field: 'annualIncome',
        op: 'lte',
        value: 600000,
        label: { en: 'Family income ₹6,00,000 or less', hi: 'पारिवारिक आय ₹6,00,000 या कम' },
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


### `data/partners.ts` — channel-partner network (seed)

Twelve partners across MP/UP covering all six categories from the proposal
(SCA/PSB/RRB/NBFC-MFI/Coop/SFB). Routing-relevant fields:

- `authorizedSchemes` — the authorization gate
- `npaCompliant` + `kycEnabled` — compliance gates ("NPA as a compliance gate,
  not a credit score")
- `availability` — capacity tie-breaker in ranking
- `lastVerified` — surfaced in UI so stale data is visible

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
    name: 'State Bank of India — Main Branch',
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
    name: 'AU Small Finance Bank — Indore',
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
    name: 'Punjab National Bank — Indore Main',
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
    name: 'Bank of Baroda — Lucknow Hazratganj',
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

### `data/districts.ts` — manual location fallback

22 districts with coordinates across MP/UP. Picking a district replaces GPS
entirely — no permission prompts, works when location is denied, deterministic
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

### `data/constants.ts` — labeled option sets

Single-select option lists (purpose, SC status, gender, education level, course
type) plus document labels — all as `LocalText` so pickers render bilingually
without touching i18n JSON.

```ts
import { CourseType, EducationLevel, LocalText, Purpose, ScStatus } from '../src/engine/types';

export const PURPOSES: { value: Purpose; label: LocalText }[] = [
  { value: 'business', label: { en: 'Start / grow a business', hi: 'व्यवसाय शुरू / बढ़ाना' } },
  { value: 'education', label: { en: 'Higher education', hi: 'उच्च शिक्षा' } },
  { value: 'agriculture', label: { en: 'Farm / allied activity', hi: 'कृषि / संबद्ध गतिविधि' } },
  { value: 'skill', label: { en: 'Skill training', hi: 'कौशल प्रशिक्षण' } },
];

export const SC_STATUSES: { value: ScStatus; label: LocalText }[] = [
  { value: 'verified', label: { en: 'Certificate verified', hi: 'प्रमाणपत्र सत्यापित' } },
  { value: 'pending', label: { en: 'Applied, awaiting certificate', hi: 'आवेदन किया, प्रमाणपत्र प्रतीक्षित' } },
  { value: 'not_available', label: { en: 'Not an SC applicant', hi: 'अनुसूचित जाति आवेदक नहीं' } },
];

export const GENDERS: { value: 'female' | 'male' | 'other'; label: LocalText }[] = [
  { value: 'female', label: { en: 'Female', hi: 'महिला' } },
  { value: 'male', label: { en: 'Male', hi: 'पुरुष' } },
  { value: 'other', label: { en: 'Other', hi: 'अन्य' } },
];

export const EDU_LEVELS: { value: EducationLevel; label: LocalText }[] = [
  { value: 'secondary', label: { en: 'Class 10', hi: 'कक्षा 10' } },
  { value: 'senior_secondary', label: { en: 'Class 12', hi: 'कक्षा 12' } },
  { value: 'undergraduate', label: { en: 'Undergraduate', hi: 'स्नातक' } },
  { value: 'postgraduate', label: { en: 'Postgraduate', hi: 'स्नातकोत्तर' } },
];

export const COURSE_TYPES: { value: CourseType; label: LocalText }[] = [
  { value: 'professional', label: { en: 'Professional (Engg, Medical, Law...)', hi: 'प्रोफेशनल (इंजी., मेडिकल, लॉ...)' } },
  { value: 'general', label: { en: 'General degree', hi: 'सामान्य डिग्री' } },
];

export const DOC_LABELS: Record<string, LocalText> = {
  sc_certificate: { en: 'SC caste certificate', hi: 'अनुसूचित जाति प्रमाणपत्र' },
  income_proof: { en: 'Income proof', hi: 'आय प्रमाण' },
  aadhaar: { en: 'Aadhaar card', hi: 'आधार कार्ड' },
  bank_passbook: { en: 'Bank passbook / cancelled cheque', hi: 'बैंक पासबुक / रद्द चेक' },
  project_report: { en: 'Project / business report', hi: 'परियोजना / व्यावसायिक रिपोर्ट' },
  admission_proof: { en: 'Admission proof', hi: 'प्रवेश प्रमाण' },
  fee_structure: { en: 'Course fee structure', hi: 'पाठ्यक्रम शुल्क संरचना' },
  marksheet: { en: 'Latest marksheet', hi: 'नवीनतम अंकसूची' },
  caste_institute_cert: { en: 'Institute SC status proof', hi: 'संस्थान अ.जा. प्रमाण' },
  quotation: { en: 'Equipment quotation', hi: 'उपकरण उद्धरण' },
};

export function purposeLabel(p: Purpose, lang: 'en' | 'hi'): string {
  return PURPOSES.find((x) => x.value === p)?.label[lang] ?? p;
}

export function docLabel(id: string, lang: 'en' | 'hi'): string {
  return DOC_LABELS[id]?.[lang] ?? id;
}
```

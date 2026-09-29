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
  caste_certificate: { en: 'Caste certificate (SC / ST / OBC / DNT)', hi: 'जाति प्रमाणपत्र (अ.जा. / अ.ज. / अ.ओ.बी. / अ.ज.जा.)' },
  sc_certificate: { en: 'SC caste certificate', hi: 'अनुसूचित जाति प्रमाणपत्र' },
  income_proof: { en: 'Income proof', hi: 'आय प्रमाण' },
  aadhaar: { en: 'Aadhaar card / ID proof', hi: 'आधार कार्ड / पहचान प्रमाण' },
  bank_passbook: { en: 'Bank passbook / account details', hi: 'बैंक पासबुक / खाता विवरण' },
  project_report: { en: 'Project / business report', hi: 'परियोजना / व्यावसायिक रिपोर्ट' },
  admission_proof: { en: 'Admission proof', hi: 'प्रवेश प्रमाण' },
  fee_structure: { en: 'Course fee structure', hi: 'पाठ्यक्रम शुल्क संरचना' },
  marksheet: { en: 'Qualifying examination marksheet', hi: 'अंकसूची' },
  address_proof: { en: 'Address proof', hi: 'पता प्रमाण' },
  pan_card: { en: 'PAN card', hi: 'पैन कार्ड' },
  domicile: { en: 'Domicile certificate', hi: 'अधिवास प्रमाण पत्र' },
  business_proof: { en: 'Business / institution registration', hi: 'व्यवसाय / संस्था पंजीकरण' },
  shareholding: { en: 'Shareholding pattern proof', hi: 'शेयरधारिता प्रमाण' },
  financials: { en: 'Audited financial statements', hi: 'लेखापरीक्षित वित्तीय विवरण' },
  kyc: { en: 'KYC documents', hi: 'केवाईसी दस्तावेज़' },
  shg_membership: { en: 'SHG / JLG / group membership proof', hi: 'स्वयं सहायता समूह सदस्यता प्रमाण' },
  study_abroad: { en: 'Passport / foreign university offer', hi: 'पासपोर्ट / विदेशी विश्वविद्यालय प्रस्ताव' },
  quotation: { en: 'Equipment / machinery quotation', hi: 'उपकरण उद्धरण' },
  loan_sanction: { en: 'Term loan sanction letter', hi: 'ऋण स्वीकृति पत्र' },
  fee_receipt: { en: 'Processing fee receipt', hi: 'प्रसंस्करण शुल्क रसीद' },
  application_form: { en: 'Bank loan application form', hi: 'बैंक ऋण आवेदन पत्र' },
  apprenticeship_agreement: { en: 'Apprenticeship agreement', hi: 'शिक्षुता अनुबंध' },
  employment_proof: { en: 'Employment proof', hi: 'रोज़गार प्रमाण' },
  enrollment_proof: { en: 'Enrollment / admission proof', hi: 'नामांकन / प्रवेश प्रमाण' },
  achievement_cert: { en: 'Achievement certificates', hi: 'उपलब्धि प्रमाणपत्र' },
  pmcares_proof: { en: 'PM CARES beneficiary proof', hi: 'पीएम केयर्स लाभार्थी प्रमाण' },
  tbi_recommendation: { en: 'Incubator (TBI) recommendation', hi: 'इंक्यूबेटर (टीबीआई) सिफारिश' },
  other_doc: { en: 'Other document', hi: 'अन्य दस्तावेज़' },
};

export function purposeLabel(p: Purpose, lang: 'en' | 'hi'): string {
  return PURPOSES.find((x) => x.value === p)?.label[lang] ?? p;
}

export function docLabel(id: string, lang: 'en' | 'hi'): string {
  return DOC_LABELS[id]?.[lang] ?? id;
}

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

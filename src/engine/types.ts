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

  officialName?: string;
  schemeCategoryLabel?: string;
  subCategory?: string;
  ministry?: string;
  agency?: string;
  status?: string;
  benefit?: string;
  interestNote?: string;
  collateral?: string;
  docDetails?: Record<string, string>;
  conditions?: string[];
  applicationUrl?: string;
  applicationMode?: string;
  directApplication?: boolean;
  educationNote?: string;
  lastVerified?: string;
  isNew?: boolean;
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

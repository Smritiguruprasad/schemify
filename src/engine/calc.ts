import { LoanPlan, Scheme } from './types';

export function computeLoanPlan(
  scheme: Scheme,
  projectCost: number,
  moratoriumOn: boolean
): LoanPlan {
  if (scheme.maxAssistance <= 0) {
    return {
      eligibleLoan: 0,
      contribution: 0,
      principal: 0,
      emi: 0,
      totalInterest: 0,
      totalPayable: 0,
      moratoriumApplied: false,
      moratoriumInterest: 0,
      months: 0,
      ratePct: 0,
    };
  }

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
  if (n <= 0) emi = principal;
  else if (r <= 0) emi = Math.ceil(principal / n);
  else {
    const pow = Math.pow(1 + r, n);
    emi = Math.ceil((principal * r * pow) / (pow - 1));
  }

  return {
    eligibleLoan,
    contribution,
    principal,
    emi,
    totalInterest: n > 0 ? emi * n - principal : 0,
    totalPayable: n > 0 ? emi * n : principal,
    moratoriumApplied,
    moratoriumInterest,
    months: n,
    ratePct: scheme.interestRate,
  };
}

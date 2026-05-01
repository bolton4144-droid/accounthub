type EmployerInput = {
  legalName: string;
  tradingName?: string;
  companyNumber?: string;
  payeReference?: string;
  accountsOfficeReference?: string;
  payFrequency: 'weekly' | 'fortnightly' | 'four_weekly' | 'monthly';
};

type StarterChecklistInput = {
  employeeId: string;
  declaration: 'A' | 'B' | 'C';
  hasP45: boolean;
  studentLoanPlan?: string;
  postgraduateLoan?: boolean;
};

type LeaverInput = {
  employeeId: string;
  leavingDate: string;
  finalPayToDate: number;
  finalTaxToDate: number;
  taxCode: string;
};

type P60Input = {
  employeeId: string;
  taxYear: string;
  taxablePay: number;
  taxDeducted: number;
  niContributions: number;
  finalTaxCode: string;
};

type PaymentRecordInput = {
  taxYear: string;
  taxMonth: number;
  payeDue: number;
  employeeNiDue: number;
  employerNiDue: number;
  studentLoanDue?: number;
  pensionDue?: number;
  statutoryRecoveries?: number;
  apprenticeshipLevyDue?: number;
};

export class EmployerService {
  onboardEmployer(input: EmployerInput) {
    return {
      status: 'ready_for_persistence',
      employer: input,
      requiredSecrets: ['FIELD_ENCRYPTION_KEY'],
      nextActions: ['create_business_entity', 'create_employer_payroll_settings', 'seed_chart_of_accounts', 'connect_companies_house_profile']
    };
  }

  createStarterChecklist(input: StarterChecklistInput) {
    const taxCodeBasis = input.hasP45 ? 'use_p45_details' : `starter_declaration_${input.declaration}`;
    return { documentType: 'starter_checklist', status: 'draft', taxCodeBasis, payload: input };
  }

  issueP45(input: LeaverInput) {
    return {
      documentType: 'P45',
      status: 'draft',
      employeeId: input.employeeId,
      leavingDate: input.leavingDate,
      payToDate: input.finalPayToDate,
      taxToDate: input.finalTaxToDate,
      taxCode: input.taxCode,
      workflow: ['mark_employee_leaver', 'finalise_payroll', 'generate_pdf', 'issue_to_employee', 'include_leaver_in_fps']
    };
  }

  issueP60(input: P60Input) {
    return {
      documentType: 'P60',
      status: 'draft',
      employeeId: input.employeeId,
      taxYear: input.taxYear,
      taxablePay: input.taxablePay,
      taxDeducted: input.taxDeducted,
      niContributions: input.niContributions,
      finalTaxCode: input.finalTaxCode,
      issueDeadline: '31 May after tax year end'
    };
  }

  createEmployerPaymentRecord(input: PaymentRecordInput) {
    const totalDue = round(input.payeDue + input.employeeNiDue + input.employerNiDue + (input.studentLoanDue ?? 0) + (input.apprenticeshipLevyDue ?? 0) - (input.statutoryRecoveries ?? 0));
    return {
      documentType: 'employer_payment_record',
      ukEquivalent: 'PAYE monthly employer payment summary / P32-style record',
      requestedAlias: 'P30',
      status: 'draft',
      ...input,
      totalDue
    };
  }
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

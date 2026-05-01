type PayrollPreviewInput = { grossPay: number; taxCode: string; niCategory: string; pensionRate: number };

export class PayrollService {
  previewRun(input: PayrollPreviewInput) {
    const pension = round(input.grossPay * input.pensionRate);
    const taxablePay = Math.max(0, input.grossPay - 1048);
    const paye = round(taxablePay * 0.2);
    const employeeNi = round(Math.max(0, input.grossPay - 1048) * 0.08);
    const employerNi = round(Math.max(0, input.grossPay - 758) * 0.138);
    const netPay = round(input.grossPay - paye - employeeNi - pension);
    return { mode: 'preview_not_statutory_engine', taxCode: input.taxCode, niCategory: input.niCategory, grossPay: input.grossPay, paye, employeeNi, employerNi, pension, netPay, nextStep: 'Replace preview thresholds with versioned HMRC tax-year configuration tables.' };
  }
}

function round(value: number) { return Math.round(value * 100) / 100; }

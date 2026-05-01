type PensionInput = {
  employeeId: string;
  grossPay: number;
  pensionablePay?: number;
  employeeRate: number;
  employerRate: number;
};

type PensionExportRow = {
  employeeId: string;
  employeeContribution: number;
  employerContribution: number;
  pensionablePay: number;
};

export class PensionService {
  calculate(input: PensionInput) {
    const pensionablePay = input.pensionablePay ?? input.grossPay;
    const employeeContribution = round(pensionablePay * input.employeeRate);
    const employerContribution = round(pensionablePay * input.employerRate);
    return { employeeId: input.employeeId, pensionablePay, employeeContribution, employerContribution, totalContribution: round(employeeContribution + employerContribution) };
  }

  exportCsv(rows: PensionExportRow[]) {
    const header = 'employee_id,pensionable_pay,employee_contribution,employer_contribution,total_contribution';
    const lines = rows.map((row) => [row.employeeId, row.pensionablePay, row.employeeContribution, row.employerContribution, round(row.employeeContribution + row.employerContribution)].join(','));
    return { contentType: 'text/csv', filename: 'pension-contributions.csv', body: [header, ...lines].join('\n') };
  }
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

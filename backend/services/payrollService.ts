interface TaxBand {
  threshold: number;
  rate: number;
}

interface NIBand {
  lower: number;
  upper: number | null;
  employeeRate: number;
  employerRate: number;
}

interface PayrollCalculation {
  grossPay: number;
  taxablePay: number;
  tax: number;
  niEmployee: number;
  niEmployer: number;
  studentLoan: number;
  pensionEmployee: number;
  pensionEmployer: number;
  netPay: number;
}

export class PayrollService {
  // 2024/25 Tax bands
  private readonly taxBands: TaxBand[] = [
    { threshold: 12570, rate: 0 },      // Personal allowance
    { threshold: 50270, rate: 0.20 },   // Basic rate
    { threshold: 125140, rate: 0.40 },  // Higher rate
    { threshold: Infinity, rate: 0.45 }, // Additional rate
  ];

  // 2024/25 National Insurance bands (Category A - standard)
  private readonly niBands: NIBand[] = [
    { lower: 0, upper: 12570, employeeRate: 0, employerRate: 0 },          // Below LEL
    { lower: 12570, upper: 50270, employeeRate: 0.08, employerRate: 0.138 }, // Primary threshold to UEL
    { lower: 50270, upper: null, employeeRate: 0.02, employerRate: 0.138 },  // Above UEL
  ];

  // Student loan thresholds 2024/25
  private readonly studentLoanThresholds = {
    plan1: { threshold: 22015, rate: 0.09 },      // Plan 1
    plan2: { threshold: 27295, rate: 0.09 },      // Plan 2
    plan4: { threshold: 27660, rate: 0.09 },      // Plan 4 (Scotland)
    postgrad: { threshold: 21000, rate: 0.06 },   // Postgraduate
  };

  /**
   * Calculate tax based on taxable pay
   */
  calculateTax(taxablePay: number, taxCode: string = '1257L'): number {
    // Extract personal allowance from tax code
    let personalAllowance = 12570; // Default
    
    if (taxCode.endsWith('L')) {
      const codeNumber = parseInt(taxCode.replace('L', ''));
      personalAllowance = codeNumber * 10;
    } else if (taxCode.startsWith('K')) {
      // K code means tax is owed from previous years
      personalAllowance = 0;
    } else if (taxCode === 'BR') {
      // Basic rate - no allowance
      personalAllowance = 0;
    }

    const taxableAmount = Math.max(0, taxablePay - personalAllowance);
    let tax = 0;
    let previousThreshold = 0;

    for (const band of this.taxBands) {
      if (band.threshold === 0) continue;

      const bandAmount = Math.min(
        Math.max(0, taxableAmount - previousThreshold),
        band.threshold - previousThreshold
      );

      tax += bandAmount * band.rate;
      previousThreshold = band.threshold;

      if (taxableAmount <= band.threshold) break;
    }

    return Math.round(tax * 100) / 100;
  }

  /**
   * Calculate National Insurance contributions
   */
  calculateNI(grossPay: number): { employee: number; employer: number } {
    let employeeNI = 0;
    let employerNI = 0;

    for (const band of this.niBands) {
      const lower = band.lower;
      const upper = band.upper || Infinity;

      if (grossPay > lower) {
        const bandEarnings = Math.min(grossPay, upper) - lower;
        employeeNI += bandEarnings * band.employeeRate;
        employerNI += bandEarnings * band.employerRate;
      }
    }

    return {
      employee: Math.round(employeeNI * 100) / 100,
      employer: Math.round(employerNI * 100) / 100,
    };
  }

  /**
   * Calculate student loan deductions
   */
  calculateStudentLoan(
    grossPay: number,
    plan: 'plan1' | 'plan2' | 'plan4' | 'postgrad' | null
  ): number {
    if (!plan) return 0;

    const loanConfig = this.studentLoanThresholds[plan];
    if (!loanConfig) return 0;

    const annualThreshold = loanConfig.threshold;
    const monthlyThreshold = annualThreshold / 12;

    if (grossPay <= monthlyThreshold) return 0;

    const deduction = (grossPay - monthlyThreshold) * loanConfig.rate;
    return Math.round(deduction * 100) / 100;
  }

  /**
   * Calculate pension contributions
   */
  calculatePension(
    grossPay: number,
    employeeRate: number,
    employerRate: number
  ): { employee: number; employer: number } {
    // UK auto-enrolment minimum: 5% employee, 3% employer
    const employee = Math.round(grossPay * (employeeRate / 100) * 100) / 100;
    const employer = Math.round(grossPay * (employerRate / 100) * 100) / 100;

    return { employee, employer };
  }

  /**
   * Main payroll calculation for an employee
   */
  calculatePayslip(
    grossPay: number,
    taxCode: string = '1257L',
    studentLoanPlan: 'plan1' | 'plan2' | 'plan4' | 'postgrad' | null = null,
    pensionEmployeeRate: number = 5,
    pensionEmployerRate: number = 3
  ): PayrollCalculation {
    // Calculate pension (from gross)
    const pension = this.calculatePension(
      grossPay,
      pensionEmployeeRate,
      pensionEmployerRate
    );

    // Taxable pay after pension deduction
    const taxablePay = grossPay - pension.employee;

    // Calculate tax
    const tax = this.calculateTax(taxablePay, taxCode);

    // Calculate NI (on gross pay, not affected by pension)
    const ni = this.calculateNI(grossPay);

    // Calculate student loan
    const studentLoan = this.calculateStudentLoan(grossPay, studentLoanPlan);

    // Calculate net pay
    const netPay =
      grossPay - tax - ni.employee - studentLoan - pension.employee;

    return {
      grossPay: Math.round(grossPay * 100) / 100,
      taxablePay: Math.round(taxablePay * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      niEmployee: ni.employee,
      niEmployer: ni.employer,
      studentLoan,
      pensionEmployee: pension.employee,
      pensionEmployer: pension.employer,
      netPay: Math.round(netPay * 100) / 100,
    };
  }

  /**
   * Calculate year-to-date values
   */
  calculateYTD(
    employeeId: string,
    taxYear: string,
    currentPayslip: PayrollCalculation
  ): {
    ytdGross: number;
    ytdTax: number;
    ytdNI: number;
  } {
    // This would query the database for previous payslips in the tax year
    // For now, returning the current values as placeholder
    return {
      ytdGross: currentPayslip.grossPay,
      ytdTax: currentPayslip.tax,
      ytdNI: currentPayslip.niEmployee,
    };
  }

  /**
   * Generate FPS (Full Payment Submission) data for HMRC
   */
  generateFPSData(payrollRun: any, payslips: any[]): any {
    // This generates the XML format required by HMRC RTI
    return {
      taxYear: payrollRun.tax_year,
      taxMonth: payrollRun.tax_month,
      paymentDate: payrollRun.payment_date,
      employees: payslips.map((slip) => ({
        niNumber: slip.employee_ni_number,
        firstName: slip.employee_first_name,
        lastName: slip.employee_last_name,
        grossPay: slip.gross_pay,
        tax: slip.tax,
        niEmployee: slip.ni_employee,
        niEmployer: slip.ni_employer,
        studentLoan: slip.student_loan,
        pensionContribution: slip.pension_employee,
      })),
      totals: {
        grossPay: payrollRun.total_gross,
        tax: payrollRun.total_tax,
        niEmployee: payrollRun.total_ni_employee,
        niEmployer: payrollRun.total_ni_employer,
      },
    };
  }

  /**
   * Validate tax code format
   */
  validateTaxCode(taxCode: string): boolean {
    const validPatterns = [
      /^\d{1,4}L$/,   // Standard: 1257L
      /^\d{1,4}M$/,   // Marriage allowance
      /^\d{1,4}N$/,   // Marriage allowance
      /^K\d{1,4}$/,   // Negative allowance
      /^BR$/,         // Basic rate
      /^D0$/,         // Higher rate
      /^D1$/,         // Additional rate
      /^NT$/,         // No tax
      /^0T$/,         // No allowance
    ];

    return validPatterns.some((pattern) => pattern.test(taxCode));
  }

  /**
   * Get current tax year
   */
  getCurrentTaxYear(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 0-indexed

    // UK tax year runs from April 6th to April 5th
    if (month < 4 || (month === 4 && now.getDate() < 6)) {
      return `${year - 1}/${year.toString().slice(2)}`;
    }
    return `${year}/${(year + 1).toString().slice(2)}`;
  }

  /**
   * Get tax month (1-12 where month 1 starts April 6th)
   */
  getTaxMonth(date: Date): number {
    const month = date.getMonth() + 1; // 0-indexed
    const day = date.getDate();

    if (month < 4) {
      return month + 9; // Jan = 10, Feb = 11, Mar = 12
    } else if (month === 4) {
      return day < 6 ? 12 : 1;
    } else {
      return month - 3; // Apr (after 5th) = 1, May = 2, etc.
    }
  }
}

export const payrollService = new PayrollService();

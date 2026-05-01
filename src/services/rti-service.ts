type FpsPayload = {
  employer: { officeNumber?: string; payeReference?: string; accountsOfficeReference?: string; taxYear: string };
  employees: Array<{
    employeeId: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    address?: Record<string, unknown>;
    niNumber?: string;
    paymentDate: string;
    taxablePay: number;
    taxDeducted: number;
    employeeNi: number;
    employerNi: number;
    starter?: boolean;
    leaver?: boolean;
  }>;
};

type EpsPayload = {
  employer: { officeNumber?: string; payeReference?: string; accountsOfficeReference?: string; taxYear: string };
  taxMonth: number;
  noPaymentForPeriod?: boolean;
  recoveries?: Record<string, number>;
  employmentAllowanceClaim?: boolean;
  apprenticeshipLevy?: number;
};

export class RtiService {
  validateFps(payload: FpsPayload) {
    const errors: string[] = [];
    this.validateEmployer(payload.employer, errors);
    if (!payload.employees.length) errors.push('FPS must include at least one paid employee unless using EPS no-payment workflow.');

    for (const employee of payload.employees) {
      if (!employee.employeeId) errors.push('Employee payroll ID is required.');
      if (!employee.firstName) errors.push(`Employee ${employee.employeeId}: first name is required.`);
      if (!employee.lastName) errors.push(`Employee ${employee.employeeId}: last name is required.`);
      if (!employee.dateOfBirth) errors.push(`Employee ${employee.employeeId}: date of birth is required.`);
      if (!employee.niNumber && (!employee.address || Object.keys(employee.address).length === 0)) {
        errors.push(`Employee ${employee.employeeId}: address is required when NINO is unknown.`);
      }
      if (!employee.paymentDate) errors.push(`Employee ${employee.employeeId}: payment date is required.`);
    }

    return { submissionType: 'FPS', valid: errors.length === 0, errors, payload };
  }

  validateEps(payload: EpsPayload) {
    const errors: string[] = [];
    this.validateEmployer(payload.employer, errors);
    if (payload.taxMonth < 1 || payload.taxMonth > 12) errors.push('EPS taxMonth must be between 1 and 12.');
    return { submissionType: 'EPS', valid: errors.length === 0, errors, payload };
  }

  private validateEmployer(employer: FpsPayload['employer'], errors: string[]) {
    if (!employer.officeNumber) errors.push('Employer HMRC office number is required.');
    if (!employer.payeReference) errors.push('Employer PAYE reference is required.');
    if (!employer.accountsOfficeReference) errors.push('Accounts Office reference is required.');
    if (!employer.taxYear) errors.push('Tax year is required.');
  }
}

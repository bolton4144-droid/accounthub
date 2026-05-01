export type TaxYearConfig = {
  taxYear: string;
  paye: {
    personalAllowance: number;
    basicRateLimit: number;
    higherRateLimit: number;
    basicRate: number;
    higherRate: number;
    additionalRate: number;
  };
  class1NiEmployee: {
    primaryThresholdMonthly: number;
    upperEarningsLimitMonthly: number;
    mainRate: number;
    additionalRate: number;
  };
  class1NiEmployer: {
    secondaryThresholdMonthly: number;
    rate: number;
  };
  autoEnrolment: {
    qualifyingEarningsLowerAnnual: number;
    qualifyingEarningsUpperAnnual: number;
    defaultEmployeeRate: number;
    defaultEmployerRate: number;
  };
};

const configs: Record<string, TaxYearConfig> = {
  '2026-27': {
    taxYear: '2026-27',
    paye: {
      personalAllowance: 12570,
      basicRateLimit: 37700,
      higherRateLimit: 125140,
      basicRate: 0.2,
      higherRate: 0.4,
      additionalRate: 0.45
    },
    class1NiEmployee: {
      primaryThresholdMonthly: 1048,
      upperEarningsLimitMonthly: 4189,
      mainRate: 0.08,
      additionalRate: 0.02
    },
    class1NiEmployer: {
      secondaryThresholdMonthly: 758,
      rate: 0.138
    },
    autoEnrolment: {
      qualifyingEarningsLowerAnnual: 6240,
      qualifyingEarningsUpperAnnual: 50270,
      defaultEmployeeRate: 0.05,
      defaultEmployerRate: 0.03
    }
  }
};

export class TaxYearService {
  getConfig(taxYear: string) {
    const config = configs[taxYear];
    if (!config) {
      return {
        status: 'missing_tax_year_config',
        taxYear,
        action: 'Add HMRC tax-year thresholds and statutory fixture pack before processing payroll.'
      };
    }
    return { status: 'ready', config };
  }

  listConfigs() {
    return Object.values(configs);
  }
}

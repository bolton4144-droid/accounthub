type FixtureCase = {
  id: string;
  taxYear: string;
  description: string;
  input: Record<string, unknown>;
  expected: Record<string, unknown>;
};

const fixtures: FixtureCase[] = [
  {
    id: 'monthly-basic-rate-ni-a-001',
    taxYear: '2026-27',
    description: 'Monthly employee on NI category A within basic-rate PAYE band.',
    input: { grossPay: 3000, taxCode: '1257L', niCategory: 'A', payFrequency: 'monthly' },
    expected: { requiresManualVerification: true, notes: 'Used as a regression fixture shell until HMRC-recognised examples are loaded.' }
  },
  {
    id: 'monthly-upper-ni-a-002',
    taxYear: '2026-27',
    description: 'Monthly employee above NI upper earnings limit.',
    input: { grossPay: 6000, taxCode: '1257L', niCategory: 'A', payFrequency: 'monthly' },
    expected: { requiresManualVerification: true, notes: 'Populate exact expected PAYE/NIC values from approved statutory test pack.' }
  }
];

export class StatutoryFixtureService {
  list(taxYear?: string) {
    return taxYear ? fixtures.filter((fixture) => fixture.taxYear === taxYear) : fixtures;
  }

  certificationReadiness() {
    return {
      status: 'fixture_harness_ready',
      requiredBeforeCertification: [
        'Load HMRC-recognised PAYE and NIC example cases',
        'Add student loan, postgraduate loan and director NIC fixtures',
        'Add statutory maternity, paternity, adoption, neonatal care and sick pay fixtures',
        'Run every tax-year fixture in CI before RTI submission is enabled'
      ],
      fixtureCount: fixtures.length
    };
  }
}

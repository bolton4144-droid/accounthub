type DocumentInput = {
  documentType: 'payslip' | 'P45' | 'P60' | 'starter_checklist' | 'employer_payment_record' | 'profit_and_loss' | 'balance_sheet' | 'trial_balance';
  entityId: string;
  employeeId?: string;
  taxYear?: string;
  payload: Record<string, unknown>;
};

export class DocumentService {
  createRecord(input: DocumentInput) {
    return {
      status: 'ready_for_pdf_render',
      storagePolicy: 'encrypted_object_storage_with_short_lived_signed_urls',
      auditAction: `document.${input.documentType}.created`,
      record: input
    };
  }

  templates() {
    return [
      { key: 'payslip-modern', name: 'Modern payslip', output: 'pdf' },
      { key: 'p45-standard', name: 'P45 leaver pack', output: 'pdf' },
      { key: 'p60-year-end', name: 'P60 year-end certificate', output: 'pdf' },
      { key: 'starter-checklist', name: 'Starter checklist capture', output: 'pdf' },
      { key: 'management-pack', name: 'P&L and balance sheet pack', output: 'pdf' }
    ];
  }
}

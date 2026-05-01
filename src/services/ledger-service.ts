type JournalLineDraft = {
  accountCode: string;
  debit: number;
  credit: number;
  taxCode?: string;
  narrative?: string;
};

type JournalDraft = {
  entityId?: string;
  date?: string;
  reference?: string;
  description: string;
  createdBy?: string;
  lines: JournalLineDraft[];
};

type AccountBalance = {
  accountType: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  debit: number;
  credit: number;
};

export class LedgerService {
  validateBalancedJournal(journal: JournalDraft) {
    const errors: string[] = [];
    if (!journal.description) errors.push('Journal description is required.');
    if (journal.lines.length < 2) errors.push('A journal must contain at least two lines.');

    for (const [index, line] of journal.lines.entries()) {
      if (!line.accountCode) errors.push(`Line ${index + 1}: account code is required.`);
      if (line.debit < 0 || line.credit < 0) errors.push(`Line ${index + 1}: debit and credit cannot be negative.`);
      if (line.debit > 0 && line.credit > 0) errors.push(`Line ${index + 1}: use either debit or credit, not both.`);
      if (line.debit === 0 && line.credit === 0) errors.push(`Line ${index + 1}: debit or credit amount is required.`);
    }

    const debitTotal = round(journal.lines.reduce((sum, line) => sum + line.debit, 0));
    const creditTotal = round(journal.lines.reduce((sum, line) => sum + line.credit, 0));
    const difference = round(debitTotal - creditTotal);
    if (difference !== 0) errors.push('Total debits must equal total credits before posting.');

    return {
      valid: errors.length === 0,
      debitTotal,
      creditTotal,
      difference,
      errors,
      postingPolicy: errors.length === 0 ? 'postable' : 'blocked_until_valid_and_balanced'
    };
  }

  prepareManualJournal(journal: JournalDraft) {
    const validation = this.validateBalancedJournal(journal);
    return {
      ...validation,
      journalHeader: {
        entityId: journal.entityId,
        date: journal.date,
        reference: journal.reference,
        description: journal.description,
        createdBy: journal.createdBy
      },
      journalLines: journal.lines
    };
  }

  verifyAccountingEquation(accounts: AccountBalance[]) {
    const assets = round(accounts.filter((a) => a.accountType === 'asset').reduce((sum, a) => sum + a.debit - a.credit, 0));
    const liabilities = round(accounts.filter((a) => a.accountType === 'liability').reduce((sum, a) => sum + a.credit - a.debit, 0));
    const equity = round(accounts.filter((a) => a.accountType === 'equity').reduce((sum, a) => sum + a.credit - a.debit, 0));
    const income = round(accounts.filter((a) => a.accountType === 'income').reduce((sum, a) => sum + a.credit - a.debit, 0));
    const expenses = round(accounts.filter((a) => a.accountType === 'expense').reduce((sum, a) => sum + a.debit - a.credit, 0));
    const retainedEarningsMovement = round(income - expenses);
    const rightSide = round(liabilities + equity + retainedEarningsMovement);
    return { assets, liabilities, equity, income, expenses, retainedEarningsMovement, rightSide, balanced: assets === rightSide, difference: round(assets - rightSide) };
  }
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

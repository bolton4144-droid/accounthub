type JournalDraft = { description: string; lines: Array<{ accountCode: string; debit: number; credit: number }> };

export class LedgerService {
  validateBalancedJournal(journal: JournalDraft) {
    const debitTotal = journal.lines.reduce((sum, line) => sum + line.debit, 0);
    const creditTotal = journal.lines.reduce((sum, line) => sum + line.credit, 0);
    const difference = Number((debitTotal - creditTotal).toFixed(2));
    return { valid: difference === 0, debitTotal, creditTotal, difference, postingPolicy: difference === 0 ? 'postable' : 'blocked_until_balanced' };
  }
}

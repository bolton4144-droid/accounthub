type CashBookTransaction = {
  transactionDate: string;
  description: string;
  amount: number;
  direction: 'money_in' | 'money_out';
  categoryCode: string;
  bankAccountCode?: string;
  vatCode?: string;
};

const defaultBankCode = '1200';

export class BookkeepingService {
  ukLimitedCompanyChartTemplate() {
    return [
      ['1000', 'Sales', 'income', 'profit_and_loss'],
      ['1200', 'Bank current account', 'asset', 'balance_sheet'],
      ['2000', 'Purchases', 'expense', 'profit_and_loss'],
      ['2100', 'General expenses', 'expense', 'profit_and_loss'],
      ['2200', 'Wages and salaries', 'expense', 'profit_and_loss'],
      ['2210', 'Employer NI', 'expense', 'profit_and_loss'],
      ['3000', 'Trade debtors', 'asset', 'balance_sheet'],
      ['4000', 'Trade creditors', 'liability', 'balance_sheet'],
      ['5000', 'VAT control', 'liability', 'balance_sheet'],
      ['5100', 'PAYE and NI control', 'liability', 'balance_sheet'],
      ['7000', 'Share capital', 'equity', 'balance_sheet'],
      ['7100', 'Retained earnings', 'equity', 'balance_sheet']
    ].map(([code, name, accountType, reportSection]) => ({ code, name, accountType, reportSection }));
  }

  classifyTransaction(input: CashBookTransaction) {
    const bankAccountCode = input.bankAccountCode ?? defaultBankCode;
    const bankLine = input.direction === 'money_in'
      ? { accountCode: bankAccountCode, debit: input.amount, credit: 0 }
      : { accountCode: bankAccountCode, debit: 0, credit: input.amount };
    const categoryLine = input.direction === 'money_in'
      ? { accountCode: input.categoryCode, debit: 0, credit: input.amount }
      : { accountCode: input.categoryCode, debit: input.amount, credit: 0 };

    return {
      source: 'cashbook_transaction',
      description: input.description,
      accountingDate: input.transactionDate,
      vatCode: input.vatCode ?? 'NO_VAT',
      journal: { lines: [bankLine, categoryLine] }
    };
  }
}

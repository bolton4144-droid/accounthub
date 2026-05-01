type CashBookTransaction = {
  transactionDate: string;
  description: string;
  amount: number;
  direction: 'money_in' | 'money_out';
  categoryCode: string;
  bankAccountCode?: string;
  vatCode?: string;
};

type SalesInvoiceInput = { invoiceNumber: string; netAmount: number; vatAmount: number; debtorAccount?: string; salesAccount?: string; vatAccount?: string };
type PurchaseBillInput = { billNumber: string; netAmount: number; vatAmount: number; creditorAccount?: string; expenseAccount: string; vatAccount?: string };
type PayrollJournalInput = { grossWages: number; employerNi: number; employeePaye: number; employeeNi: number; employeePension: number; employerPension: number; netPay: number };

const defaultBankCode = '1200';

export class BookkeepingService {
  ukLimitedCompanyChartTemplate() {
    return [
      ['1000', 'Sales / Turnover', 'income', 'profit_and_loss', 'income.sales'],
      ['1010', 'Other Income', 'income', 'profit_and_loss', 'income.other'],
      ['2000', 'Direct Costs / Cost of Sales', 'expense', 'profit_and_loss', 'expenses.direct_costs'],
      ['2100', 'Materials', 'expense', 'profit_and_loss', 'expenses.direct_costs'],
      ['2110', 'Subcontractor Labour', 'expense', 'profit_and_loss', 'expenses.direct_costs'],
      ['2200', 'Administrative Expenses', 'expense', 'profit_and_loss', 'expenses.administrative'],
      ['2210', 'Rent and Rates', 'expense', 'profit_and_loss', 'expenses.administrative'],
      ['2220', 'Insurance', 'expense', 'profit_and_loss', 'expenses.administrative'],
      ['2230', 'Utilities', 'expense', 'profit_and_loss', 'expenses.administrative'],
      ['2240', 'Stationery and Office Costs', 'expense', 'profit_and_loss', 'expenses.administrative'],
      ['2300', 'Wages and Salaries', 'expense', 'profit_and_loss', 'expenses.staff'],
      ['2310', 'Employer National Insurance', 'expense', 'profit_and_loss', 'expenses.staff'],
      ['2320', 'Employer Pension Contributions', 'expense', 'profit_and_loss', 'expenses.staff'],
      ['2400', 'Advertising and Marketing', 'expense', 'profit_and_loss', 'expenses.marketing'],
      ['2410', 'Entertainment - Disallowable', 'expense', 'profit_and_loss', 'expenses.marketing'],
      ['2420', 'Travel and Subsistence', 'expense', 'profit_and_loss', 'expenses.marketing'],
      ['2500', 'Bank Fees', 'expense', 'profit_and_loss', 'expenses.financial'],
      ['2510', 'Loan Interest', 'expense', 'profit_and_loss', 'expenses.financial'],
      ['2520', 'Depreciation', 'expense', 'profit_and_loss', 'expenses.financial'],
      ['3000', 'Tangible Fixed Assets', 'asset', 'balance_sheet', 'fixed_assets.tangible'],
      ['3010', 'Intangible Fixed Assets', 'asset', 'balance_sheet', 'fixed_assets.intangible'],
      ['3090', 'Accumulated Depreciation', 'asset', 'balance_sheet', 'fixed_assets.accumulated_depreciation'],
      ['3200', 'Inventory / Stock', 'asset', 'balance_sheet', 'current_assets.inventory'],
      ['3300', 'Trade Debtors', 'asset', 'balance_sheet', 'current_assets.trade_debtors'],
      ['3400', 'Prepayments', 'asset', 'balance_sheet', 'current_assets.prepayments'],
      ['3500', 'Other Receivables', 'asset', 'balance_sheet', 'current_assets.other_receivables'],
      ['1200', 'Cash at Bank', 'asset', 'balance_sheet', 'current_assets.cash_at_bank'],
      ['4000', 'Trade Creditors', 'liability', 'balance_sheet', 'current_liabilities.trade_creditors'],
      ['4100', 'VAT Liability', 'liability', 'balance_sheet', 'current_liabilities.taxation'],
      ['4110', 'Corporation Tax Liability', 'liability', 'balance_sheet', 'current_liabilities.taxation'],
      ['4200', 'PAYE / Payroll Taxes', 'liability', 'balance_sheet', 'current_liabilities.payroll_taxes'],
      ['4300', 'Accruals', 'liability', 'balance_sheet', 'current_liabilities.accruals'],
      ['4400', 'Short Term Loans', 'liability', 'balance_sheet', 'current_liabilities.short_term_loans'],
      ['5000', 'Long Term Loans', 'liability', 'balance_sheet', 'long_term_liabilities.loans'],
      ['5010', 'Mortgages', 'liability', 'balance_sheet', 'long_term_liabilities.loans'],
      ['5020', 'Director Loan Account', 'liability', 'balance_sheet', 'long_term_liabilities.director_loans'],
      ['5100', 'Provisions for Liabilities', 'liability', 'balance_sheet', 'long_term_liabilities.provisions'],
      ['7000', 'Called Up Share Capital', 'equity', 'balance_sheet', 'capital_and_reserves.share_capital'],
      ['7100', 'Profit and Loss Account / Retained Earnings', 'equity', 'balance_sheet', 'capital_and_reserves.profit_and_loss']
    ].map(([code, name, accountType, reportSection, category]) => ({ code, name, accountType, reportSection, category }));
  }

  classifyTransaction(input: CashBookTransaction) {
    const bankAccountCode = input.bankAccountCode ?? defaultBankCode;
    const bankLine = input.direction === 'money_in' ? { accountCode: bankAccountCode, debit: input.amount, credit: 0 } : { accountCode: bankAccountCode, debit: 0, credit: input.amount };
    const categoryLine = input.direction === 'money_in' ? { accountCode: input.categoryCode, debit: 0, credit: input.amount } : { accountCode: input.categoryCode, debit: input.amount, credit: 0 };
    return { source: 'cashbook_transaction', description: input.description, accountingDate: input.transactionDate, vatCode: input.vatCode ?? 'NO_VAT', journal: { lines: [bankLine, categoryLine] } };
  }

  postSalesInvoice(input: SalesInvoiceInput) {
    return {
      source: 'sales_invoice',
      reference: input.invoiceNumber,
      description: `Sales invoice ${input.invoiceNumber}`,
      journal: {
        lines: [
          { accountCode: input.debtorAccount ?? '3300', debit: round(input.netAmount + input.vatAmount), credit: 0, narrative: 'Trade debtor' },
          { accountCode: input.salesAccount ?? '1000', debit: 0, credit: input.netAmount, narrative: 'Sales income' },
          { accountCode: input.vatAccount ?? '4100', debit: 0, credit: input.vatAmount, narrative: 'Output VAT' }
        ]
      }
    };
  }

  postPurchaseBill(input: PurchaseBillInput) {
    return {
      source: 'purchase_bill',
      reference: input.billNumber,
      description: `Purchase bill ${input.billNumber}`,
      journal: {
        lines: [
          { accountCode: input.expenseAccount, debit: input.netAmount, credit: 0, narrative: 'Purchase expense' },
          { accountCode: input.vatAccount ?? '4100', debit: input.vatAmount, credit: 0, narrative: 'Input VAT' },
          { accountCode: input.creditorAccount ?? '4000', debit: 0, credit: round(input.netAmount + input.vatAmount), narrative: 'Trade creditor' }
        ]
      }
    };
  }

  postPayrollJournal(input: PayrollJournalInput) {
    return {
      source: 'payroll_run',
      description: 'Payroll posting journal',
      journal: {
        lines: [
          { accountCode: '2300', debit: input.grossWages, credit: 0, narrative: 'Gross wages' },
          { accountCode: '2310', debit: input.employerNi, credit: 0, narrative: 'Employer NI' },
          { accountCode: '2320', debit: input.employerPension, credit: 0, narrative: 'Employer pension' },
          { accountCode: '4200', debit: 0, credit: round(input.employeePaye + input.employeeNi + input.employerNi), narrative: 'PAYE and NI payable' },
          { accountCode: '4000', debit: 0, credit: round(input.employeePension + input.employerPension), narrative: 'Pension payable' },
          { accountCode: '4000', debit: 0, credit: input.netPay, narrative: 'Net wages payable' }
        ]
      }
    };
  }
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

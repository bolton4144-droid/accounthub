type AccountBalance = {
  code: string;
  name: string;
  accountType: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  debit: number;
  credit: number;
  reportSection?: string;
};

export class ReportingService {
  trialBalance(accounts: AccountBalance[]) {
    const rows = accounts.map((account) => ({ ...account, balance: round(account.debit - account.credit) }));
    const debitTotal = round(accounts.reduce((sum, account) => sum + account.debit, 0));
    const creditTotal = round(accounts.reduce((sum, account) => sum + account.credit, 0));
    return { rows, debitTotal, creditTotal, balanced: debitTotal === creditTotal };
  }

  profitAndLoss(accounts: AccountBalance[]) {
    const income = accounts.filter((a) => a.accountType === 'income').map((a) => ({ ...a, amount: round(a.credit - a.debit) }));
    const expenses = accounts.filter((a) => a.accountType === 'expense').map((a) => ({ ...a, amount: round(a.debit - a.credit) }));
    const totalIncome = round(income.reduce((sum, a) => sum + a.amount, 0));
    const totalExpenses = round(expenses.reduce((sum, a) => sum + a.amount, 0));
    return { income, expenses, totalIncome, totalExpenses, netProfit: round(totalIncome - totalExpenses) };
  }

  balanceSheet(accounts: AccountBalance[]) {
    const structured = this.structuredBalanceSheet(accounts);
    return {
      assets: [...structured.fixedAssets.lines, ...structured.currentAssets.lines],
      liabilities: [...structured.currentLiabilities.lines, ...structured.longTermLiabilities.lines],
      equity: structured.capitalAndReserves.lines,
      totalAssets: round(structured.fixedAssets.total + structured.currentAssets.total),
      totalLiabilities: round(structured.currentLiabilities.total + structured.longTermLiabilities.total),
      totalEquity: structured.capitalAndReserves.total,
      balanced: structured.balanceCheck.balanced,
      structured
    };
  }

  structuredBalanceSheet(accounts: AccountBalance[]) {
    const fixedAssets = this.section(accounts, 'fixed_assets', 'asset');
    const currentAssets = this.section(accounts, 'current_assets', 'asset');
    const currentLiabilities = this.section(accounts, 'current_liabilities', 'liability');
    const longTermLiabilities = this.section(accounts, 'long_term_liabilities', 'liability');
    const capitalAndReserves = this.section(accounts, 'capital_and_reserves', 'equity');
    const netCurrentAssets = round(currentAssets.total - currentLiabilities.total);
    const netAssets = round(fixedAssets.total + netCurrentAssets - longTermLiabilities.total);
    const capitalTotal = capitalAndReserves.total;

    return {
      fixedAssets,
      currentAssets,
      currentLiabilities,
      netCurrentAssets,
      longTermLiabilities,
      netAssets,
      capitalAndReserves,
      balanceCheck: {
        balanced: netAssets === capitalTotal,
        netAssets,
        capitalAndReserves: capitalTotal,
        difference: round(netAssets - capitalTotal)
      }
    };
  }

  private section(accounts: AccountBalance[], prefix: string, accountType: AccountBalance['accountType']) {
    const lines = accounts
      .filter((account) => account.accountType === accountType && (account.reportSection ?? '').startsWith(prefix))
      .map((account) => ({ ...account, amount: this.normalBalance(account) }));
    return { section: prefix, lines, total: round(lines.reduce((sum, line) => sum + line.amount, 0)) };
  }

  private normalBalance(account: AccountBalance) {
    if (account.accountType === 'asset' || account.accountType === 'expense') return round(account.debit - account.credit);
    return round(account.credit - account.debit);
  }
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

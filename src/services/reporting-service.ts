type AccountBalance = {
  code: string;
  name: string;
  accountType: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  debit: number;
  credit: number;
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
    const assets = accounts.filter((a) => a.accountType === 'asset').map((a) => ({ ...a, amount: round(a.debit - a.credit) }));
    const liabilities = accounts.filter((a) => a.accountType === 'liability').map((a) => ({ ...a, amount: round(a.credit - a.debit) }));
    const equity = accounts.filter((a) => a.accountType === 'equity').map((a) => ({ ...a, amount: round(a.credit - a.debit) }));
    const totalAssets = round(assets.reduce((sum, a) => sum + a.amount, 0));
    const totalLiabilities = round(liabilities.reduce((sum, a) => sum + a.amount, 0));
    const totalEquity = round(equity.reduce((sum, a) => sum + a.amount, 0));
    return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity, balanced: totalAssets === round(totalLiabilities + totalEquity) };
  }
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

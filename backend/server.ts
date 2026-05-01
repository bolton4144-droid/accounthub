import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';

import authRoutes from './routes/auth';
import companyRoutes from './routes/company';
import payrollRoutes from './routes/payroll';
import hmrcRoutes from './routes/hmrc';
import accountsRoutes from './routes/accounts';
import dashboardRoutes from './routes/dashboard';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const round = (value: number) => Math.round(value * 100) / 100;

const chartOfAccounts = [
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

function validateJournal(body: any) {
  const lines = Array.isArray(body.lines) ? body.lines : [];
  const errors: string[] = [];
  if (!body.description) errors.push('Journal description is required.');
  if (lines.length < 2) errors.push('A journal must contain at least two lines.');
  lines.forEach((line: any, index: number) => {
    if (!line.accountCode) errors.push(`Line ${index + 1}: account code is required.`);
    if ((line.debit ?? 0) < 0 || (line.credit ?? 0) < 0) errors.push(`Line ${index + 1}: debit and credit cannot be negative.`);
    if ((line.debit ?? 0) > 0 && (line.credit ?? 0) > 0) errors.push(`Line ${index + 1}: use either debit or credit, not both.`);
    if ((line.debit ?? 0) === 0 && (line.credit ?? 0) === 0) errors.push(`Line ${index + 1}: debit or credit amount is required.`);
  });
  const debitTotal = round(lines.reduce((sum: number, line: any) => sum + Number(line.debit ?? 0), 0));
  const creditTotal = round(lines.reduce((sum: number, line: any) => sum + Number(line.credit ?? 0), 0));
  const difference = round(debitTotal - creditTotal);
  if (difference !== 0) errors.push('Total debits must equal total credits before posting.');
  return { valid: errors.length === 0, debitTotal, creditTotal, difference, errors, postingPolicy: errors.length === 0 ? 'postable' : 'blocked_until_valid_and_balanced' };
}

function normalBalance(account: any) {
  return account.accountType === 'asset' || account.accountType === 'expense'
    ? round(Number(account.debit ?? 0) - Number(account.credit ?? 0))
    : round(Number(account.credit ?? 0) - Number(account.debit ?? 0));
}

function section(accounts: any[], prefix: string, accountType: string) {
  const lines = accounts
    .filter((account) => account.accountType === accountType && String(account.reportSection ?? '').startsWith(prefix))
    .map((account) => ({ ...account, amount: normalBalance(account) }));
  return { section: prefix, lines, total: round(lines.reduce((sum, line) => sum + line.amount, 0)) };
}

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: 'accounthub-api',
    modules: ['journal-first-ledger', 'standard-coa', 'manual-journals', 'sales-subledger', 'purchase-subledger', 'bank-feeds', 'bank-reconciliation', 'ocr', 'mtd-vat', 'tenant-isolation', 'payroll-posting', 'reports', 'documents', 'audit']
  });
});

app.get('/api/bookkeeping/chart-template/uk-limited-company', (_req: Request, res: Response) => res.json(chartOfAccounts));
app.post('/api/ledger/journals/validate', (req: Request, res: Response) => res.json(validateJournal(req.body)));
app.post('/api/ledger/journals/manual/prepare', (req: Request, res: Response) => res.json({ ...validateJournal(req.body), journalHeader: { entityId: req.body.entityId, date: req.body.date, reference: req.body.reference, description: req.body.description, createdBy: req.body.createdBy }, journalLines: req.body.lines ?? [] }));
app.post('/api/ledger/equation/verify', (req: Request, res: Response) => {
  const accounts = Array.isArray(req.body.accounts) ? req.body.accounts : [];
  const assets = round(accounts.filter((a: any) => a.accountType === 'asset').reduce((s: number, a: any) => s + Number(a.debit ?? 0) - Number(a.credit ?? 0), 0));
  const liabilities = round(accounts.filter((a: any) => a.accountType === 'liability').reduce((s: number, a: any) => s + Number(a.credit ?? 0) - Number(a.debit ?? 0), 0));
  const equity = round(accounts.filter((a: any) => a.accountType === 'equity').reduce((s: number, a: any) => s + Number(a.credit ?? 0) - Number(a.debit ?? 0), 0));
  const income = round(accounts.filter((a: any) => a.accountType === 'income').reduce((s: number, a: any) => s + Number(a.credit ?? 0) - Number(a.debit ?? 0), 0));
  const expenses = round(accounts.filter((a: any) => a.accountType === 'expense').reduce((s: number, a: any) => s + Number(a.debit ?? 0) - Number(a.credit ?? 0), 0));
  const retainedEarningsMovement = round(income - expenses);
  const rightSide = round(liabilities + equity + retainedEarningsMovement);
  res.json({ assets, liabilities, equity, income, expenses, retainedEarningsMovement, rightSide, balanced: assets === rightSide, difference: round(assets - rightSide) });
});

app.post('/api/subledgers/sales-invoices/posting-preview', (req: Request, res: Response) => {
  const net = Number(req.body.netAmount ?? 0); const vat = Number(req.body.vatAmount ?? 0);
  res.json({ source: 'sales_invoice', reference: req.body.invoiceNumber, description: `Sales invoice ${req.body.invoiceNumber}`, journal: { lines: [{ accountCode: req.body.debtorAccount ?? '3300', debit: round(net + vat), credit: 0, narrative: 'Trade debtor' }, { accountCode: req.body.salesAccount ?? '1000', debit: 0, credit: net, narrative: 'Sales income' }, { accountCode: req.body.vatAccount ?? '4100', debit: 0, credit: vat, narrative: 'Output VAT' }] } });
});
app.post('/api/subledgers/purchase-bills/posting-preview', (req: Request, res: Response) => {
  const net = Number(req.body.netAmount ?? 0); const vat = Number(req.body.vatAmount ?? 0);
  res.json({ source: 'purchase_bill', reference: req.body.billNumber, description: `Purchase bill ${req.body.billNumber}`, journal: { lines: [{ accountCode: req.body.expenseAccount, debit: net, credit: 0, narrative: 'Purchase expense' }, { accountCode: req.body.vatAccount ?? '4100', debit: vat, credit: 0, narrative: 'Input VAT' }, { accountCode: req.body.creditorAccount ?? '4000', debit: 0, credit: round(net + vat), narrative: 'Trade creditor' }] } });
});
app.post('/api/subledgers/payroll/posting-preview', (req: Request, res: Response) => {
  const b = req.body;
  res.json({ source: 'payroll_run', description: 'Payroll posting journal', journal: { lines: [{ accountCode: '2300', debit: Number(b.grossWages ?? 0), credit: 0, narrative: 'Gross wages' }, { accountCode: '2310', debit: Number(b.employerNi ?? 0), credit: 0, narrative: 'Employer NI' }, { accountCode: '2320', debit: Number(b.employerPension ?? 0), credit: 0, narrative: 'Employer pension' }, { accountCode: '4200', debit: 0, credit: round(Number(b.employeePaye ?? 0) + Number(b.employeeNi ?? 0) + Number(b.employerNi ?? 0)), narrative: 'PAYE and NI payable' }, { accountCode: '4000', debit: 0, credit: round(Number(b.employeePension ?? 0) + Number(b.employerPension ?? 0)), narrative: 'Pension payable' }, { accountCode: '4000', debit: 0, credit: Number(b.netPay ?? 0), narrative: 'Net wages payable' }] } });
});

app.post('/api/reports/profit-and-loss', (req: Request, res: Response) => {
  const accounts = Array.isArray(req.body.accounts) ? req.body.accounts : [];
  const income = accounts.filter((a: any) => a.accountType === 'income').map((a: any) => ({ ...a, amount: normalBalance(a) }));
  const expenses = accounts.filter((a: any) => a.accountType === 'expense').map((a: any) => ({ ...a, amount: normalBalance(a) }));
  const totalIncome = round(income.reduce((s: number, a: any) => s + a.amount, 0));
  const totalExpenses = round(expenses.reduce((s: number, a: any) => s + a.amount, 0));
  res.json({ income, expenses, totalIncome, totalExpenses, netProfit: round(totalIncome - totalExpenses) });
});
app.post('/api/reports/balance-sheet/structured', (req: Request, res: Response) => {
  const accounts = Array.isArray(req.body.accounts) ? req.body.accounts : [];
  const fixedAssets = section(accounts, 'fixed_assets', 'asset');
  const currentAssets = section(accounts, 'current_assets', 'asset');
  const currentLiabilities = section(accounts, 'current_liabilities', 'liability');
  const longTermLiabilities = section(accounts, 'long_term_liabilities', 'liability');
  const capitalAndReserves = section(accounts, 'capital_and_reserves', 'equity');
  const netCurrentAssets = round(currentAssets.total - currentLiabilities.total);
  const netAssets = round(fixedAssets.total + netCurrentAssets - longTermLiabilities.total);
  res.json({ fixedAssets, currentAssets, currentLiabilities, netCurrentAssets, longTermLiabilities, netAssets, capitalAndReserves, balanceCheck: { balanced: netAssets === capitalAndReserves.total, difference: round(netAssets - capitalAndReserves.total) } });
});
app.post('/api/reports/balance-sheet', (req: Request, res: Response) => res.redirect(307, '/api/reports/balance-sheet/structured'));

app.get('/api/bank-feeds/:provider/blueprint', (req: Request, res: Response) => res.json({ provider: req.params.provider, status: 'requires_oauth_credentials', scopes: ['accounts', 'transactions', 'balance'], tenantIsolation: 'provider_tokens_are_stored_per_business_entity_and_encrypted' }));
app.get('/api/ocr/:provider/blueprint', (req: Request, res: Response) => res.json({ provider: req.params.provider, status: 'requires_provider_credentials', output: ['supplier', 'invoice_date', 'total', 'vat_total', 'currency', 'line_items'] }));
app.get('/api/mtd/vat/readiness', (_req: Request, res: Response) => res.json({ status: 'adapter_ready_credentials_required', requiredSecrets: ['HMRC_CLIENT_ID', 'HMRC_CLIENT_SECRET'], requiredScopes: ['read:vat', 'write:vat'] }));
app.post('/api/mtd/vat/returns/validate', (req: Request, res: Response) => {
  const b = req.body; const expectedBox3 = round(Number(b.box1 ?? 0) + Number(b.box2 ?? 0)); const expectedBox5 = round(expectedBox3 - Number(b.box4 ?? 0)); const errors: string[] = [];
  if (b.box3 !== undefined && round(Number(b.box3)) !== expectedBox3) errors.push('Box 3 must equal Box 1 plus Box 2.');
  if (round(Number(b.box5 ?? 0)) !== expectedBox5) errors.push('Box 5 must equal Box 3 minus Box 4.');
  res.json({ valid: errors.length === 0, errors, expectedBox3, expectedBox5, boxes: b });
});

app.use('/api/auth', authRoutes);
app.use('/api/company', authMiddleware, companyRoutes);
app.use('/api/payroll', authMiddleware, payrollRoutes);
app.use('/api/hmrc', authMiddleware, hmrcRoutes);
app.use('/api/accounts', authMiddleware, accountsRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);

app.use(errorHandler);
app.use((_req: Request, res: Response) => res.status(404).json({ error: 'Route not found' }));

const PORT = config.port || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
});

export default app;

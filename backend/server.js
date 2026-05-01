const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

const round = (value) => Math.round(Number(value || 0) * 100) / 100;
const chartOfAccounts = [
  ['1000', 'Sales / Turnover', 'income', 'profit_and_loss', 'income.sales'],
  ['1010', 'Other Income', 'income', 'profit_and_loss', 'income.other'],
  ['2000', 'Direct Costs / Cost of Sales', 'expense', 'profit_and_loss', 'expenses.direct_costs'],
  ['2200', 'Administrative Expenses', 'expense', 'profit_and_loss', 'expenses.administrative'],
  ['2300', 'Wages and Salaries', 'expense', 'profit_and_loss', 'expenses.staff'],
  ['2310', 'Employer National Insurance', 'expense', 'profit_and_loss', 'expenses.staff'],
  ['2320', 'Employer Pension Contributions', 'expense', 'profit_and_loss', 'expenses.staff'],
  ['2400', 'Advertising and Marketing', 'expense', 'profit_and_loss', 'expenses.marketing'],
  ['2500', 'Bank Fees', 'expense', 'profit_and_loss', 'expenses.financial'],
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
  ['5020', 'Director Loan Account', 'liability', 'balance_sheet', 'long_term_liabilities.director_loans'],
  ['5100', 'Provisions for Liabilities', 'liability', 'balance_sheet', 'long_term_liabilities.provisions'],
  ['7000', 'Called Up Share Capital', 'equity', 'balance_sheet', 'capital_and_reserves.share_capital'],
  ['7100', 'Profit and Loss Account / Retained Earnings', 'equity', 'balance_sheet', 'capital_and_reserves.profit_and_loss']
].map(([code, name, accountType, reportSection, category]) => ({ code, name, accountType, reportSection, category }));

function validateJournal(body = {}) {
  const lines = Array.isArray(body.lines) ? body.lines : [];
  const errors = [];
  if (!body.description) errors.push('Journal description is required.');
  if (lines.length < 2) errors.push('A journal must contain at least two lines.');
  lines.forEach((line, index) => {
    const debit = Number(line.debit || 0);
    const credit = Number(line.credit || 0);
    if (!line.accountCode) errors.push(`Line ${index + 1}: account code is required.`);
    if (debit < 0 || credit < 0) errors.push(`Line ${index + 1}: debit and credit cannot be negative.`);
    if (debit > 0 && credit > 0) errors.push(`Line ${index + 1}: use either debit or credit, not both.`);
    if (debit === 0 && credit === 0) errors.push(`Line ${index + 1}: debit or credit amount is required.`);
  });
  const debitTotal = round(lines.reduce((sum, line) => sum + Number(line.debit || 0), 0));
  const creditTotal = round(lines.reduce((sum, line) => sum + Number(line.credit || 0), 0));
  const difference = round(debitTotal - creditTotal);
  if (difference !== 0) errors.push('Total debits must equal total credits before posting.');
  return { valid: errors.length === 0, debitTotal, creditTotal, difference, errors, postingPolicy: errors.length === 0 ? 'postable' : 'blocked_until_valid_and_balanced' };
}

const normal = (account) => ['asset', 'expense'].includes(account.accountType) ? round(Number(account.debit || 0) - Number(account.credit || 0)) : round(Number(account.credit || 0) - Number(account.debit || 0));
const section = (accounts, prefix, type) => {
  const lines = accounts.filter((a) => a.accountType === type && String(a.reportSection || '').startsWith(prefix)).map((a) => ({ ...a, amount: normal(a) }));
  return { section: prefix, lines, total: round(lines.reduce((sum, line) => sum + line.amount, 0)) };
};

app.get('/', (_req, res) => res.json({ service: 'accounthub-api', health: '/health' }));
app.get('/health', (_req, res) => res.json({ ok: true, service: 'accounthub-api', modules: ['journal-first-ledger', 'standard-coa', 'manual-journals', 'sales-subledger', 'purchase-subledger', 'bank-feeds', 'bank-reconciliation', 'ocr', 'mtd-vat', 'tenant-isolation', 'payroll-posting', 'reports', 'documents'] }));
app.get('/api/bookkeeping/chart-template/uk-limited-company', (_req, res) => res.json(chartOfAccounts));
app.post('/api/ledger/journals/validate', (req, res) => res.json(validateJournal(req.body)));
app.post('/api/ledger/journals/manual/prepare', (req, res) => res.json({ ...validateJournal(req.body), journalHeader: { entityId: req.body.entityId, date: req.body.date, reference: req.body.reference, description: req.body.description, createdBy: req.body.createdBy }, journalLines: req.body.lines || [] }));
app.post('/api/ledger/equation/verify', (req, res) => {
  const accounts = Array.isArray(req.body.accounts) ? req.body.accounts : [];
  const assets = round(accounts.filter((a) => a.accountType === 'asset').reduce((s, a) => s + Number(a.debit || 0) - Number(a.credit || 0), 0));
  const liabilities = round(accounts.filter((a) => a.accountType === 'liability').reduce((s, a) => s + Number(a.credit || 0) - Number(a.debit || 0), 0));
  const equity = round(accounts.filter((a) => a.accountType === 'equity').reduce((s, a) => s + Number(a.credit || 0) - Number(a.debit || 0), 0));
  const income = round(accounts.filter((a) => a.accountType === 'income').reduce((s, a) => s + Number(a.credit || 0) - Number(a.debit || 0), 0));
  const expenses = round(accounts.filter((a) => a.accountType === 'expense').reduce((s, a) => s + Number(a.debit || 0) - Number(a.credit || 0), 0));
  const retainedEarningsMovement = round(income - expenses);
  const rightSide = round(liabilities + equity + retainedEarningsMovement);
  res.json({ assets, liabilities, equity, income, expenses, retainedEarningsMovement, rightSide, balanced: assets === rightSide, difference: round(assets - rightSide) });
});
app.post('/api/subledgers/sales-invoices/posting-preview', (req, res) => {
  const net = Number(req.body.netAmount || 0);
  const vat = Number(req.body.vatAmount || 0);
  res.json({ source: 'sales_invoice', reference: req.body.invoiceNumber, journal: { lines: [{ accountCode: req.body.debtorAccount || '3300', debit: round(net + vat), credit: 0 }, { accountCode: req.body.salesAccount || '1000', debit: 0, credit: net }, { accountCode: req.body.vatAccount || '4100', debit: 0, credit: vat }] } });
});
app.post('/api/subledgers/purchase-bills/posting-preview', (req, res) => {
  const net = Number(req.body.netAmount || 0);
  const vat = Number(req.body.vatAmount || 0);
  res.json({ source: 'purchase_bill', reference: req.body.billNumber, journal: { lines: [{ accountCode: req.body.expenseAccount || '2200', debit: net, credit: 0 }, { accountCode: req.body.vatAccount || '4100', debit: vat, credit: 0 }, { accountCode: req.body.creditorAccount || '4000', debit: 0, credit: round(net + vat) }] } });
});
app.post('/api/subledgers/payroll/posting-preview', (req, res) => {
  const b = req.body || {};
  res.json({ source: 'payroll_run', journal: { lines: [{ accountCode: '2300', debit: Number(b.grossWages || 0), credit: 0 }, { accountCode: '2310', debit: Number(b.employerNi || 0), credit: 0 }, { accountCode: '2320', debit: Number(b.employerPension || 0), credit: 0 }, { accountCode: '4200', debit: 0, credit: round(Number(b.employeePaye || 0) + Number(b.employeeNi || 0) + Number(b.employerNi || 0)) }, { accountCode: '4000', debit: 0, credit: round(Number(b.employeePension || 0) + Number(b.employerPension || 0)) }, { accountCode: '4000', debit: 0, credit: Number(b.netPay || 0) }] } });
});
app.post('/api/reports/profit-and-loss', (req, res) => {
  const accounts = Array.isArray(req.body.accounts) ? req.body.accounts : [];
  const income = accounts.filter((a) => a.accountType === 'income').map((a) => ({ ...a, amount: normal(a) }));
  const expenses = accounts.filter((a) => a.accountType === 'expense').map((a) => ({ ...a, amount: normal(a) }));
  const totalIncome = round(income.reduce((s, a) => s + a.amount, 0));
  const totalExpenses = round(expenses.reduce((s, a) => s + a.amount, 0));
  res.json({ income, expenses, totalIncome, totalExpenses, netProfit: round(totalIncome - totalExpenses) });
});
app.post('/api/reports/balance-sheet/structured', (req, res) => {
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
app.get('/api/bank-feeds/:provider/blueprint', (req, res) => res.json({ provider: req.params.provider, status: 'requires_oauth_credentials', scopes: ['accounts', 'transactions', 'balance'], tenantIsolation: 'provider_tokens_are_stored_per_business_entity_and_encrypted' }));
app.get('/api/ocr/:provider/blueprint', (req, res) => res.json({ provider: req.params.provider, status: 'requires_provider_credentials', output: ['supplier', 'invoice_date', 'total', 'vat_total', 'currency', 'line_items'] }));
app.get('/api/mtd/vat/readiness', (_req, res) => res.json({ status: 'adapter_ready_credentials_required', requiredSecrets: ['HMRC_CLIENT_ID', 'HMRC_CLIENT_SECRET'], requiredScopes: ['read:vat', 'write:vat'] }));
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`Accounthub API running on port ${port}`));

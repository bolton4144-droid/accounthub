const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

const round = (value) => Math.round(Number(value || 0) * 100) / 100;
const id = (prefix) => `${prefix}_${crypto.randomUUID().slice(0, 8)}`;

const runtimeTokens = new Map();
const oauthStates = new Map();
const receipts = [];
const clients = [
  { id: 'cli_aster', name: 'Aster Advisory Ltd', companyNumber: '12849210', status: 'Active', vatScheme: 'standard', payrollFrequency: 'monthly', nextDeadline: 'VAT return 07 May' },
  { id: 'cli_north', name: 'Northline Studio Ltd', companyNumber: '09124544', status: 'Active', vatScheme: 'cash', payrollFrequency: 'monthly', nextDeadline: 'Payroll 30 May' }
];
const employers = [
  { id: 'emp_aster', clientId: 'cli_aster', name: 'Aster Advisory Ltd', payeReference: '123/AB456', accountsOfficeRef: '123PA00123456', pensionProvider: 'Nest', payFrequency: 'monthly' }
];
const employees = [
  { id: 'ee_ava', employerId: 'emp_aster', firstName: 'Ava', lastName: 'Patel', niNumber: 'QQ123456C', taxCode: '1257L', startDate: '2026-04-06', annualSalary: 42000, pensionPercent: 5, status: 'active', starterStatement: 'A', email: 'ava.patel@example.com' },
  { id: 'ee_noah', employerId: 'emp_aster', firstName: 'Noah', lastName: 'Williams', niNumber: 'QQ654321D', taxCode: '1257L', startDate: '2026-04-06', annualSalary: 36000, pensionPercent: 5, status: 'active', starterStatement: 'B', email: 'noah.williams@example.com' }
];
const documents = [
  { id: 'doc_pack', type: 'management-pack', entityName: 'Aster Advisory Ltd', title: 'April management pack', status: 'ready', createdAt: new Date().toISOString() }
];
const invoices = [];
const bills = [];

const hmrcEnvironment = process.env.HMRC_ENVIRONMENT || 'sandbox';
const hmrcApiBase = process.env.HMRC_API_BASE_URL || (hmrcEnvironment === 'production' ? 'https://api.service.hmrc.gov.uk' : 'https://test-api.service.hmrc.gov.uk');
const hmrcAuthBase = process.env.HMRC_AUTH_BASE_URL || (hmrcEnvironment === 'production' ? 'https://www.tax.service.gov.uk' : 'https://test-www.tax.service.gov.uk');
const hmrcRedirectUri = process.env.HMRC_REDIRECT_URI || `${process.env.PUBLIC_API_BASE_URL || 'https://accounthub-production-92fc.up.railway.app'}/api/hmrc/mtd/oauth/callback`;

const chartOfAccounts = [
  ['1000', 'Sales / Turnover', 'income', 'profit_and_loss', 'income.sales'], ['1010', 'Other Income', 'income', 'profit_and_loss', 'income.other'], ['2000', 'Direct Costs / Cost of Sales', 'expense', 'profit_and_loss', 'expenses.direct_costs'], ['2100', 'Materials', 'expense', 'profit_and_loss', 'expenses.direct_costs'], ['2200', 'Administrative Expenses', 'expense', 'profit_and_loss', 'expenses.administrative'], ['2300', 'Wages and Salaries', 'expense', 'profit_and_loss', 'expenses.staff'], ['2310', 'Employer National Insurance', 'expense', 'profit_and_loss', 'expenses.staff'], ['2320', 'Employer Pension Contributions', 'expense', 'profit_and_loss', 'expenses.staff'], ['2400', 'Advertising and Marketing', 'expense', 'profit_and_loss', 'expenses.marketing'], ['2500', 'Bank Fees', 'expense', 'profit_and_loss', 'expenses.financial'], ['2520', 'Depreciation', 'expense', 'profit_and_loss', 'expenses.financial'], ['3000', 'Tangible Fixed Assets', 'asset', 'balance_sheet', 'fixed_assets.tangible'], ['3010', 'Intangible Fixed Assets', 'asset', 'balance_sheet', 'fixed_assets.intangible'], ['3090', 'Accumulated Depreciation', 'asset', 'balance_sheet', 'fixed_assets.accumulated_depreciation'], ['3200', 'Inventory / Stock', 'asset', 'balance_sheet', 'current_assets.inventory'], ['3300', 'Trade Debtors', 'asset', 'balance_sheet', 'current_assets.trade_debtors'], ['3400', 'Prepayments', 'asset', 'balance_sheet', 'current_assets.prepayments'], ['3500', 'Other Receivables', 'asset', 'balance_sheet', 'current_assets.other_receivables'], ['1200', 'Cash at Bank', 'asset', 'balance_sheet', 'current_assets.cash_at_bank'], ['4000', 'Trade Creditors', 'liability', 'balance_sheet', 'current_liabilities.trade_creditors'], ['4100', 'VAT Liability', 'liability', 'balance_sheet', 'current_liabilities.taxation'], ['4110', 'Corporation Tax Liability', 'liability', 'balance_sheet', 'current_liabilities.taxation'], ['4200', 'PAYE / Payroll Taxes', 'liability', 'balance_sheet', 'current_liabilities.payroll_taxes'], ['4300', 'Accruals', 'liability', 'balance_sheet', 'current_liabilities.accruals'], ['4400', 'Short Term Loans', 'liability', 'balance_sheet', 'current_liabilities.short_term_loans'], ['5000', 'Long Term Loans', 'liability', 'balance_sheet', 'long_term_liabilities.loans'], ['5020', 'Director Loan Account', 'liability', 'balance_sheet', 'long_term_liabilities.director_loans'], ['5100', 'Provisions for Liabilities', 'liability', 'balance_sheet', 'long_term_liabilities.provisions'], ['7000', 'Called Up Share Capital', 'equity', 'balance_sheet', 'capital_and_reserves.share_capital'], ['7100', 'Profit and Loss Account / Retained Earnings', 'equity', 'balance_sheet', 'capital_and_reserves.profit_and_loss']
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

function payrollPreview(employee) {
  const gross = round(Number(employee.annualSalary || 0) / 12);
  const pension = round(gross * Number(employee.pensionPercent || 0) / 100);
  const taxable = Math.max(0, gross - 1048);
  const paye = round(taxable * 0.2);
  const employeeNi = round(Math.max(0, gross - 1048) * 0.08);
  const employerNi = round(Math.max(0, gross - 758) * 0.138);
  const employerPension = round(pension * 0.6);
  const netPay = round(gross - paye - employeeNi - pension);
  return { employeeId: employee.id, name: `${employee.firstName} ${employee.lastName}`, gross, paye, employeeNi, employerNi, employeePension: pension, employerPension, netPay };
}

const normal = (account) => ['asset', 'expense'].includes(account.accountType) ? round(Number(account.debit || 0) - Number(account.credit || 0)) : round(Number(account.credit || 0) - Number(account.debit || 0));
const section = (accounts, prefix, type) => {
  const lines = accounts.filter((a) => a.accountType === type && String(a.reportSection || '').startsWith(prefix)).map((a) => ({ ...a, amount: normal(a) }));
  return { section: prefix, lines, total: round(lines.reduce((sum, line) => sum + line.amount, 0)) };
};
const base64Url = (buffer) => buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
const hasHmrcCredentials = () => Boolean(process.env.HMRC_CLIENT_ID && process.env.HMRC_CLIENT_SECRET);
const tokenKey = (tenantId = 'default') => String(tenantId || 'default');
const getToken = (tenantId) => runtimeTokens.get(tokenKey(tenantId));

async function exchangeHmrcToken(params) {
  const response = await axios.post(`${hmrcApiBase}/oauth/token`, new URLSearchParams(params).toString(), { headers: { 'content-type': 'application/x-www-form-urlencoded' }, timeout: 30000 });
  return response.data;
}
async function callHmrc({ method = 'GET', path, tenantId, body, fraudHeaders = {}, accept = 'application/vnd.hmrc.1.0+json' }) {
  const token = getToken(tenantId);
  if (!token?.access_token) { const error = new Error('HMRC OAuth token is required. Start the authorisation flow first.'); error.status = 401; throw error; }
  const response = await axios({ method, url: `${hmrcApiBase}${path}`, data: body, timeout: 30000, headers: { Accept: accept, 'Content-Type': 'application/json', Authorization: `Bearer ${token.access_token}`, ...fraudHeaders }, validateStatus: () => true });
  return { status: response.status, headers: response.headers, data: response.data };
}
function buildFraudHeaders(req, client = {}) {
  const publicIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '0.0.0.0';
  return { 'Gov-Client-Connection-Method': client.connectionMethod || 'WEB_APP_VIA_SERVER', 'Gov-Client-Public-IP': client.publicIp || publicIp, 'Gov-Client-Device-ID': client.deviceId || crypto.createHash('sha256').update(client.userAgent || req.headers['user-agent'] || 'unknown-device').digest('hex'), 'Gov-Client-User-Agent': client.userAgent || req.headers['user-agent'] || 'unknown', 'Gov-Client-Browser-JS-User-Agent': client.browserJsUserAgent || client.userAgent || req.headers['user-agent'] || 'unknown', 'Gov-Client-Timezone': client.timezone || 'UTC+00:00', 'Gov-Client-Local-IPs': client.localIps || '[]', 'Gov-Client-Screens': client.screens || 'width=0&height=0&scaling-factor=1&colour-depth=24', 'Gov-Client-Window-Size': client.windowSize || 'width=0&height=0', 'Gov-Client-Browser-Do-Not-Track': String(client.doNotTrack ?? 'false'), 'Gov-Client-Browser-Plugins': client.plugins || '[]', 'Gov-Client-Multi-Factor': client.multiFactor || 'type=OTHER&timestamp=1970-01-01T00:00:00Z&unique-reference=not-captured', 'Gov-Vendor-Version': client.vendorVersion || 'NexoryRole=0.1.0', 'Gov-Vendor-License-IDs': client.vendorLicenseIds || 'NexoryRole=unlicensed-development', 'Gov-Vendor-Public-IP': client.vendorPublicIp || publicIp, 'Gov-Vendor-Forwarded': client.vendorForwarded || `by=${publicIp}&for=${publicIp}` };
}
function validateVatBoxes(body = {}) {
  const expectedBox3 = round(Number(body.vatDueSales || body.box1 || 0) + Number(body.vatDueAcquisitions || body.box2 || 0));
  const expectedBox5 = round(expectedBox3 - Number(body.totalVatReclaimedCurrPeriod || body.box4 || 0));
  const box3 = round(Number(body.totalVatDue || body.box3 || expectedBox3));
  const box5 = round(Number(body.netVatDue || body.box5 || expectedBox5));
  const errors = [];
  if (box3 !== expectedBox3) errors.push('totalVatDue must equal vatDueSales plus vatDueAcquisitions.');
  if (box5 !== expectedBox5) errors.push('netVatDue must equal totalVatDue minus totalVatReclaimedCurrPeriod.');
  if (body.finalised !== true) errors.push('HMRC requires finalised=true after the user or agent confirms the VAT declaration.');
  return { valid: errors.length === 0, errors, expectedBox3, expectedBox5 };
}

app.get('/', (_req, res) => res.json({ service: 'accounthub-api', health: '/health' }));
app.get('/health', (_req, res) => res.json({ ok: true, service: 'accounthub-api', modules: ['practice-management', 'client-onboarding', 'employee-payroll', 'starter-forms', 'p45-p60-documents', 'journal-first-ledger', 'standard-coa', 'manual-journals', 'sales-subledger', 'purchase-subledger', 'reports', 'bank-feeds', 'ocr', 'mtd-vat', 'hmrc-oauth-disabled-until-credentials'] }));
app.get('/api/dashboard/overview', (_req, res) => {
  const payroll = employees.map(payrollPreview);
  res.json({ clients: clients.length, employers: employers.length, employees: employees.length, activePayrollGross: round(payroll.reduce((s, p) => s + p.gross, 0)), activePayrollNet: round(payroll.reduce((s, p) => s + p.netPay, 0)), openVatReturns: 4, documentsReady: documents.length, deadlines: clients.map((c) => ({ clientId: c.id, clientName: c.name, nextDeadline: c.nextDeadline })) });
});

app.get('/api/practice/clients', (_req, res) => res.json(clients));
app.post('/api/practice/clients', (req, res) => { const client = { id: id('cli'), status: 'Active', vatScheme: 'standard', payrollFrequency: 'monthly', nextDeadline: 'New client review', ...req.body }; clients.unshift(client); res.status(201).json(client); });
app.get('/api/payroll/employers', (_req, res) => res.json(employers.map((employer) => ({ ...employer, employeeCount: employees.filter((e) => e.employerId === employer.id).length }))));
app.post('/api/payroll/employers', (req, res) => { const employer = { id: id('emp'), payFrequency: 'monthly', pensionProvider: 'Nest', ...req.body }; employers.unshift(employer); res.status(201).json(employer); });
app.get('/api/payroll/employers/:employerId/employees', (req, res) => res.json(employees.filter((e) => e.employerId === req.params.employerId)));
app.post('/api/payroll/employers/:employerId/employees', (req, res) => { const employer = employers.find((e) => e.id === req.params.employerId); if (!employer) return res.status(404).json({ error: 'Employer not found' }); const employee = { id: id('ee'), employerId: employer.id, status: 'active', taxCode: '1257L', pensionPercent: 5, starterStatement: 'A', ...req.body }; employees.unshift(employee); res.status(201).json(employee); });
app.post('/api/employees/starter-checklist', (req, res) => { const employee = employees.find((e) => e.id === req.body.employeeId); if (!employee) return res.status(404).json({ error: 'Employee not found' }); Object.assign(employee, { starterStatement: req.body.statement || employee.starterStatement, starterCompletedAt: new Date().toISOString() }); res.json({ employee, document: { type: 'starter-checklist', status: 'captured' } }); });
app.post('/api/employees/p45', (req, res) => { const employee = employees.find((e) => e.id === req.body.employeeId); if (!employee) return res.status(404).json({ error: 'Employee not found' }); employee.status = 'leaver'; employee.leaveDate = req.body.leaveDate || new Date().toISOString().slice(0, 10); const document = { id: id('doc'), type: 'p45', entityName: `${employee.firstName} ${employee.lastName}`, title: `P45 - ${employee.firstName} ${employee.lastName}`, status: 'ready', createdAt: new Date().toISOString() }; documents.unshift(document); res.json({ employee, document }); });
app.post('/api/employees/p60', (req, res) => { const employee = employees.find((e) => e.id === req.body.employeeId); if (!employee) return res.status(404).json({ error: 'Employee not found' }); const document = { id: id('doc'), type: 'p60', entityName: `${employee.firstName} ${employee.lastName}`, title: `P60 ${req.body.taxYear || '2026'} - ${employee.firstName} ${employee.lastName}`, status: 'ready', createdAt: new Date().toISOString() }; documents.unshift(document); res.json({ employee, document }); });
app.post('/api/payroll/runs/preview', (req, res) => { const runEmployees = employees.filter((e) => e.employerId === req.body.employerId && e.status === 'active'); const lines = runEmployees.map(payrollPreview); const totals = lines.reduce((a, p) => ({ gross: round(a.gross + p.gross), paye: round(a.paye + p.paye), employeeNi: round(a.employeeNi + p.employeeNi), employerNi: round(a.employerNi + p.employerNi), pension: round(a.pension + p.employeePension), netPay: round(a.netPay + p.netPay) }), { gross: 0, paye: 0, employeeNi: 0, employerNi: 0, pension: 0, netPay: 0 }); res.json({ period: req.body.period || new Date().toISOString().slice(0, 7), employees: lines, totals, journal: { lines: [{ accountCode: '2300', debit: totals.gross, credit: 0 }, { accountCode: '2310', debit: totals.employerNi, credit: 0 }, { accountCode: '4200', debit: 0, credit: round(totals.paye + totals.employeeNi + totals.employerNi) }, { accountCode: '4000', debit: 0, credit: totals.netPay }] } }); });

app.get('/api/bookkeeping/chart-template/uk-limited-company', (_req, res) => res.json(chartOfAccounts));
app.post('/api/ledger/journals/validate', (req, res) => res.json(validateJournal(req.body)));
app.post('/api/ledger/journals/manual/prepare', (req, res) => res.json({ ...validateJournal(req.body), journalHeader: { entityId: req.body.entityId, date: req.body.date, reference: req.body.reference, description: req.body.description, createdBy: req.body.createdBy }, journalLines: req.body.lines || [] }));
app.post('/api/subledgers/sales-invoices', (req, res) => { const invoice = { id: id('inv'), createdAt: new Date().toISOString(), status: 'draft', ...req.body }; invoices.unshift(invoice); res.status(201).json(invoice); });
app.get('/api/subledgers/sales-invoices', (_req, res) => res.json(invoices));
app.post('/api/subledgers/sales-invoices/posting-preview', (req, res) => { const net = Number(req.body.netAmount || 0); const vat = Number(req.body.vatAmount || 0); res.json({ source: 'sales_invoice', reference: req.body.invoiceNumber, journal: { lines: [{ accountCode: req.body.debtorAccount || '3300', debit: round(net + vat), credit: 0 }, { accountCode: req.body.salesAccount || '1000', debit: 0, credit: net }, { accountCode: req.body.vatAccount || '4100', debit: 0, credit: vat }] } }); });
app.post('/api/subledgers/purchase-bills', (req, res) => { const bill = { id: id('bill'), createdAt: new Date().toISOString(), status: 'draft', ...req.body }; bills.unshift(bill); res.status(201).json(bill); });
app.get('/api/subledgers/purchase-bills', (_req, res) => res.json(bills));
app.post('/api/subledgers/purchase-bills/posting-preview', (req, res) => { const net = Number(req.body.netAmount || 0); const vat = Number(req.body.vatAmount || 0); res.json({ source: 'purchase_bill', reference: req.body.billNumber, journal: { lines: [{ accountCode: req.body.expenseAccount || '2200', debit: net, credit: 0 }, { accountCode: req.body.vatAccount || '4100', debit: vat, credit: 0 }, { accountCode: req.body.creditorAccount || '4000', debit: 0, credit: round(net + vat) }] } }); });
app.post('/api/reports/profit-and-loss', (req, res) => { const accounts = Array.isArray(req.body.accounts) ? req.body.accounts : []; const income = accounts.filter((a) => a.accountType === 'income').map((a) => ({ ...a, amount: normal(a) })); const expenses = accounts.filter((a) => a.accountType === 'expense').map((a) => ({ ...a, amount: normal(a) })); const totalIncome = round(income.reduce((s, a) => s + a.amount, 0)); const totalExpenses = round(expenses.reduce((s, a) => s + a.amount, 0)); res.json({ income, expenses, totalIncome, totalExpenses, netProfit: round(totalIncome - totalExpenses) }); });
app.post('/api/reports/balance-sheet/structured', (req, res) => { const accounts = Array.isArray(req.body.accounts) ? req.body.accounts : []; const fixedAssets = section(accounts, 'fixed_assets', 'asset'); const currentAssets = section(accounts, 'current_assets', 'asset'); const currentLiabilities = section(accounts, 'current_liabilities', 'liability'); const longTermLiabilities = section(accounts, 'long_term_liabilities', 'liability'); const capitalAndReserves = section(accounts, 'capital_and_reserves', 'equity'); const netCurrentAssets = round(currentAssets.total - currentLiabilities.total); const netAssets = round(fixedAssets.total + netCurrentAssets - longTermLiabilities.total); res.json({ fixedAssets, currentAssets, currentLiabilities, netCurrentAssets, longTermLiabilities, netAssets, capitalAndReserves, balanceCheck: { balanced: netAssets === capitalAndReserves.total, difference: round(netAssets - capitalAndReserves.total) } }); });
app.get('/api/documents', (_req, res) => res.json(documents));
app.post('/api/documents', (req, res) => { const document = { id: id('doc'), status: 'ready', createdAt: new Date().toISOString(), ...req.body }; documents.unshift(document); res.status(201).json(document); });
app.get('/api/bank-feeds/:provider/blueprint', (req, res) => res.json({ provider: req.params.provider, status: 'requires_oauth_credentials', scopes: ['accounts', 'transactions', 'balance'], tenantIsolation: 'provider_tokens_are_stored_per_business_entity_and_encrypted' }));
app.get('/api/ocr/:provider/blueprint', (req, res) => res.json({ provider: req.params.provider, status: 'requires_provider_credentials', output: ['supplier', 'invoice_date', 'total', 'vat_total', 'currency', 'line_items'] }));

app.get('/api/mtd/vat/readiness', (_req, res) => res.json({ status: hasHmrcCredentials() ? 'credentials_configured_ready_for_oauth' : 'adapter_ready_credentials_required', environment: hmrcEnvironment, apiBaseUrl: hmrcApiBase, authBaseUrl: hmrcAuthBase, redirectUri: hmrcRedirectUri, requiredSecrets: ['HMRC_CLIENT_ID', 'HMRC_CLIENT_SECRET', 'HMRC_REDIRECT_URI', 'PUBLIC_API_BASE_URL'], requiredScopes: ['read:vat', 'write:vat'], implementedRoutes: ['/api/hmrc/mtd/oauth/start', '/api/hmrc/mtd/oauth/callback', '/api/hmrc/mtd/vat/:vrn/obligations', '/api/hmrc/mtd/vat/:vrn/returns/:periodKey/submit', '/api/hmrc/mtd/vat/receipts'] }));
app.get('/api/hmrc/mtd/oauth/start', (req, res) => { if (!process.env.HMRC_CLIENT_ID) return res.status(503).json({ error: 'HMRC_CLIENT_ID is not configured in Railway.' }); const state = crypto.randomUUID(); const verifier = base64Url(crypto.randomBytes(32)); const challenge = base64Url(crypto.createHash('sha256').update(verifier).digest()); const tenantId = req.query.tenantId || 'default'; oauthStates.set(state, { tenantId, verifier, createdAt: new Date().toISOString() }); const params = new URLSearchParams({ response_type: 'code', client_id: process.env.HMRC_CLIENT_ID, scope: 'read:vat write:vat', state, redirect_uri: hmrcRedirectUri, code_challenge: challenge, code_challenge_method: 'S256' }); res.json({ authorisationUrl: `${hmrcAuthBase}/oauth/authorize?${params.toString()}`, state, tenantId, scopes: ['read:vat', 'write:vat'], redirectUri: hmrcRedirectUri }); });
app.get('/api/hmrc/mtd/oauth/callback', async (req, res) => { try { const { code, state, error, error_description: description } = req.query; if (error) return res.status(400).json({ error, description }); const stateRecord = oauthStates.get(String(state)); if (!code || !stateRecord) return res.status(400).json({ error: 'Invalid or expired HMRC OAuth state.' }); if (!hasHmrcCredentials()) return res.status(503).json({ error: 'HMRC credentials are not configured in Railway.' }); const token = await exchangeHmrcToken({ client_secret: process.env.HMRC_CLIENT_SECRET, client_id: process.env.HMRC_CLIENT_ID, grant_type: 'authorization_code', redirect_uri: hmrcRedirectUri, code: String(code), code_verifier: stateRecord.verifier }); runtimeTokens.set(tokenKey(stateRecord.tenantId), { ...token, storedAt: new Date().toISOString() }); oauthStates.delete(String(state)); res.json({ ok: true, tenantId: stateRecord.tenantId, scope: token.scope, expiresIn: token.expires_in, tokenStored: true }); } catch (err) { res.status(err.response?.status || 500).json({ error: 'HMRC OAuth callback failed.', detail: err.response?.data || err.message }); } });
app.post('/api/hmrc/mtd/fraud-prevention/preview', (req, res) => res.json({ headers: buildFraudHeaders(req, req.body || {}), warning: 'Preview only. Validate these values with HMRC Test Fraud Prevention Headers API before production filing.' }));
app.get('/api/hmrc/mtd/vat/:vrn/obligations', async (req, res) => { try { const { vrn } = req.params; const { from, to, status = 'O', tenantId = 'default' } = req.query; if (!from || !to) return res.status(400).json({ error: 'from and to query parameters are required.' }); const params = new URLSearchParams({ from: String(from), to: String(to), status: String(status) }); const hmrc = await callHmrc({ tenantId, path: `/organisations/vat/${encodeURIComponent(vrn)}/obligations?${params.toString()}`, fraudHeaders: buildFraudHeaders(req) }); res.status(hmrc.status).json(hmrc.data); } catch (err) { res.status(err.status || err.response?.status || 500).json({ error: 'VAT obligation lookup failed.', detail: err.response?.data || err.message }); } });
app.post('/api/hmrc/mtd/vat/:vrn/returns/:periodKey/submit', async (req, res) => { try { const { vrn, periodKey } = req.params; const { tenantId = 'default', fraud = {}, return: vatReturn = req.body } = req.body || {}; const validation = validateVatBoxes(vatReturn); if (!validation.valid) return res.status(400).json({ error: 'VAT return validation failed.', ...validation }); const hmrc = await callHmrc({ method: 'POST', tenantId, path: `/organisations/vat/${encodeURIComponent(vrn)}/returns/${encodeURIComponent(periodKey)}`, body: vatReturn, fraudHeaders: buildFraudHeaders(req, fraud) }); const receipt = { id: id('mtd'), tenantId, vrn, periodKey, submittedAt: new Date().toISOString(), hmrcStatus: hmrc.status, receiptId: hmrc.headers['x-correlationid'] || hmrc.headers['x-request-id'] || null, response: hmrc.data }; receipts.unshift(receipt); res.status(hmrc.status).json({ receipt, hmrc: hmrc.data }); } catch (err) { res.status(err.status || err.response?.status || 500).json({ error: 'VAT return submission failed.', detail: err.response?.data || err.message }); } });
app.get('/api/hmrc/mtd/vat/receipts', (req, res) => { const { tenantId, vrn } = req.query; res.json(receipts.filter((r) => (!tenantId || r.tenantId === tenantId) && (!vrn || r.vrn === vrn))); });

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
const port = Number(process.env.PORT || 3000);
app.listen(port, '0.0.0.0', () => console.log(`Accounthub API running on 0.0.0.0:${port}`));

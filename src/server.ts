import Fastify from 'fastify';
import cors from '@fastify/cors';
import { z } from 'zod';
import { CompaniesHouseClient } from './services/companies-house-client.js';
import { LedgerService } from './services/ledger-service.js';
import { PayrollService } from './services/payroll-service.js';
import { VatService } from './services/vat-service.js';
import { EmployerService } from './services/employer-service.js';
import { BookkeepingService } from './services/bookkeeping-service.js';
import { ReportingService } from './services/reporting-service.js';
import { DocumentService } from './services/document-service.js';

const server = Fastify({ logger: true });
await server.register(cors, { origin: true });

const companiesHouse = new CompaniesHouseClient(process.env.COMPANIES_HOUSE_API_KEY);
const ledger = new LedgerService();
const payroll = new PayrollService();
const vat = new VatService();
const employers = new EmployerService();
const bookkeeping = new BookkeepingService();
const reporting = new ReportingService();
const documents = new DocumentService();

const accountBalanceSchema = z.object({
  code: z.string(),
  name: z.string(),
  accountType: z.enum(['asset', 'liability', 'equity', 'income', 'expense']),
  debit: z.number().default(0),
  credit: z.number().default(0)
});

server.get('/health', async () => ({
  ok: true,
  service: 'accounthub-api',
  modules: [
    'tenancy',
    'companies-house',
    'employers',
    'employees',
    'starter-checklist',
    'p45',
    'p60',
    'employer-payment-records',
    'ledger',
    'bookkeeping',
    'vat',
    'payroll',
    'reports',
    'documents',
    'hmrc',
    'audit'
  ]
}));

server.get('/api/companies-house/search', async (request) => companiesHouse.searchCompanies(z.object({ q: z.string().min(2) }).parse(request.query).q));
server.get('/api/companies-house/company/:companyNumber', async (request) => companiesHouse.getCompanyBundle(z.object({ companyNumber: z.string().min(2) }).parse(request.params).companyNumber));

server.post('/api/employers/onboard', async (request) => employers.onboardEmployer(z.object({
  legalName: z.string().min(2),
  tradingName: z.string().optional(),
  companyNumber: z.string().optional(),
  payeReference: z.string().optional(),
  accountsOfficeReference: z.string().optional(),
  payFrequency: z.enum(['weekly', 'fortnightly', 'four_weekly', 'monthly'])
}).parse(request.body)));

server.post('/api/employees/starter-checklist', async (request) => employers.createStarterChecklist(z.object({
  employeeId: z.string().min(1),
  declaration: z.enum(['A', 'B', 'C']),
  hasP45: z.boolean().default(false),
  studentLoanPlan: z.string().optional(),
  postgraduateLoan: z.boolean().optional()
}).parse(request.body)));

server.post('/api/employees/p45', async (request) => employers.issueP45(z.object({
  employeeId: z.string().min(1),
  leavingDate: z.string(),
  finalPayToDate: z.number(),
  finalTaxToDate: z.number(),
  taxCode: z.string()
}).parse(request.body)));

server.post('/api/employees/p60', async (request) => employers.issueP60(z.object({
  employeeId: z.string().min(1),
  taxYear: z.string(),
  taxablePay: z.number(),
  taxDeducted: z.number(),
  niContributions: z.number(),
  finalTaxCode: z.string()
}).parse(request.body)));

server.post('/api/payroll/employer-payment-record', async (request) => employers.createEmployerPaymentRecord(z.object({
  taxYear: z.string(),
  taxMonth: z.number().int().min(1).max(12),
  payeDue: z.number().default(0),
  employeeNiDue: z.number().default(0),
  employerNiDue: z.number().default(0),
  studentLoanDue: z.number().optional(),
  pensionDue: z.number().optional(),
  statutoryRecoveries: z.number().optional(),
  apprenticeshipLevyDue: z.number().optional()
}).parse(request.body)));

server.post('/api/ledger/journals/validate', async (request) => ledger.validateBalancedJournal(z.object({
  description: z.string(),
  lines: z.array(z.object({ accountCode: z.string(), debit: z.number().default(0), credit: z.number().default(0) })).min(2)
}).parse(request.body)));

server.get('/api/bookkeeping/chart-template/uk-limited-company', async () => bookkeeping.ukLimitedCompanyChartTemplate());
server.post('/api/bookkeeping/transactions/classify', async (request) => bookkeeping.classifyTransaction(z.object({
  transactionDate: z.string(),
  description: z.string(),
  amount: z.number().positive(),
  direction: z.enum(['money_in', 'money_out']),
  categoryCode: z.string(),
  bankAccountCode: z.string().optional(),
  vatCode: z.string().optional()
}).parse(request.body)));

server.post('/api/reports/trial-balance', async (request) => reporting.trialBalance(z.object({ accounts: z.array(accountBalanceSchema) }).parse(request.body).accounts));
server.post('/api/reports/profit-and-loss', async (request) => reporting.profitAndLoss(z.object({ accounts: z.array(accountBalanceSchema) }).parse(request.body).accounts));
server.post('/api/reports/balance-sheet', async (request) => reporting.balanceSheet(z.object({ accounts: z.array(accountBalanceSchema) }).parse(request.body).accounts));

server.get('/api/documents/templates', async () => documents.templates());
server.post('/api/documents', async (request) => documents.createRecord(z.object({
  documentType: z.enum(['payslip', 'P45', 'P60', 'starter_checklist', 'employer_payment_record', 'profit_and_loss', 'balance_sheet', 'trial_balance']),
  entityId: z.string(),
  employeeId: z.string().optional(),
  taxYear: z.string().optional(),
  payload: z.record(z.unknown())
}).parse(request.body)));

server.post('/api/payroll/runs/preview', async (request) => payroll.previewRun(z.object({
  grossPay: z.number(),
  taxCode: z.string(),
  niCategory: z.string(),
  pensionRate: z.number().default(0.05)
}).parse(request.body)));

server.post('/api/vat/returns/preview', async (request) => vat.previewReturn(z.object({
  scheme: z.enum(['standard', 'flat_rate', 'cash']),
  taxableSales: z.number(),
  taxablePurchases: z.number(),
  flatRatePercent: z.number().optional()
}).parse(request.body)));

await server.listen({ port: Number(process.env.PORT || 3000), host: '0.0.0.0' });

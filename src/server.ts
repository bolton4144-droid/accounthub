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
import { TaxYearService } from './services/tax-year-service.js';
import { StatutoryFixtureService } from './services/statutory-fixture-service.js';
import { RtiService } from './services/rti-service.js';
import { PensionService } from './services/pension-service.js';
import { PdfRenderService } from './services/pdf-render-service.js';
import { PersistenceService } from './services/persistence-service.js';
import { BankFeedService } from './services/bank-feed-service.js';
import { OcrService } from './services/ocr-service.js';
import { MtdVatService } from './services/mtd-vat-service.js';

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
const taxYears = new TaxYearService();
const fixtures = new StatutoryFixtureService();
const rti = new RtiService();
const pensions = new PensionService();
const pdf = new PdfRenderService();
const persistence = new PersistenceService();
const bankFeeds = new BankFeedService();
const ocr = new OcrService();
const mtdVat = new MtdVatService();

const accountBalanceSchema = z.object({ code: z.string(), name: z.string(), accountType: z.enum(['asset', 'liability', 'equity', 'income', 'expense']), debit: z.number().default(0), credit: z.number().default(0), reportSection: z.string().optional() });
const journalLineSchema = z.object({ accountCode: z.string(), debit: z.number().default(0), credit: z.number().default(0), taxCode: z.string().optional(), narrative: z.string().optional() });

server.get('/health', async () => ({
  ok: true,
  service: 'accounthub-api',
  persistence: persistence.status(),
  modules: ['journal-first-ledger','standard-coa','manual-journals','sales-subledger','purchase-subledger','bank-feeds','bank-reconciliation','ocr','mtd-vat','tenant-isolation','payroll-posting','tax-year-config','rti-validation','reports','documents','audit']
}));

server.get('/api/companies-house/search', async (request) => companiesHouse.searchCompanies(z.object({ q: z.string().min(2) }).parse(request.query).q));
server.get('/api/companies-house/company/:companyNumber', async (request) => companiesHouse.getCompanyBundle(z.object({ companyNumber: z.string().min(2) }).parse(request.params).companyNumber));
server.get('/api/tax-years', async () => taxYears.listConfigs());
server.get('/api/tax-years/:taxYear', async (request) => taxYears.getConfig(z.object({ taxYear: z.string() }).parse(request.params).taxYear));
server.get('/api/statutory-fixtures', async (request) => fixtures.list(z.object({ taxYear: z.string().optional() }).parse(request.query).taxYear));
server.get('/api/statutory-fixtures/readiness', async () => fixtures.certificationReadiness());

server.post('/api/employers/onboard', async (request) => employers.onboardEmployer(z.object({ legalName: z.string().min(2), tradingName: z.string().optional(), companyNumber: z.string().optional(), payeReference: z.string().optional(), accountsOfficeReference: z.string().optional(), payFrequency: z.enum(['weekly', 'fortnightly', 'four_weekly', 'monthly']) }).parse(request.body)));
server.post('/api/employees/starter-checklist', async (request) => employers.createStarterChecklist(z.object({ employeeId: z.string().min(1), declaration: z.enum(['A', 'B', 'C']), hasP45: z.boolean().default(false), studentLoanPlan: z.string().optional(), postgraduateLoan: z.boolean().optional() }).parse(request.body)));
server.post('/api/employees/p45', async (request) => employers.issueP45(z.object({ employeeId: z.string().min(1), leavingDate: z.string(), finalPayToDate: z.number(), finalTaxToDate: z.number(), taxCode: z.string() }).parse(request.body)));
server.post('/api/employees/p60', async (request) => employers.issueP60(z.object({ employeeId: z.string().min(1), taxYear: z.string(), taxablePay: z.number(), taxDeducted: z.number(), niContributions: z.number(), finalTaxCode: z.string() }).parse(request.body)));
server.post('/api/payroll/employer-payment-record', async (request) => employers.createEmployerPaymentRecord(z.object({ taxYear: z.string(), taxMonth: z.number().int().min(1).max(12), payeDue: z.number().default(0), employeeNiDue: z.number().default(0), employerNiDue: z.number().default(0), studentLoanDue: z.number().optional(), pensionDue: z.number().optional(), statutoryRecoveries: z.number().optional(), apprenticeshipLevyDue: z.number().optional() }).parse(request.body)));
server.post('/api/payroll/runs/preview', async (request) => payroll.previewRun(z.object({ grossPay: z.number(), taxCode: z.string(), niCategory: z.string(), pensionRate: z.number().default(0.05) }).parse(request.body)));

server.post('/api/rti/fps/validate', async (request) => rti.validateFps(z.object({ employer: z.object({ officeNumber: z.string().optional(), payeReference: z.string().optional(), accountsOfficeReference: z.string().optional(), taxYear: z.string() }), employees: z.array(z.object({ employeeId: z.string(), firstName: z.string().optional(), lastName: z.string().optional(), dateOfBirth: z.string().optional(), address: z.record(z.unknown()).optional(), niNumber: z.string().optional(), paymentDate: z.string(), taxablePay: z.number(), taxDeducted: z.number(), employeeNi: z.number(), employerNi: z.number(), starter: z.boolean().optional(), leaver: z.boolean().optional() })) }).parse(request.body)));
server.post('/api/rti/eps/validate', async (request) => rti.validateEps(z.object({ employer: z.object({ officeNumber: z.string().optional(), payeReference: z.string().optional(), accountsOfficeReference: z.string().optional(), taxYear: z.string() }), taxMonth: z.number().int(), noPaymentForPeriod: z.boolean().optional(), recoveries: z.record(z.number()).optional(), employmentAllowanceClaim: z.boolean().optional(), apprenticeshipLevy: z.number().optional() }).parse(request.body)));
server.post('/api/pensions/calculate', async (request) => pensions.calculate(z.object({ employeeId: z.string(), grossPay: z.number(), pensionablePay: z.number().optional(), employeeRate: z.number(), employerRate: z.number() }).parse(request.body)));
server.post('/api/pensions/export', async (request) => pensions.exportCsv(z.object({ rows: z.array(z.object({ employeeId: z.string(), employeeContribution: z.number(), employerContribution: z.number(), pensionablePay: z.number() })) }).parse(request.body).rows));

server.get('/api/bookkeeping/chart-template/uk-limited-company', async () => bookkeeping.ukLimitedCompanyChartTemplate());
server.post('/api/bookkeeping/transactions/classify', async (request) => bookkeeping.classifyTransaction(z.object({ transactionDate: z.string(), description: z.string(), amount: z.number().positive(), direction: z.enum(['money_in', 'money_out']), categoryCode: z.string(), bankAccountCode: z.string().optional(), vatCode: z.string().optional() }).parse(request.body)));
server.post('/api/subledgers/sales-invoices/posting-preview', async (request) => bookkeeping.postSalesInvoice(z.object({ invoiceNumber: z.string(), netAmount: z.number(), vatAmount: z.number().default(0), debtorAccount: z.string().optional(), salesAccount: z.string().optional(), vatAccount: z.string().optional() }).parse(request.body)));
server.post('/api/subledgers/purchase-bills/posting-preview', async (request) => bookkeeping.postPurchaseBill(z.object({ billNumber: z.string(), netAmount: z.number(), vatAmount: z.number().default(0), creditorAccount: z.string().optional(), expenseAccount: z.string(), vatAccount: z.string().optional() }).parse(request.body)));
server.post('/api/subledgers/payroll/posting-preview', async (request) => bookkeeping.postPayrollJournal(z.object({ grossWages: z.number(), employerNi: z.number(), employeePaye: z.number(), employeeNi: z.number(), employeePension: z.number(), employerPension: z.number(), netPay: z.number() }).parse(request.body)));

server.post('/api/ledger/journals/validate', async (request) => ledger.validateBalancedJournal(z.object({ description: z.string(), lines: z.array(journalLineSchema).min(2) }).parse(request.body)));
server.post('/api/ledger/journals/manual/prepare', async (request) => ledger.prepareManualJournal(z.object({ entityId: z.string().optional(), date: z.string().optional(), reference: z.string().optional(), description: z.string(), createdBy: z.string().optional(), lines: z.array(journalLineSchema).min(2) }).parse(request.body)));
server.post('/api/ledger/equation/verify', async (request) => ledger.verifyAccountingEquation(z.object({ accounts: z.array(accountBalanceSchema) }).parse(request.body).accounts));

server.post('/api/reports/trial-balance', async (request) => reporting.trialBalance(z.object({ accounts: z.array(accountBalanceSchema) }).parse(request.body).accounts));
server.post('/api/reports/profit-and-loss', async (request) => reporting.profitAndLoss(z.object({ accounts: z.array(accountBalanceSchema) }).parse(request.body).accounts));
server.post('/api/reports/balance-sheet', async (request) => reporting.balanceSheet(z.object({ accounts: z.array(accountBalanceSchema) }).parse(request.body).accounts));
server.post('/api/reports/balance-sheet/structured', async (request) => reporting.structuredBalanceSheet(z.object({ accounts: z.array(accountBalanceSchema) }).parse(request.body).accounts));
server.post('/api/reports/snapshots', async (request) => { const body = z.object({ entityId: z.string(), reportType: z.string(), periodStart: z.string(), periodEnd: z.string(), payload: z.record(z.unknown()) }).parse(request.body); return persistence.createReportSnapshot(body.entityId, body.reportType, body.periodStart, body.periodEnd, body.payload); });

server.get('/api/bank-feeds/:provider/blueprint', async (request) => bankFeeds.connectionBlueprint(z.object({ provider: z.enum(['truelayer', 'plaid', 'manual_csv']) }).parse(request.params).provider));
server.post('/api/bank-feeds/statement-lines/normalise', async (request) => bankFeeds.normaliseStatementLine(z.object({ id: z.string(), date: z.string(), description: z.string(), amount: z.number(), direction: z.enum(['money_in', 'money_out']), counterparty: z.string().optional() }).parse(request.body)));
server.post('/api/bank-reconciliation/suggest', async (request) => { const body = z.object({ line: z.object({ id: z.string(), date: z.string(), description: z.string(), amount: z.number(), direction: z.enum(['money_in', 'money_out']), counterparty: z.string().optional() }), candidates: z.array(z.object({ bankLineId: z.string(), targetType: z.enum(['sales_invoice', 'purchase_bill', 'journal', 'transfer']), targetId: z.string(), confidence: z.number(), reason: z.string() })) }).parse(request.body); return bankFeeds.suggestMatches(body.line, body.candidates); });

server.get('/api/ocr/:provider/blueprint', async (request) => ocr.extractionBlueprint(z.object({ provider: z.enum(['aws_textract', 'taggun', 'manual_upload']) }).parse(request.params).provider));
server.post('/api/ocr/receipts/parse', async (request) => ocr.parseReceipt(z.object({ provider: z.enum(['aws_textract', 'taggun', 'manual_upload']), fileName: z.string(), mimeType: z.string(), extractedText: z.string().optional() }).parse(request.body)));

server.get('/api/mtd/vat/readiness', async () => mtdVat.integrationReadiness());
server.post('/api/mtd/vat/returns/validate', async (request) => mtdVat.validateReturnBoxes(z.object({ box1: z.number(), box2: z.number().optional(), box3: z.number().optional(), box4: z.number(), box5: z.number(), box6: z.number(), box7: z.number(), box8: z.number().optional(), box9: z.number().optional() }).parse(request.body)));
server.post('/api/vat/returns/preview', async (request) => vat.previewReturn(z.object({ scheme: z.enum(['standard', 'flat_rate', 'cash']), taxableSales: z.number(), taxablePurchases: z.number(), flatRatePercent: z.number().optional() }).parse(request.body)));

server.get('/api/documents/templates', async () => documents.templates());
server.post('/api/documents', async (request) => documents.createRecord(z.object({ documentType: z.enum(['payslip', 'P45', 'P60', 'starter_checklist', 'employer_payment_record', 'profit_and_loss', 'balance_sheet', 'trial_balance']), entityId: z.string(), employeeId: z.string().optional(), taxYear: z.string().optional(), payload: z.record(z.unknown()) }).parse(request.body)));
server.post('/api/documents/persist', async (request) => { const body = z.object({ entityId: z.string(), documentType: z.string(), employeeId: z.string().optional(), taxYear: z.string().optional(), payload: z.record(z.unknown()) }).parse(request.body); return persistence.createStatutoryDocument(body.entityId, body.documentType, body.payload, body.employeeId, body.taxYear); });
server.post('/api/pdf/render', async (request) => pdf.renderQueuedPdfRecord(z.object({ template: z.string(), title: z.string(), payload: z.record(z.unknown()) }).parse(request.body)));
server.post('/api/audit-events', async (request) => { const body = z.object({ action: z.string(), metadata: z.record(z.unknown()), entityId: z.string().optional(), actorId: z.string().optional() }).parse(request.body); return persistence.createAuditEvent(body.action, body.metadata, body.entityId, body.actorId); });

await server.listen({ port: Number(process.env.PORT || 3000), host: '0.0.0.0' });

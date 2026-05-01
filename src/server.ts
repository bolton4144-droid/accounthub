import Fastify from 'fastify';
import cors from '@fastify/cors';
import { z } from 'zod';
import { CompaniesHouseClient } from './services/companies-house-client.js';
import { LedgerService } from './services/ledger-service.js';
import { PayrollService } from './services/payroll-service.js';
import { VatService } from './services/vat-service.js';

const server = Fastify({ logger: true });
await server.register(cors, { origin: true });

const companiesHouse = new CompaniesHouseClient(process.env.COMPANIES_HOUSE_API_KEY);
const ledger = new LedgerService();
const payroll = new PayrollService();
const vat = new VatService();

server.get('/health', async () => ({ ok: true, service: 'accounthub-api', modules: ['tenancy','companies-house','ledger','vat','payroll','hmrc','documents','audit'] }));
server.get('/api/companies-house/search', async (request) => companiesHouse.searchCompanies(z.object({ q: z.string().min(2) }).parse(request.query).q));
server.get('/api/companies-house/company/:companyNumber', async (request) => companiesHouse.getCompanyBundle(z.object({ companyNumber: z.string().min(2) }).parse(request.params).companyNumber));
server.post('/api/ledger/journals/validate', async (request) => ledger.validateBalancedJournal(z.object({ description: z.string(), lines: z.array(z.object({ accountCode: z.string(), debit: z.number().default(0), credit: z.number().default(0) })).min(2) }).parse(request.body)));
server.post('/api/payroll/runs/preview', async (request) => payroll.previewRun(z.object({ grossPay: z.number(), taxCode: z.string(), niCategory: z.string(), pensionRate: z.number().default(0.05) }).parse(request.body)));
server.post('/api/vat/returns/preview', async (request) => vat.previewReturn(z.object({ scheme: z.enum(['standard','flat_rate','cash']), taxableSales: z.number(), taxablePurchases: z.number(), flatRatePercent: z.number().optional() }).parse(request.body)));

await server.listen({ port: Number(process.env.PORT || 3000), host: '0.0.0.0' });

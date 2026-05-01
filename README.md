# AccountHub API

Backend foundation for the NexoryRole/AccountHub UK accounting and payroll suite.

## Product Surface

This repo now contains a serious multi-tenant backend foundation for:

- Practice and employer/client onboarding
- Companies House search/profile/officers/PSC/filing-history adapter
- Employer PAYE settings
- Employee records
- Employee starter checklist capture
- P45 leaver workflow
- P60 year-end workflow
- Employer PAYE payment records, including a `P30` alias for users who ask for that wording and a UK P32-style payment record concept
- Payroll run preview and statutory calculation boundary
- Double-entry ledger validation
- UK limited company Chart of Accounts template
- Cashbook bookkeeping classification into journals
- VAT return preview for Standard, Flat Rate and Cash Accounting schemes
- Trial balance
- Profit and loss
- Balance sheet
- Statutory/accounting document records and PDF template registry
- Immutable audit-event schema

## API Highlights

```text
GET  /health
GET  /api/companies-house/search?q=...
GET  /api/companies-house/company/:companyNumber
POST /api/employers/onboard
POST /api/employees/starter-checklist
POST /api/employees/p45
POST /api/employees/p60
POST /api/payroll/employer-payment-record
POST /api/payroll/runs/preview
GET  /api/bookkeeping/chart-template/uk-limited-company
POST /api/bookkeeping/transactions/classify
POST /api/ledger/journals/validate
POST /api/reports/trial-balance
POST /api/reports/profit-and-loss
POST /api/reports/balance-sheet
GET  /api/documents/templates
POST /api/documents
POST /api/vat/returns/preview
```

## Compliance Notes

HMRC guidance says employers must give employees a P60 at the end of each tax year and a P45 when they stop working. HMRC also uses the starter checklist when a new employee does not have a recent P45. This repo models those workflows, but production payroll calculations still need tax-year-specific HMRC threshold tables, test fixtures, RTI validation, pension-provider files and HMRC-recognised software testing before being sold as compliant payroll software.

## Companies House

The adapter uses the official Companies House REST API for company search, company profile, officers, persons with significant control and filing history.

Store `COMPANIES_HOUSE_API_KEY` as a Railway secret. Do not expose it to Vercel.

## Required Railway Variables

```env
DATABASE_URL=postgresql://...
COMPANIES_HOUSE_API_KEY=...
HMRC_CLIENT_ID=...
HMRC_CLIENT_SECRET=...
FIELD_ENCRYPTION_KEY=...
NODE_ENV=production
```

## Run locally

```bash
npm install
npm run dev
```

Health check:

```bash
curl http://localhost:3000/health
```

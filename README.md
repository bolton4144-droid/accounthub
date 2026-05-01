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
- Tax-year configuration registry
- Statutory fixture harness for payroll regression tests
- RTI FPS/EPS payload validation boundary
- Pension contribution calculation and CSV export
- PDF render queue boundary
- Database persistence wrapper for audit events, report snapshots and statutory documents
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
GET  /api/tax-years
GET  /api/tax-years/:taxYear
GET  /api/statutory-fixtures
GET  /api/statutory-fixtures/readiness
POST /api/employers/onboard
POST /api/employees/starter-checklist
POST /api/employees/p45
POST /api/employees/p60
POST /api/payroll/employer-payment-record
POST /api/payroll/runs/preview
POST /api/rti/fps/validate
POST /api/rti/eps/validate
POST /api/pensions/calculate
POST /api/pensions/export
GET  /api/bookkeeping/chart-template/uk-limited-company
POST /api/bookkeeping/transactions/classify
POST /api/ledger/journals/validate
POST /api/reports/trial-balance
POST /api/reports/profit-and-loss
POST /api/reports/balance-sheet
POST /api/reports/snapshots
GET  /api/documents/templates
POST /api/documents
POST /api/documents/persist
POST /api/pdf/render
POST /api/vat/returns/preview
POST /api/audit-events
```

## Compliance Notes

HMRC guidance says employers must give employees a P60 at the end of each tax year and a P45 when they stop working. HMRC also uses the starter checklist when a new employee does not have a recent P45. This repo models those workflows.

GOV.UK also says employers use payroll software to send a Full Payment Submission on or before payday, and EPS is used for no-payment periods, statutory pay recoveries, Employment Allowance, CIS deductions and Apprenticeship Levy adjustments. The `/api/rti/fps/validate` and `/api/rti/eps/validate` routes are validation boundaries, not live HMRC submission yet.

Before selling this as HMRC-certified payroll software, finish:

- HMRC developer app and test credentials
- HMRC-recognised RTI submission transport
- Exact tax-year PAYE/NIC/student loan/statutory pay tables
- HMRC-approved fixture packs and CI regression checks
- Pension provider file formats per provider
- Production PDF renderer and immutable document storage
- Real PostgreSQL persistence for every write route
- Security review for field-level encryption and audit retention

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

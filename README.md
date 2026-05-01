# AccountHub API

Backend foundation for the NexoryRole/AccountHub UK accounting and payroll suite.

## Ledger-First Rule

Every financial UI action must produce a journal entry. The backend enforces:

```text
Total debits = total credits
Assets = Liabilities + Equity + retained earnings movement
```

Manual journals, sales invoices, purchase bills, payroll runs and bank transactions all route through journal-preview or journal-validation boundaries before persistence.

## Product Surface

This repo now contains a serious multi-tenant backend foundation for:

- Standard UK limited-company Chart of Accounts with income, expenses, fixed assets, current assets, current liabilities, long-term liabilities and equity
- Manual journal preparation with date, reference, description, account picker-ready lines, debit/credit validation and tax codes
- Sales invoice posting previews into trade debtors, sales and VAT liability
- Purchase bill posting previews into expenses, input VAT and trade creditors
- Payroll journal posting previews into wages, employer NI, pension, PAYE/NI control and net wages payable
- Structured balance sheet sections: fixed assets, current assets, current liabilities, net current assets, long-term liabilities, capital and reserves
- Practice and employer/client onboarding
- Companies House search/profile/officers/PSC/filing-history adapter
- Employee starter checklist, P45 and P60 workflows
- Employer PAYE payment records, including a `P30` alias for users who ask for that wording and a UK P32-style payment record concept
- Tax-year configuration registry and statutory payroll fixture harness
- RTI FPS/EPS payload validation boundary
- Pension contribution calculation and CSV export
- Open Banking connection blueprints for TrueLayer/Plaid and bank reconciliation match suggestions
- OCR receipt extraction boundary for AWS Textract/Taggun/manual upload
- MTD VAT readiness and VAT return box validation
- PDF render queue boundary
- Database persistence wrapper for audit events, report snapshots and statutory documents

## API Highlights

```text
GET  /health
GET  /api/bookkeeping/chart-template/uk-limited-company
POST /api/ledger/journals/validate
POST /api/ledger/journals/manual/prepare
POST /api/ledger/equation/verify
POST /api/subledgers/sales-invoices/posting-preview
POST /api/subledgers/purchase-bills/posting-preview
POST /api/subledgers/payroll/posting-preview
POST /api/bookkeeping/transactions/classify
POST /api/reports/trial-balance
POST /api/reports/profit-and-loss
POST /api/reports/balance-sheet
POST /api/reports/balance-sheet/structured
GET  /api/bank-feeds/:provider/blueprint
POST /api/bank-feeds/statement-lines/normalise
POST /api/bank-reconciliation/suggest
GET  /api/ocr/:provider/blueprint
POST /api/ocr/receipts/parse
GET  /api/mtd/vat/readiness
POST /api/mtd/vat/returns/validate
GET  /api/companies-house/search?q=...
GET  /api/companies-house/company/:companyNumber
POST /api/employees/starter-checklist
POST /api/employees/p45
POST /api/employees/p60
POST /api/rti/fps/validate
POST /api/rti/eps/validate
```

## Completion Roadmap

1. Ledger: persist Chart of Accounts, manual journals and period locks.
2. Sub-ledgers: persist sales invoices and purchase bills that post journals automatically.
3. Bank: connect Open Banking provider tokens, import statement lines and build reconciliation workflows.
4. Reporting: persist report snapshots and export P&L, balance sheet and trial balance to PDF/Excel.
5. Payroll: run certified payroll calculations and post wages journals into the bookkeeping ledger.
6. Compliance: wire HMRC MTD VAT, RTI and ITSA credentials, fraud-prevention headers and submission evidence.

## Compliance Notes

HMRC guidance says employers must give employees a P60 at the end of each tax year and a P45 when they stop working. HMRC also uses the starter checklist when a new employee does not have a recent P45. This repo models those workflows.

GOV.UK also says employers use payroll software to send a Full Payment Submission on or before payday, and EPS is used for no-payment periods, statutory pay recoveries, Employment Allowance, CIS deductions and Apprenticeship Levy adjustments. The RTI routes are validation boundaries, not live HMRC submission yet.

Before selling this as HMRC-certified payroll software, finish HMRC developer credentials, RTI transport, approved fixture packs, pension-provider file formats, production PDF rendering, real PostgreSQL persistence for every write route, and field-level encryption review.

## Required Railway Variables

```env
DATABASE_URL=postgresql://...
COMPANIES_HOUSE_API_KEY=...
HMRC_CLIENT_ID=...
HMRC_CLIENT_SECRET=...
FIELD_ENCRYPTION_KEY=...
NODE_ENV=production
```

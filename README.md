# AccountHub API

Backend scaffold for the NexoryRole/AccountHub UK accounting and payroll suite.

## Modules

- `tenancy`: practices, users, RBAC and client entity isolation.
- `companies-house`: company search, profile, officers, PSC and filing history sync.
- `ledger`: Chart of Accounts, double-entry journals, balanced posting checks and period locks.
- `vat`: Standard, Flat Rate and Cash Accounting schemes with MTD-ready periods.
- `payroll`: employees, payroll runs, PAYE/NIC/pension calculation pipeline and RTI submission staging.
- `hmrc`: OAuth token vaulting and MTD VAT/ITSA adapter boundary.
- `documents`: payslip, P&L, balance sheet and evidence pack generation boundary.
- `audit`: immutable event capture for compliance actions.

## Companies House

The adapter uses the official Companies House REST API for company search, company profile, officers, persons with significant control and filing history.

Store `COMPANIES_HOUSE_API_KEY` as a Railway secret. Do not expose it to Vercel.

## Run locally

```bash
npm install
npm run dev
```

Health check:

```bash
curl http://localhost:3000/health
```

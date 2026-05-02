# Phase 3 Payroll Depth

Phase 3 adds the commercial payroll layer needed before any HMRC-certified filing work can be attempted.

## What This Adds

- Employer pay calendars and tax-period status tracking
- Pay elements for earnings, deductions, statutory payments, benefits and employer costs
- Employee validation results for payroll readiness and RTI readiness
- Pension assessment output and pension export contract shape
- P32-style employer liability summaries
- Payslip data contracts and statutory document inputs

## Live API Contracts

```text
GET /api/payroll/employers/:employerId/workbench
GET /api/payroll/employers/:employerId/pay-calendar
GET /api/payroll/pay-elements
GET /api/payroll/employees/:employeeId/validation
GET /api/payroll/employees/:employeeId/pension-assessment
GET /api/payroll/employees/:employeeId/payslip-preview
GET /api/payroll/employers/:employerId/p32-summary
GET /api/payroll/employers/:employerId/rti-readiness
```

## Compliance Boundary

These endpoints are deliberately calculation and readiness contracts, not a claim of HMRC certification. Live RTI submission remains gated until real credentials, HMRC recognition/certification evidence, fraud-prevention validation, pension-provider export fixtures and statutory tax-year test fixtures are in place.

## Database Contract

`backend/database/phase3_payroll_depth.sql` introduces:

- `payroll_calendars`
- `payroll_calendar_periods`
- `payroll_pay_elements`
- `employee_pay_assignments`
- `payroll_validation_results`
- `payroll_employer_liability_summaries`

Each table is tenant scoped and has row-level security policy definitions.

# Phase 2 Persistence Foundation

Phase 2 starts the move from demo-memory behavior to commercial-grade durable persistence.

## Goal

Accountancy and payroll software must preserve every write, lock closed periods, isolate tenants, and create an audit trail that survives deploys. This phase adds the repository and migration contract before switching the live routes to real database writes.

## Live Contracts

```text
GET /api/platform/persistence-status
GET /api/platform/seed-blueprint
GET /api/platform/migration-runbook
GET /api/platform/database-contract
```

## Migration Files

```text
backend/database/phase1_foundation.sql
backend/database/phase2_persistence.sql
```

`phase2_persistence.sql` adds:

- `schema_migrations`
- `period_locks`
- `repository_write_receipts`
- `encrypted_field_registry`
- row-level security policies for the new tenant-scoped operational tables

## Repository Priority

The first routes to migrate to PostgreSQL repositories are:

1. `POST /api/practice/clients`
2. `POST /api/payroll/employers`
3. `POST /api/payroll/employers/:employerId/employees`
4. `PUT /api/payroll/employers/:id/details`
5. `POST /api/ledger/journals/post`
6. `POST /api/documents`
7. `POST /api/audit-events`

## Production Gates

- `DATABASE_URL` must be configured before PostgreSQL writes are enabled.
- `FIELD_ENCRYPTION_KEY` must be configured before real payroll PII is stored.
- Row-level security must be enabled and tested before using the service with multiple real clients.
- Period locks must be enforced before final accounts, payroll submissions or VAT submissions can be treated as production records.

## Next Engineering Step

Create a repository module that accepts the request context, sets `app.current_practice_id`, writes to PostgreSQL inside transactions, and emits `repository_write_receipts` for every committed write.

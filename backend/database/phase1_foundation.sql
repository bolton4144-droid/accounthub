-- AccountHub / NexoryRole Phase 1 foundation schema
-- PostgreSQL contract for multi-tenant UK accounting and payroll.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS practices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  brand_color TEXT NOT NULL DEFAULT '#579a76',
  white_label_domain TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email CITEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  password_hash TEXT,
  mfa_enabled BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS practice_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner','practice_admin','accountant','payroll_manager','bookkeeper','client_viewer','auditor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (practice_id, user_id)
);

CREATE TABLE IF NOT EXISTS business_entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  legal_name TEXT NOT NULL,
  trading_name TEXT,
  entity_type TEXT NOT NULL DEFAULT 'limited_company',
  company_number TEXT,
  company_status TEXT,
  companies_house_synced_at TIMESTAMPTZ,
  utr_encrypted BYTEA,
  vat_number_encrypted BYTEA,
  paye_reference_encrypted BYTEA,
  accounts_office_reference_encrypted BYTEA,
  vat_scheme TEXT NOT NULL DEFAULT 'standard' CHECK (vat_scheme IN ('standard','cash','flat_rate','exempt')),
  financial_year_start DATE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (practice_id, company_number)
);

CREATE TABLE IF NOT EXISTS employer_payroll_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES business_entities(id) ON DELETE CASCADE,
  pay_frequency TEXT NOT NULL DEFAULT 'monthly',
  rti_enabled BOOLEAN NOT NULL DEFAULT false,
  rti_batch BOOLEAN NOT NULL DEFAULT false,
  pension_provider TEXT,
  pension_employer_ref_encrypted BYTEA,
  minimum_wage_warning BOOLEAN NOT NULL DEFAULT true,
  apprenticeship_levy_allowance NUMERIC(12,2) NOT NULL DEFAULT 15000,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_id)
);

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES business_entities(id) ON DELETE CASCADE,
  payroll_id TEXT NOT NULL,
  first_name_encrypted BYTEA NOT NULL,
  last_name_encrypted BYTEA NOT NULL,
  date_of_birth_encrypted BYTEA,
  address_encrypted BYTEA,
  email_encrypted BYTEA,
  bank_details_encrypted BYTEA,
  ni_number_encrypted BYTEA,
  tax_code TEXT NOT NULL DEFAULT '1257L',
  ni_category TEXT NOT NULL DEFAULT 'A',
  starter_statement TEXT CHECK (starter_statement IN ('A','B','C')),
  student_loan_plan TEXT,
  postgraduate_loan BOOLEAN NOT NULL DEFAULT false,
  pension_status TEXT NOT NULL DEFAULT 'eligible',
  annual_salary NUMERIC(12,2),
  hourly_rate NUMERIC(12,2),
  start_date DATE,
  leave_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_id, payroll_id)
);

CREATE TABLE IF NOT EXISTS employee_starter_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES business_entities(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  declaration TEXT NOT NULL CHECK (declaration IN ('A','B','C')),
  has_p45 BOOLEAN NOT NULL DEFAULT false,
  previous_employer_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
  previous_employer_tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  right_to_work_checked_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chart_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES business_entities(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset','liability','equity','income','expense')),
  report_section TEXT NOT NULL,
  category TEXT,
  system_account BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_id, code)
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES business_entities(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_id UUID,
  reference TEXT,
  description TEXT NOT NULL,
  accounting_date DATE NOT NULL,
  created_by UUID REFERENCES users(id),
  posted_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS journal_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES business_entities(id) ON DELETE CASCADE,
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES chart_accounts(id),
  debit NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  tax_code TEXT,
  narrative TEXT,
  CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))
);

CREATE TABLE IF NOT EXISTS payroll_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES business_entities(id) ON DELETE CASCADE,
  tax_year TEXT NOT NULL,
  tax_period INTEGER NOT NULL CHECK (tax_period BETWEEN 1 AND 56),
  period_start DATE,
  period_end DATE,
  payment_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  gross_pay_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  paye_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  employee_ni_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  employer_ni_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  pension_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_pay_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  journal_entry_id UUID REFERENCES journal_entries(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payslips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES business_entities(id) ON DELETE CASCADE,
  payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  gross_pay NUMERIC(14,2) NOT NULL,
  paye_tax NUMERIC(14,2) NOT NULL DEFAULT 0,
  employee_ni NUMERIC(14,2) NOT NULL DEFAULT 0,
  employer_ni NUMERIC(14,2) NOT NULL DEFAULT 0,
  employee_pension NUMERIC(14,2) NOT NULL DEFAULT 0,
  employer_pension NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_pay NUMERIC(14,2) NOT NULL,
  ytd_values JSONB NOT NULL DEFAULT '{}',
  pdf_object_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES business_entities(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE,
  net_amount NUMERIC(14,2) NOT NULL,
  vat_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  gross_amount NUMERIC(14,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  journal_entry_id UUID REFERENCES journal_entries(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS purchase_bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES business_entities(id) ON DELETE CASCADE,
  bill_number TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  bill_date DATE NOT NULL,
  due_date DATE,
  net_amount NUMERIC(14,2) NOT NULL,
  vat_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  gross_amount NUMERIC(14,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  journal_entry_id UUID REFERENCES journal_entries(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_id, bill_number)
);

CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES business_entities(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'manual',
  provider_account_id TEXT,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  token_encrypted BYTEA,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bank_statement_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES business_entities(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  provider_line_id TEXT,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  counterparty TEXT,
  amount NUMERIC(14,2) NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('money_in','money_out')),
  reconciliation_status TEXT NOT NULL DEFAULT 'unmatched',
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bank_account_id, provider_line_id)
);

CREATE TABLE IF NOT EXISTS vat_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES business_entities(id) ON DELETE CASCADE,
  scheme TEXT NOT NULL CHECK (scheme IN ('standard','cash','flat_rate')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'open',
  box_values JSONB,
  submitted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS statutory_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES business_entities(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id),
  document_type TEXT NOT NULL,
  tax_year TEXT,
  document_data JSONB NOT NULL DEFAULT '{}',
  pdf_object_key TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS integration_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES business_entities(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'credentials_required',
  access_token_encrypted BYTEA,
  refresh_token_encrypted BYTEA,
  expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practice_id UUID REFERENCES practices(id) ON DELETE SET NULL,
  entity_id UUID REFERENCES business_entities(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  request_id TEXT,
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_entities_practice ON business_entities(practice_id);
CREATE INDEX IF NOT EXISTS idx_employees_entity ON employees(entity_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_entity_date ON journal_entries(entity_id, accounting_date);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_entity_period ON payroll_runs(entity_id, tax_year, tax_period);
CREATE INDEX IF NOT EXISTS idx_documents_entity_type ON statutory_documents(entity_id, document_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_scope ON audit_events(practice_id, entity_id, created_at DESC);

ALTER TABLE practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_statement_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE vat_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE statutory_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Application connections should SET app.current_practice_id before queries.
CREATE POLICY tenant_practices ON practices USING (id::text = current_setting('app.current_practice_id', true));
CREATE POLICY tenant_entities ON business_entities USING (practice_id::text = current_setting('app.current_practice_id', true));
CREATE POLICY tenant_employees ON employees USING (practice_id::text = current_setting('app.current_practice_id', true));
CREATE POLICY tenant_journal_entries ON journal_entries USING (practice_id::text = current_setting('app.current_practice_id', true));
CREATE POLICY tenant_journal_lines ON journal_lines USING (practice_id::text = current_setting('app.current_practice_id', true));
CREATE POLICY tenant_payroll_runs ON payroll_runs USING (practice_id::text = current_setting('app.current_practice_id', true));
CREATE POLICY tenant_payslips ON payslips USING (practice_id::text = current_setting('app.current_practice_id', true));
CREATE POLICY tenant_statutory_documents ON statutory_documents USING (practice_id::text = current_setting('app.current_practice_id', true));
CREATE POLICY tenant_audit_events ON audit_events USING (practice_id::text = current_setting('app.current_practice_id', true));

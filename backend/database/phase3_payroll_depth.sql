-- AccountHub / NexoryRole Phase 3 payroll depth contract
-- Adds commercial payroll tables that sit between employee records and certified RTI filing.

CREATE TABLE IF NOT EXISTS payroll_calendars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES business_entities(id) ON DELETE CASCADE,
  employer_id UUID NOT NULL REFERENCES employer_payroll_settings(id) ON DELETE CASCADE,
  tax_year TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly','fortnightly','four_weekly','monthly','quarterly','annual')),
  current_period INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employer_id, tax_year, frequency)
);

CREATE TABLE IF NOT EXISTS payroll_calendar_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  payroll_calendar_id UUID NOT NULL REFERENCES payroll_calendars(id) ON DELETE CASCADE,
  period_number INTEGER NOT NULL,
  period_name TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  pay_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','processing','locked','submitted')),
  UNIQUE (payroll_calendar_id, period_number)
);

CREATE TABLE IF NOT EXISTS payroll_pay_elements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('earning','deduction','statutory_payment','benefit','reimbursement','employer_cost')),
  taxable BOOLEAN NOT NULL DEFAULT false,
  niable BOOLEAN NOT NULL DEFAULT false,
  pensionable BOOLEAN NOT NULL DEFAULT false,
  default_account_id UUID REFERENCES chart_accounts(id),
  UNIQUE (practice_id, code)
);

CREATE TABLE IF NOT EXISTS employee_pay_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  pay_element_id UUID NOT NULL REFERENCES payroll_pay_elements(id),
  amount NUMERIC(14,2),
  rate NUMERIC(14,4),
  quantity NUMERIC(14,4),
  effective_from DATE NOT NULL,
  effective_to DATE,
  UNIQUE (employee_id, pay_element_id, effective_from)
);

CREATE TABLE IF NOT EXISTS payroll_validation_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  employer_id UUID NOT NULL REFERENCES employer_payroll_settings(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  validation_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info','warning','error','blocker')),
  code TEXT NOT NULL,
  message TEXT NOT NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payroll_employer_liability_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  employer_id UUID NOT NULL REFERENCES employer_payroll_settings(id) ON DELETE CASCADE,
  tax_year TEXT NOT NULL,
  period_name TEXT NOT NULL,
  paye NUMERIC(14,2) NOT NULL DEFAULT 0,
  employee_nic NUMERIC(14,2) NOT NULL DEFAULT 0,
  employer_nic NUMERIC(14,2) NOT NULL DEFAULT 0,
  student_loan NUMERIC(14,2) NOT NULL DEFAULT 0,
  statutory_recovery NUMERIC(14,2) NOT NULL DEFAULT 0,
  apprenticeship_levy NUMERIC(14,2) NOT NULL DEFAULT 0,
  cis_deductions_suffered NUMERIC(14,2) NOT NULL DEFAULT 0,
  gross_due_to_hmrc NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','reviewed','locked','submitted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employer_id, tax_year, period_name)
);

ALTER TABLE payroll_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_calendar_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_pay_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_pay_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_validation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_employer_liability_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_payroll_calendars ON payroll_calendars
  USING (practice_id::text = current_setting('app.current_practice_id', true));

CREATE POLICY tenant_calendar_periods ON payroll_calendar_periods
  USING (practice_id::text = current_setting('app.current_practice_id', true));

CREATE POLICY tenant_pay_elements ON payroll_pay_elements
  USING (practice_id::text = current_setting('app.current_practice_id', true));

CREATE POLICY tenant_pay_assignments ON employee_pay_assignments
  USING (practice_id::text = current_setting('app.current_practice_id', true));

CREATE POLICY tenant_payroll_validation ON payroll_validation_results
  USING (practice_id::text = current_setting('app.current_practice_id', true));

CREATE POLICY tenant_employer_liabilities ON payroll_employer_liability_summaries
  USING (practice_id::text = current_setting('app.current_practice_id', true));

INSERT INTO schema_migrations (version, description)
VALUES ('003_phase3_payroll_depth', 'Add payroll calendars, pay elements, validation results and employer liability summaries')
ON CONFLICT (version) DO NOTHING;

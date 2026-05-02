-- AccountHub / NexoryRole Phase 2 persistence migration contract
-- Adds operational tables needed before repository-backed writes are enabled.

CREATE TABLE IF NOT EXISTS schema_migrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checksum TEXT
);

CREATE TABLE IF NOT EXISTS period_locks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES business_entities(id) ON DELETE CASCADE,
  lock_type TEXT NOT NULL CHECK (lock_type IN ('accounting','payroll','vat','year_end')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  locked_by UUID REFERENCES users(id),
  locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT,
  UNIQUE (entity_id, lock_type, period_start, period_end)
);

CREATE TABLE IF NOT EXISTS repository_write_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES business_entities(id) ON DELETE SET NULL,
  request_id TEXT NOT NULL,
  route TEXT NOT NULL,
  repository TEXT NOT NULL,
  operation TEXT NOT NULL,
  source_id TEXT,
  committed BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  payload_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS encrypted_field_registry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  column_name TEXT NOT NULL,
  data_classification TEXT NOT NULL CHECK (data_classification IN ('payroll_pii','tax_identifier','bank_detail','hmrc_token','commercial_secret')),
  encryption_required BOOLEAN NOT NULL DEFAULT true,
  rotation_policy TEXT NOT NULL DEFAULT 'annual_or_incident',
  UNIQUE (table_name, column_name)
);

INSERT INTO encrypted_field_registry (table_name, column_name, data_classification)
VALUES
  ('business_entities','utr_encrypted','tax_identifier'),
  ('business_entities','vat_number_encrypted','tax_identifier'),
  ('business_entities','paye_reference_encrypted','tax_identifier'),
  ('business_entities','accounts_office_reference_encrypted','tax_identifier'),
  ('employees','first_name_encrypted','payroll_pii'),
  ('employees','last_name_encrypted','payroll_pii'),
  ('employees','date_of_birth_encrypted','payroll_pii'),
  ('employees','address_encrypted','payroll_pii'),
  ('employees','email_encrypted','payroll_pii'),
  ('employees','bank_details_encrypted','bank_detail'),
  ('employees','ni_number_encrypted','payroll_pii'),
  ('integration_connections','access_token_encrypted','hmrc_token'),
  ('integration_connections','refresh_token_encrypted','hmrc_token')
ON CONFLICT (table_name, column_name) DO NOTHING;

INSERT INTO schema_migrations (version, description)
VALUES
  ('001_phase1_foundation', 'Create multi-tenant accounting and payroll foundation'),
  ('002_phase2_persistence', 'Add migration ledger, period locks, write receipts and encrypted-field registry')
ON CONFLICT (version) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_period_locks_scope ON period_locks(practice_id, entity_id, lock_type, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_write_receipts_scope ON repository_write_receipts(practice_id, entity_id, created_at DESC);

ALTER TABLE period_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE repository_write_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_period_locks ON period_locks
  USING (practice_id::text = current_setting('app.current_practice_id', true));

CREATE POLICY tenant_write_receipts ON repository_write_receipts
  USING (practice_id::text = current_setting('app.current_practice_id', true));

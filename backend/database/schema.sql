-- Database Schema for Accounting System
-- PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL DEFAULT 'user', -- 'admin', 'accountant', 'user'
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Companies table
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    company_number VARCHAR(50) UNIQUE,
    vat_number VARCHAR(50),
    utr VARCHAR(50), -- Unique Taxpayer Reference
    paye_reference VARCHAR(50),
    company_type VARCHAR(100), -- 'ltd', 'plc', 'llp', 'sole_trader'
    industry VARCHAR(100),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    postcode VARCHAR(20),
    country VARCHAR(100) DEFAULT 'United Kingdom',
    incorporation_date DATE,
    year_end DATE,
    vat_scheme VARCHAR(50), -- 'standard', 'flat_rate', 'cash_accounting'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- HMRC connections table
CREATE TABLE hmrc_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    access_token TEXT,
    refresh_token TEXT,
    token_type VARCHAR(50),
    expires_at TIMESTAMP,
    scopes TEXT[],
    is_connected BOOLEAN DEFAULT false,
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employees table
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    ni_number VARCHAR(20), -- National Insurance Number
    date_of_birth DATE,
    start_date DATE NOT NULL,
    end_date DATE,
    job_title VARCHAR(255),
    department VARCHAR(100),
    employment_status VARCHAR(50), -- 'full_time', 'part_time', 'contractor'
    gross_salary DECIMAL(15, 2),
    payment_frequency VARCHAR(50), -- 'monthly', 'weekly', 'fortnightly'
    tax_code VARCHAR(20),
    student_loan_plan VARCHAR(10), -- 'plan_1', 'plan_2', 'postgrad'
    pension_scheme_id UUID,
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(20),
    bank_sort_code VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payroll runs table
CREATE TABLE payroll_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    tax_year VARCHAR(10), -- '2024/25'
    tax_month INTEGER, -- 1-12
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    payment_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'calculated', 'approved', 'paid', 'submitted'
    total_gross DECIMAL(15, 2),
    total_tax DECIMAL(15, 2),
    total_ni_employee DECIMAL(15, 2),
    total_ni_employer DECIMAL(15, 2),
    total_net DECIMAL(15, 2),
    total_pension_employee DECIMAL(15, 2),
    total_pension_employer DECIMAL(15, 2),
    submitted_to_hmrc BOOLEAN DEFAULT false,
    hmrc_submission_id VARCHAR(255),
    submitted_at TIMESTAMP,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payslips table
CREATE TABLE payslips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    gross_pay DECIMAL(15, 2) NOT NULL,
    taxable_pay DECIMAL(15, 2),
    tax DECIMAL(15, 2),
    ni_employee DECIMAL(15, 2),
    ni_employer DECIMAL(15, 2),
    student_loan DECIMAL(15, 2) DEFAULT 0,
    pension_employee DECIMAL(15, 2) DEFAULT 0,
    pension_employer DECIMAL(15, 2) DEFAULT 0,
    net_pay DECIMAL(15, 2),
    ytd_gross DECIMAL(15, 2), -- Year to date
    ytd_tax DECIMAL(15, 2),
    ytd_ni DECIMAL(15, 2),
    payment_method VARCHAR(50) DEFAULT 'bank_transfer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chart of Accounts
CREATE TABLE chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL, -- 'asset', 'liability', 'equity', 'revenue', 'expense'
    category VARCHAR(100), -- 'current_asset', 'fixed_asset', 'operating_expense', etc.
    parent_id UUID REFERENCES chart_of_accounts(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(50), -- 'invoice', 'bill', 'expense', 'payment', 'receipt'
    reference VARCHAR(100),
    description TEXT,
    contact_name VARCHAR(255),
    contact_id UUID,
    total_amount DECIMAL(15, 2) NOT NULL,
    tax_amount DECIMAL(15, 2) DEFAULT 0,
    net_amount DECIMAL(15, 2),
    currency VARCHAR(10) DEFAULT 'GBP',
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'overdue', 'void'
    due_date DATE,
    paid_date DATE,
    attachment_url TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transaction lines (double-entry bookkeeping)
CREATE TABLE transaction_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    account_id UUID REFERENCES chart_of_accounts(id),
    description TEXT,
    debit DECIMAL(15, 2) DEFAULT 0,
    credit DECIMAL(15, 2) DEFAULT 0,
    tax_rate DECIMAL(5, 2),
    tax_amount DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- VAT returns table
CREATE TABLE vat_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    period_key VARCHAR(10), -- e.g., '24A1' for first quarter 2024
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    due_date DATE NOT NULL,
    vat_due_sales DECIMAL(15, 2) DEFAULT 0, -- Box 1
    vat_due_acquisitions DECIMAL(15, 2) DEFAULT 0, -- Box 2
    total_vat_due DECIMAL(15, 2) DEFAULT 0, -- Box 3
    vat_reclaimed DECIMAL(15, 2) DEFAULT 0, -- Box 4
    net_vat_due DECIMAL(15, 2) DEFAULT 0, -- Box 5
    total_value_sales DECIMAL(15, 2) DEFAULT 0, -- Box 6
    total_value_purchases DECIMAL(15, 2) DEFAULT 0, -- Box 7
    total_value_goods_supplied DECIMAL(15, 2) DEFAULT 0, -- Box 8
    total_acquisitions DECIMAL(15, 2) DEFAULT 0, -- Box 9
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'calculated', 'submitted', 'accepted'
    submitted_to_hmrc BOOLEAN DEFAULT false,
    submission_receipt VARCHAR(255),
    submitted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Corporation Tax returns
CREATE TABLE corporation_tax_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    accounting_period_start DATE NOT NULL,
    accounting_period_end DATE NOT NULL,
    due_date DATE NOT NULL,
    turnover DECIMAL(15, 2) DEFAULT 0,
    total_expenses DECIMAL(15, 2) DEFAULT 0,
    profit_before_tax DECIMAL(15, 2) DEFAULT 0,
    tax_rate DECIMAL(5, 2) DEFAULT 19.00,
    tax_payable DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft',
    submitted_to_hmrc BOOLEAN DEFAULT false,
    submitted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bank accounts
CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    account_name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(255),
    account_number VARCHAR(50),
    sort_code VARCHAR(20),
    iban VARCHAR(50),
    currency VARCHAR(10) DEFAULT 'GBP',
    current_balance DECIMAL(15, 2) DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bank transactions
CREATE TABLE bank_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id),
    transaction_date DATE NOT NULL,
    description TEXT,
    reference VARCHAR(100),
    amount DECIMAL(15, 2) NOT NULL,
    balance DECIMAL(15, 2),
    is_reconciled BOOLEAN DEFAULT false,
    reconciled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit log
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    company_id UUID REFERENCES companies(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    changes JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_companies_owner ON companies(owner_id);
CREATE INDEX idx_employees_company ON employees(company_id);
CREATE INDEX idx_payroll_runs_company ON payroll_runs(company_id);
CREATE INDEX idx_payslips_payroll ON payslips(payroll_run_id);
CREATE INDEX idx_payslips_employee ON payslips(employee_id);
CREATE INDEX idx_transactions_company ON transactions(company_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transaction_lines_transaction ON transaction_lines(transaction_id);
CREATE INDEX idx_vat_returns_company ON vat_returns(company_id);
CREATE INDEX idx_bank_transactions_account ON bank_transactions(bank_account_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_company ON audit_logs(company_id);

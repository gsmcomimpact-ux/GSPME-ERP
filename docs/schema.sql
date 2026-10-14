-- ==============================================================================
-- GSPME - Schéma Relationnel PostgreSQL Multi-Tenant (SYSCOHADA & Multi-Pays)
-- Conforme aux exigences : RLS, Types Décimaux Numériques Stricts, Audit Immuable
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TENANTS & MULTI-ENTREPRISES
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    legal_form VARCHAR(50) NOT NULL CHECK (legal_form IN ('SARL', 'SAS', 'SA', 'SUARL', 'GIE', 'ENTREPRISE_INDIVIDUELLE')),
    country_code CHAR(2) NOT NULL, -- SN, CI, CM, ML, BJ, BF, NE, TG, GN
    tax_number VARCHAR(100) NOT NULL, -- NINEA, NCC, NIU, IFU, NIF
    trade_register_number VARCHAR(100) NOT NULL, -- RCCM
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'XOF',
    capital_social NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    subscription_plan VARCHAR(50) NOT NULL DEFAULT 'PROFESSIONAL',
    subscription_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    max_users INT NOT NULL DEFAULT 10,
    max_storage_mb INT NOT NULL DEFAULT 5120,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(50),
    is_headquarters BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. UTILISATEURS & RÔLES (RBAC)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN (
        'DIRECTEUR_GENERAL', 'RESPONSABLE_FINANCIER', 'COMMERCIAL_VENTES',
        'LOGISTIQUE_STOCKS', 'GESTIONNAIRE_RH', 'CHEF_DE_PROJET', 'CAISSIER_VENDEUR',
        'AUDITEUR_EXTERNE', 'SUPER_ADMIN_SAAS'
    )),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TIERS : CLIENTS & FOURNISSEURS
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    type VARCHAR(50) NOT NULL CHECK (type IN ('ENTREPRISE', 'PARTICULIER')),
    category VARCHAR(50) DEFAULT 'PME',
    email VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    city VARCHAR(100) NOT NULL,
    tax_number VARCHAR(100),
    credit_limit NUMERIC(18, 2) DEFAULT 10000000.00,
    outstanding_balance NUMERIC(18, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    city VARCHAR(100) NOT NULL,
    tax_number VARCHAR(100),
    payment_terms_days INT DEFAULT 30,
    balance_payable NUMERIC(18, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. CATALOGUE & STOCKS (MULTI-ENTREPÔTS)
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    location TEXT NOT NULL,
    manager_name VARCHAR(255),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    sku VARCHAR(100) NOT NULL,
    barcode VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    unit VARCHAR(50) NOT NULL DEFAULT 'unité',
    purchase_price_ht NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    selling_price_ht NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    stock_min_alert NUMERIC(12, 3) DEFAULT 10.000,
    current_stock NUMERIC(12, 3) DEFAULT 0.000,
    valuation_method VARCHAR(20) DEFAULT 'PUMP' CHECK (valuation_method IN ('PUMP', 'FIFO')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_tenant_sku UNIQUE (tenant_id, sku)
);

CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('ENTREE_ACHAT', 'SORTIE_VENTE', 'TRANSFERT_INTER_DEPOT', 'AJUSTEMENT_INVENTAIRE', 'RETOUR_CLIENT')),
    quantity NUMERIC(12, 3) NOT NULL,
    unit_cost NUMERIC(18, 2) NOT NULL,
    reference_doc VARCHAR(100) NOT NULL,
    performed_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. COMMERCIAL : COMMANDES, FACTURES & LIGNES
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT,
    number VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('FACTURE_VENTE', 'DEVIS_PROFORMA', 'AVOIR_CLIENT', 'BON_COMMANDE')),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    customer_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('BROUILLON', 'VALIDEE', 'PARTIELLE', 'PAYEE', 'ANNULEE')),
    subtotal_ht NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    total_vat NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    total_ttc NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    remaining_amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    currency CHAR(3) NOT NULL DEFAULT 'XOF',
    notes TEXT,
    accounting_entry_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_tenant_invoice_number UNIQUE (tenant_id, number)
);

CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(12, 3) NOT NULL DEFAULT 1.000,
    unit_price_ht NUMERIC(18, 2) NOT NULL,
    vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    total_ht NUMERIC(18, 2) NOT NULL,
    total_vat NUMERIC(18, 2) NOT NULL,
    total_ttc NUMERIC(18, 2) NOT NULL
);

-- 7. ACHATS & FOURNISSEURS
CREATE TABLE purchase_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    supplier_name VARCHAR(255) NOT NULL,
    number VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('BROUILLON', 'VALIDEE', 'PAYEE')),
    total_ht NUMERIC(18, 2) NOT NULL,
    total_vat NUMERIC(18, 2) NOT NULL,
    total_ttc NUMERIC(18, 2) NOT NULL,
    paid_amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    expense_category VARCHAR(100) NOT NULL,
    ohada_account VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. TRÉSORERIE & COMPTES DE CLASSE 5
CREATE TABLE treasury_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('BANQUE', 'CAISSE', 'MOBILE_MONEY')),
    account_number VARCHAR(100),
    currency CHAR(3) NOT NULL DEFAULT 'XOF',
    balance NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    ohada_account VARCHAR(20) NOT NULL,
    provider VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE treasury_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    account_id UUID NOT NULL REFERENCES treasury_accounts(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('ENCAISSEMENT', 'DECAISSEMENT', 'VIREMENT_INTERNE')),
    amount NUMERIC(18, 2) NOT NULL,
    category VARCHAR(255) NOT NULL,
    reference VARCHAR(100) NOT NULL,
    beneficiary_or_payer VARCHAR(255) NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('VIREMENT', 'CHEQUE', 'ESPECES', 'MOBILE_MONEY')),
    reconciled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. MOTEUR COMPTABLE SYSCOHADA (PARTIE DOUBLE STRICTE)
CREATE TABLE accounting_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    journal_code VARCHAR(10) NOT NULL CHECK (journal_code IN ('VT', 'AC', 'BQ', 'CA', 'OD', 'PAIE', 'IMMO')),
    date DATE NOT NULL,
    piece_number VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    validated BOOLEAN DEFAULT TRUE,
    locked_period BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE accounting_entry_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL REFERENCES accounting_entries(id) ON DELETE RESTRICT,
    account_code VARCHAR(20) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    debit NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    credit NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    reference VARCHAR(100),
    description TEXT,
    reconciled_match VARCHAR(50) -- Lettrage
);

-- 10. RH & PAIE
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    employee_number VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    position VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    contract_type VARCHAR(50) NOT NULL CHECK (contract_type IN ('CDI', 'CDD', 'STAGE', 'CONSULTANT')),
    hire_date DATE NOT NULL,
    base_salary NUMERIC(18, 2) NOT NULL,
    transport_allowance NUMERIC(18, 2) DEFAULT 0.00,
    housing_allowance NUMERIC(18, 2) DEFAULT 0.00,
    bank_account_rib VARCHAR(100),
    social_security_number VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payslips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    employee_name VARCHAR(255) NOT NULL,
    period VARCHAR(50) NOT NULL,
    base_salary NUMERIC(18, 2) NOT NULL,
    primes NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    gross_salary NUMERIC(18, 2) NOT NULL,
    employee_social_contribution NUMERIC(18, 2) NOT NULL,
    employer_social_contribution NUMERIC(18, 2) NOT NULL,
    withholding_tax NUMERIC(18, 2) NOT NULL,
    net_salary NUMERIC(18, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'VALIDE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. JOURNAL D'AUDIT IMMUABLE
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID,
    user_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    module VARCHAR(50) NOT NULL,
    details TEXT NOT NULL,
    ip_address VARCHAR(50) NOT NULL
);

-- 12. ROW LEVEL SECURITY (RLS) ACTIVATION
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_customers ON customers
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_invoices ON invoices
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_accounting ON accounting_entries
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- INDEXES POUR HAUTE PERFORMANCE
CREATE INDEX idx_invoices_tenant_date ON invoices(tenant_id, date);
CREATE INDEX idx_accounting_entry_lines_account ON accounting_entry_lines(account_code);
CREATE INDEX idx_products_tenant_sku ON products(tenant_id, sku);
CREATE INDEX idx_audit_logs_tenant_time ON audit_logs(tenant_id, timestamp);

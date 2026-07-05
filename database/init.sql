-- zeuspro/database/init.sql

-- Habilitar extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- TABELA DE TENANTS (Empresas / Workspaces)
-- ==========================================
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    document VARCHAR(20) UNIQUE, -- CNPJ/CPF
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- TABELA DE USUÁRIOS (Suporte a Google Auth)
-- ==========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    google_id VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- Nulo se logar só com Google
    role VARCHAR(50) DEFAULT 'USER', -- ADMIN, USER, OWNER
    avatar_url TEXT,
    two_factor_secret VARCHAR(255),
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- TABELA DE CONTATOS (CRM)
-- ==========================================
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    tax_id VARCHAR(20), -- CNPJ associado ao contato
    tags TEXT[], -- Arrays nativos do Postgres para tags do CRM
    ai_sentiment_score INT DEFAULT 0, -- Score gerado pela IA
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, phone_number)
);

-- ==========================================
-- TABELA DE INSTÂNCIAS WHATSAPP (Evolution)
-- ==========================================
CREATE TABLE whatsapp_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    instance_name VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    status VARCHAR(50) DEFAULT 'DISCONNECTED',
    health_score DECIMAL(5,2) DEFAULT 100.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger para atualizar o updated_at automaticamente
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_tenant_modtime BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_contact_modtime BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_instance_modtime BEFORE UPDATE ON whatsapp_instances FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- ==========================================
-- TABELA DE MENSAGENS (Histórico do Chat)
-- ==========================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_from_me BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
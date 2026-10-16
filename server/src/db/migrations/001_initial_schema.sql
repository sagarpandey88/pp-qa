-- 001_initial_schema.sql
-- Initial schema for Power Platform & Copilot QA Platform (pp-qa)

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    microsoft_oid VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS azure_app_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    profile_name VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    client_id VARCHAR(255) NOT NULL,
    encrypted_client_secret TEXT NOT NULL,
    environment_url VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS byok_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    encrypted_api_key TEXT NOT NULL,
    key_hint VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS solutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    unique_name VARCHAR(255) NOT NULL,
    friendly_name VARCHAR(255),
    version VARCHAR(50),
    is_managed BOOLEAN DEFAULT false,
    publisher_name VARCHAR(255),
    publisher_prefix VARCHAR(50),
    markdown_content TEXT,
    raw_metadata JSONB,
    zip_storage_path VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS solution_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solution_id UUID REFERENCES solutions(id) ON DELETE CASCADE,
    schema_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    primary_id_attribute VARCHAR(255),
    primary_name_attribute VARCHAR(255),
    columns JSONB DEFAULT '[]',
    relationships JSONB DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS solution_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solution_id UUID REFERENCES solutions(id) ON DELETE CASCADE,
    workflow_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    trigger_type VARCHAR(100),
    triggers JSONB DEFAULT '[]',
    actions JSONB DEFAULT '[]',
    connection_references JSONB DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS solution_copilot_bots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solution_id UUID REFERENCES solutions(id) ON DELETE CASCADE,
    bot_schema_name VARCHAR(255),
    display_name VARCHAR(255),
    topics JSONB DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS test_suites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solution_id UUID REFERENCES solutions(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_app_type VARCHAR(50) NOT NULL,
    target_app_name VARCHAR(255),
    scenarios JSONB DEFAULT '[]',
    generated_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS test_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_suite_id UUID REFERENCES test_suites(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'queued',
    duration_ms INTEGER DEFAULT 0,
    summary JSONB DEFAULT '{}',
    logs TEXT DEFAULT '',
    report_url VARCHAR(500),
    artifacts JSONB DEFAULT '[]',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_azure_app_profiles_user ON azure_app_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_solutions_unique_name ON solutions(unique_name);
CREATE INDEX IF NOT EXISTS idx_solution_tables_solution ON solution_tables(solution_id);
CREATE INDEX IF NOT EXISTS idx_solution_flows_solution ON solution_flows(solution_id);
CREATE INDEX IF NOT EXISTS idx_test_suites_solution ON test_suites(solution_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_suite ON test_runs(test_suite_id);


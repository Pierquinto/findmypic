-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR UNIQUE NOT NULL,
    password VARCHAR NOT NULL,
    plan VARCHAR DEFAULT 'free',
    searches INTEGER DEFAULT 0,
    searches_reset_at TIMESTAMP DEFAULT NOW(),
    custom_search_limit INTEGER,
    role VARCHAR DEFAULT 'user',
    permissions JSONB,
    is_active BOOLEAN DEFAULT true,
    is_admin BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User profiles
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR,
    last_name VARCHAR,
    company VARCHAR,
    phone VARCHAR,
    website VARCHAR,
    bio TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Protected assets
CREATE TABLE protected_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    description TEXT,
    image_url VARCHAR NOT NULL,
    image_hash VARCHAR NOT NULL,
    tags JSONB,
    monitoring_enabled BOOLEAN DEFAULT true,
    monitoring_frequency VARCHAR DEFAULT 'weekly',
    last_monitored_at TIMESTAMP,
    total_violations INTEGER DEFAULT 0,
    status VARCHAR DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Asset monitoring results
CREATE TABLE asset_monitoring_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    protected_asset_id UUID NOT NULL REFERENCES protected_assets(id) ON DELETE CASCADE,
    monitoring_date TIMESTAMP NOT NULL,
    violations_found INTEGER DEFAULT 0,
    new_violations INTEGER DEFAULT 0,
    resolved_violations INTEGER DEFAULT 0,
    results JSONB,
    status VARCHAR DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Searches
CREATE TABLE searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url VARCHAR,
    encrypted_image_path VARCHAR,
    encrypted_results TEXT,
    search_type VARCHAR DEFAULT 'general_search',
    providers_used JSONB,
    search_time INTEGER,
    results_count INTEGER DEFAULT 0,
    ip_address VARCHAR,
    user_agent TEXT,
    image_hash VARCHAR,
    status VARCHAR DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Search results
CREATE TABLE search_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
    url VARCHAR NOT NULL,
    site_name VARCHAR NOT NULL,
    title VARCHAR,
    similarity FLOAT NOT NULL,
    status VARCHAR NOT NULL,
    thumbnail VARCHAR,
    provider VARCHAR NOT NULL,
    metadata JSONB,
    detected_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Image tokens
CREATE TABLE image_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token VARCHAR UNIQUE NOT NULL,
    search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    plan VARCHAR NOT NULL,
    status VARCHAR NOT NULL,
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    stripe_customer_id VARCHAR,
    stripe_subscription_id VARCHAR,
    price_id VARCHAR,
    amount INTEGER NOT NULL,
    currency VARCHAR DEFAULT 'EUR',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Activity logs
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    admin_id UUID,
    action VARCHAR NOT NULL,
    resource VARCHAR NOT NULL,
    resource_id VARCHAR,
    details JSONB,
    ip_address VARCHAR,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- System config
CREATE TABLE system_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR UNIQUE NOT NULL,
    value JSONB NOT NULL,
    category VARCHAR DEFAULT 'general',
    updated_by VARCHAR,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Custom search requests
CREATE TABLE custom_search_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    email VARCHAR NOT NULL,
    name VARCHAR,
    request_type VARCHAR DEFAULT 'manual_search',
    description TEXT NOT NULL,
    urgency_level VARCHAR DEFAULT 'normal',
    target_sites JSONB,
    image_hashes JSONB,
    additional_info JSONB,
    estimated_cost FLOAT,
    priority INTEGER DEFAULT 0,
    status VARCHAR DEFAULT 'waiting',
    admin_notes TEXT,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Search logs
CREATE TABLE search_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    email VARCHAR,
    image_storage_path VARCHAR,
    image_hash VARCHAR,
    image_size INTEGER,
    image_mime_type VARCHAR,
    ip_address VARCHAR,
    user_agent TEXT,
    geo_location JSONB,
    search_type VARCHAR DEFAULT 'general_search',
    search_query JSONB,
    providers_attempted JSONB,
    providers_successful JSONB,
    providers_failed JSONB,
    total_results INTEGER DEFAULT 0,
    search_time_ms INTEGER,
    processing_steps JSONB,
    error_logs JSONB,
    warnings JSONB,
    api_calls_count INTEGER DEFAULT 0,
    status VARCHAR DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Violations
CREATE TABLE violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    search_id UUID REFERENCES searches(id),
    search_result_id UUID,
    title VARCHAR NOT NULL,
    description TEXT,
    priority VARCHAR DEFAULT 'medium',
    status VARCHAR DEFAULT 'pending',
    category VARCHAR DEFAULT 'general',
    image_url VARCHAR,
    web_page_url VARCHAR,
    site_name VARCHAR NOT NULL,
    similarity FLOAT,
    provider VARCHAR,
    thumbnail VARCHAR,
    metadata JSONB,
    actions_taken JSONB,
    evidence JSONB,
    detected_at TIMESTAMP,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_search_results_search_id ON search_results(search_id);
CREATE INDEX idx_search_results_status ON search_results(status);
CREATE INDEX idx_search_results_similarity ON search_results(similarity);
CREATE INDEX idx_image_tokens_token ON image_tokens(token);
CREATE INDEX idx_image_tokens_expires_at ON image_tokens(expires_at);
CREATE INDEX idx_violations_user_id ON violations(user_id);
CREATE INDEX idx_violations_status ON violations(status);
CREATE INDEX idx_violations_priority ON violations(priority);
CREATE INDEX idx_violations_category ON violations(category);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE protected_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE violations ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (users can only see their own data)
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own profile data" ON user_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own assets" ON protected_assets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own searches" ON searches FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own violations" ON violations FOR ALL USING (auth.uid() = user_id);
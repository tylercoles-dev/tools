-- Analytics and Insights Database Schema Extension
-- Extends the existing MCP Tools database with analytics capabilities

-- User analytics and metrics
CREATE TABLE IF NOT EXISTS user_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Session metrics
    session_count INTEGER DEFAULT 0,
    total_session_duration INTEGER DEFAULT 0, -- in seconds
    avg_session_duration NUMERIC(10,2) DEFAULT 0,
    
    -- Activity metrics
    actions_performed INTEGER DEFAULT 0,
    pages_visited INTEGER DEFAULT 0,
    features_used TEXT[] DEFAULT '{}',
    
    -- Productivity metrics
    tasks_created INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    tasks_moved INTEGER DEFAULT 0,
    wiki_pages_created INTEGER DEFAULT 0,
    wiki_pages_edited INTEGER DEFAULT 0,
    memories_stored INTEGER DEFAULT 0,
    searches_performed INTEGER DEFAULT 0,
    
    -- Collaboration metrics
    boards_shared INTEGER DEFAULT 0,
    comments_added INTEGER DEFAULT 0,
    real_time_sessions INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, date)
);

-- System-wide analytics aggregates
CREATE TABLE IF NOT EXISTS system_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL UNIQUE,
    
    -- User metrics
    daily_active_users INTEGER DEFAULT 0,
    new_user_registrations INTEGER DEFAULT 0,
    user_retention_rate NUMERIC(5,2) DEFAULT 0,
    
    -- Performance metrics
    avg_api_response_time NUMERIC(10,2) DEFAULT 0,
    total_api_requests INTEGER DEFAULT 0,
    error_rate NUMERIC(5,4) DEFAULT 0,
    websocket_connections INTEGER DEFAULT 0,
    
    -- Feature usage
    kanban_boards_created INTEGER DEFAULT 0,
    wiki_pages_created INTEGER DEFAULT 0,
    memories_stored INTEGER DEFAULT 0,
    real_time_collaborations INTEGER DEFAULT 0,
    
    -- Resource utilization
    database_queries INTEGER DEFAULT 0,
    cache_hit_rate NUMERIC(5,2) DEFAULT 0,
    storage_used_mb NUMERIC(10,2) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event tracking for detailed analytics
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    
    -- Event identification
    event_type VARCHAR(100) NOT NULL, -- 'page_view', 'action', 'feature_use', etc.
    event_category VARCHAR(50) NOT NULL, -- 'kanban', 'wiki', 'memory', 'auth', etc.
    event_action VARCHAR(100) NOT NULL, -- 'create_task', 'edit_page', 'search', etc.
    event_label VARCHAR(255), -- Additional context
    
    -- Event metadata
    properties JSONB DEFAULT '{}', -- Flexible event properties
    page_url VARCHAR(500),
    referrer VARCHAR(500),
    user_agent TEXT,
    ip_address INET,
    
    -- Performance data
    load_time INTEGER, -- Page load time in ms
    interaction_time INTEGER, -- Time spent on action in ms
    
    -- Context
    board_id UUID, -- For kanban-related events
    page_id UUID, -- For wiki-related events
    memory_id UUID, -- For memory-related events
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance monitoring
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_type VARCHAR(50) NOT NULL, -- 'api_response', 'db_query', 'websocket', etc.
    endpoint VARCHAR(255), -- API endpoint or operation
    
    -- Timing metrics
    response_time_ms INTEGER NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Request details
    method VARCHAR(10), -- HTTP method
    status_code INTEGER, -- Response status
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}',
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User productivity insights
CREATE TABLE IF NOT EXISTS productivity_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    insight_type VARCHAR(50) NOT NULL, -- 'peak_hours', 'task_patterns', 'collaboration_style'
    
    -- Insight data
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    recommendation TEXT,
    confidence_score NUMERIC(3,2) DEFAULT 0, -- 0.0 to 1.0
    
    -- Supporting data
    data_points JSONB DEFAULT '{}',
    time_period_start DATE,
    time_period_end DATE,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_read BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Real-time analytics cache
CREATE TABLE IF NOT EXISTS analytics_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cache_key VARCHAR(255) NOT NULL UNIQUE,
    cache_data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for analytics performance
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_date ON user_analytics(user_id, date);
CREATE INDEX IF NOT EXISTS idx_user_analytics_date ON user_analytics(date);
CREATE INDEX IF NOT EXISTS idx_system_analytics_date ON system_analytics(date);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_category ON analytics_events(event_category);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_endpoint ON performance_metrics(endpoint);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created ON performance_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_response_time ON performance_metrics(response_time_ms);

CREATE INDEX IF NOT EXISTS idx_productivity_insights_user ON productivity_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_productivity_insights_type ON productivity_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_productivity_insights_active ON productivity_insights(is_active);

CREATE INDEX IF NOT EXISTS idx_analytics_cache_key ON analytics_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires ON analytics_cache(expires_at);

-- Create views for common analytics queries
CREATE OR REPLACE VIEW user_productivity_summary AS
SELECT 
    ua.user_id,
    u.name,
    u.email,
    SUM(ua.tasks_completed) as total_tasks_completed,
    SUM(ua.tasks_created) as total_tasks_created,
    ROUND(
        CASE 
            WHEN SUM(ua.tasks_created) > 0 
            THEN (SUM(ua.tasks_completed)::NUMERIC / SUM(ua.tasks_created)) * 100 
            ELSE 0 
        END, 2
    ) as completion_rate,
    SUM(ua.wiki_pages_created) as total_wiki_pages,
    SUM(ua.memories_stored) as total_memories,
    AVG(ua.avg_session_duration) as avg_session_duration,
    SUM(ua.session_count) as total_sessions,
    COUNT(ua.date) as active_days
FROM user_analytics ua
JOIN users u ON ua.user_id = u.id
WHERE ua.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY ua.user_id, u.name, u.email;

CREATE OR REPLACE VIEW daily_system_overview AS
SELECT 
    date,
    daily_active_users,
    new_user_registrations,
    kanban_boards_created,
    wiki_pages_created,
    memories_stored,
    avg_api_response_time,
    error_rate,
    websocket_connections
FROM system_analytics
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;

CREATE OR REPLACE VIEW recent_performance_summary AS
SELECT 
    metric_type,
    endpoint,
    COUNT(*) as request_count,
    AVG(response_time_ms) as avg_response_time,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time,
    COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count,
    ROUND(
        (COUNT(CASE WHEN status_code >= 400 THEN 1 END)::NUMERIC / COUNT(*)) * 100, 2
    ) as error_rate
FROM performance_metrics
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY metric_type, endpoint
ORDER BY avg_response_time DESC;

-- Function to update user analytics
CREATE OR REPLACE FUNCTION update_user_analytics(
    p_user_id UUID,
    p_metric_type VARCHAR(50),
    p_increment INTEGER DEFAULT 1
) RETURNS VOID AS $$
BEGIN
    INSERT INTO user_analytics (user_id, date)
    VALUES (p_user_id, CURRENT_DATE)
    ON CONFLICT (user_id, date) DO NOTHING;
    
    CASE p_metric_type
        WHEN 'tasks_created' THEN
            UPDATE user_analytics 
            SET tasks_created = tasks_created + p_increment,
                updated_at = NOW()
            WHERE user_id = p_user_id AND date = CURRENT_DATE;
        WHEN 'tasks_completed' THEN
            UPDATE user_analytics 
            SET tasks_completed = tasks_completed + p_increment,
                updated_at = NOW()
            WHERE user_id = p_user_id AND date = CURRENT_DATE;
        WHEN 'wiki_pages_created' THEN
            UPDATE user_analytics 
            SET wiki_pages_created = wiki_pages_created + p_increment,
                updated_at = NOW()
            WHERE user_id = p_user_id AND date = CURRENT_DATE;
        WHEN 'memories_stored' THEN
            UPDATE user_analytics 
            SET memories_stored = memories_stored + p_increment,
                updated_at = NOW()
            WHERE user_id = p_user_id AND date = CURRENT_DATE;
        WHEN 'searches_performed' THEN
            UPDATE user_analytics 
            SET searches_performed = searches_performed + p_increment,
                updated_at = NOW()
            WHERE user_id = p_user_id AND date = CURRENT_DATE;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to log analytics events
CREATE OR REPLACE FUNCTION log_analytics_event(
    p_user_id UUID,
    p_session_id VARCHAR(255),
    p_event_type VARCHAR(100),
    p_event_category VARCHAR(50),
    p_event_action VARCHAR(100),
    p_event_label VARCHAR(255) DEFAULT NULL,
    p_properties JSONB DEFAULT '{}',
    p_page_url VARCHAR(500) DEFAULT NULL,
    p_load_time INTEGER DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO analytics_events (
        user_id, session_id, event_type, event_category, event_action,
        event_label, properties, page_url, load_time
    ) VALUES (
        p_user_id, p_session_id, p_event_type, p_event_category, p_event_action,
        p_event_label, p_properties, p_page_url, p_load_time
    ) RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql;
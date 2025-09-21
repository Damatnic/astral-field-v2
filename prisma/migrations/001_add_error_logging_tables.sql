-- Error Logging and Monitoring Database Schema
-- Creates tables for comprehensive error tracking and analytics

-- Error logs table for storing all error events
CREATE TABLE IF NOT EXISTS error_logs (
    id VARCHAR(255) PRIMARY KEY,
    fingerprint VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL DEFAULT 'medium',
    category VARCHAR(100) NOT NULL DEFAULT 'system_error',
    source VARCHAR(50) NOT NULL DEFAULT 'unknown',
    
    -- Error context
    context JSONB NOT NULL DEFAULT '{}',
    stack_trace TEXT,
    
    -- User and session information
    user_id VARCHAR(255),
    session_id VARCHAR(255),
    request_id VARCHAR(255),
    
    -- Error counting and tracking
    count INTEGER NOT NULL DEFAULT 1,
    first_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Resolution tracking
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(255),
    resolution_notes TEXT,
    
    -- Indexes for performance
    CONSTRAINT unique_fingerprint_user UNIQUE (fingerprint, user_id)
);

-- Indexes for error_logs
CREATE INDEX IF NOT EXISTS idx_error_logs_fingerprint ON error_logs(fingerprint);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_category ON error_logs(category);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_source ON error_logs(source);
CREATE INDEX IF NOT EXISTS idx_error_logs_last_seen ON error_logs(last_seen);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_error_logs_severity_category ON error_logs(severity, category);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at_severity ON error_logs(created_at, severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_unresolved_severity ON error_logs(resolved, severity) WHERE resolved = FALSE;

-- GIN index for JSONB context searches
CREATE INDEX IF NOT EXISTS idx_error_logs_context ON error_logs USING GIN(context);

-- Error alert configurations table
CREATE TABLE IF NOT EXISTS error_alert_configs (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Alert conditions
    severity_filters TEXT[] NOT NULL DEFAULT '{}',
    category_filters TEXT[] NOT NULL DEFAULT '{}',
    component_filters TEXT[] NOT NULL DEFAULT '{}',
    
    -- Thresholds
    error_count_threshold INTEGER,
    error_rate_threshold DECIMAL(10,2),
    time_window_minutes INTEGER NOT NULL DEFAULT 60,
    
    -- Alert actions
    actions JSONB NOT NULL DEFAULT '[]',
    
    -- Cooldown and timing
    cooldown_minutes INTEGER NOT NULL DEFAULT 30,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

-- Indexes for error_alert_configs
CREATE INDEX IF NOT EXISTS idx_error_alert_configs_enabled ON error_alert_configs(enabled);
CREATE INDEX IF NOT EXISTS idx_error_alert_configs_last_triggered ON error_alert_configs(last_triggered_at);

-- Error alert events table
CREATE TABLE IF NOT EXISTS error_alert_events (
    id VARCHAR(255) PRIMARY KEY,
    alert_config_id VARCHAR(255) NOT NULL REFERENCES error_alert_configs(id) ON DELETE CASCADE,
    
    -- Alert details
    severity VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Alert metrics
    error_count INTEGER NOT NULL,
    error_rate DECIMAL(10,2) NOT NULL,
    time_window_minutes INTEGER NOT NULL,
    affected_error_fingerprints TEXT[] NOT NULL DEFAULT '{}',
    
    -- Alert actions and status
    actions_executed JSONB NOT NULL DEFAULT '[]',
    
    -- Resolution
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(255),
    
    -- Additional context
    context JSONB NOT NULL DEFAULT '{}'
);

-- Indexes for error_alert_events
CREATE INDEX IF NOT EXISTS idx_error_alert_events_config_id ON error_alert_events(alert_config_id);
CREATE INDEX IF NOT EXISTS idx_error_alert_events_triggered_at ON error_alert_events(triggered_at);
CREATE INDEX IF NOT EXISTS idx_error_alert_events_severity ON error_alert_events(severity);
CREATE INDEX IF NOT EXISTS idx_error_alert_events_resolved ON error_alert_events(resolved);

-- Error metrics summary table for performance
CREATE TABLE IF NOT EXISTS error_metrics_hourly (
    id SERIAL PRIMARY KEY,
    hour_bucket TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Aggregate metrics
    total_errors INTEGER NOT NULL DEFAULT 0,
    unique_errors INTEGER NOT NULL DEFAULT 0,
    unique_users INTEGER NOT NULL DEFAULT 0,
    
    -- By severity
    critical_errors INTEGER NOT NULL DEFAULT 0,
    high_errors INTEGER NOT NULL DEFAULT 0,
    medium_errors INTEGER NOT NULL DEFAULT 0,
    low_errors INTEGER NOT NULL DEFAULT 0,
    
    -- By category
    system_errors INTEGER NOT NULL DEFAULT 0,
    user_errors INTEGER NOT NULL DEFAULT 0,
    network_errors INTEGER NOT NULL DEFAULT 0,
    database_errors INTEGER NOT NULL DEFAULT 0,
    auth_errors INTEGER NOT NULL DEFAULT 0,
    validation_errors INTEGER NOT NULL DEFAULT 0,
    
    -- Performance metrics
    avg_resolution_time_minutes DECIMAL(10,2),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Ensure one row per hour
    CONSTRAINT unique_hour_bucket UNIQUE (hour_bucket)
);

-- Indexes for error_metrics_hourly
CREATE INDEX IF NOT EXISTS idx_error_metrics_hourly_bucket ON error_metrics_hourly(hour_bucket);

-- Database performance metrics table
CREATE TABLE IF NOT EXISTS db_performance_metrics (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Connection metrics
    active_connections INTEGER NOT NULL DEFAULT 0,
    max_connections INTEGER NOT NULL DEFAULT 0,
    
    -- Query metrics
    slow_queries INTEGER NOT NULL DEFAULT 0,
    failed_queries INTEGER NOT NULL DEFAULT 0,
    total_queries INTEGER NOT NULL DEFAULT 0,
    avg_query_duration_ms DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Error metrics
    connection_errors INTEGER NOT NULL DEFAULT 0,
    timeout_errors INTEGER NOT NULL DEFAULT 0,
    constraint_errors INTEGER NOT NULL DEFAULT 0,
    
    -- System health
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(5,2),
    disk_usage DECIMAL(5,2)
);

-- Indexes for db_performance_metrics
CREATE INDEX IF NOT EXISTS idx_db_performance_metrics_timestamp ON db_performance_metrics(timestamp);

-- System health status table
CREATE TABLE IF NOT EXISTS system_health_status (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Overall system status
    status VARCHAR(50) NOT NULL DEFAULT 'unknown', -- healthy, degraded, critical
    
    -- Component health
    api_status VARCHAR(50) NOT NULL DEFAULT 'unknown',
    database_status VARCHAR(50) NOT NULL DEFAULT 'unknown',
    cache_status VARCHAR(50) NOT NULL DEFAULT 'unknown',
    external_services_status VARCHAR(50) NOT NULL DEFAULT 'unknown',
    
    -- Metrics
    error_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
    response_time_p95_ms INTEGER NOT NULL DEFAULT 0,
    uptime_seconds BIGINT NOT NULL DEFAULT 0,
    
    -- Additional context
    details JSONB NOT NULL DEFAULT '{}',
    
    -- Only keep latest status per component
    CONSTRAINT unique_latest_status UNIQUE (timestamp)
);

-- Indexes for system_health_status
CREATE INDEX IF NOT EXISTS idx_system_health_status_timestamp ON system_health_status(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_health_status_status ON system_health_status(status);

-- User error reports table (for user-submitted bug reports)
CREATE TABLE IF NOT EXISTS user_error_reports (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255),
    
    -- Report details
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    steps_to_reproduce TEXT,
    expected_behavior TEXT,
    actual_behavior TEXT,
    
    -- Technical details
    browser VARCHAR(255),
    operating_system VARCHAR(255),
    screen_resolution VARCHAR(100),
    error_log_id VARCHAR(255) REFERENCES error_logs(id),
    
    -- Attachments and context
    screenshots TEXT[], -- URLs to uploaded screenshots
    additional_context JSONB NOT NULL DEFAULT '{}',
    
    -- Status and priority
    status VARCHAR(50) NOT NULL DEFAULT 'open', -- open, investigating, resolved, closed
    priority VARCHAR(50) NOT NULL DEFAULT 'medium', -- low, medium, high, critical
    
    -- Assignment and resolution
    assigned_to VARCHAR(255),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for user_error_reports
CREATE INDEX IF NOT EXISTS idx_user_error_reports_user_id ON user_error_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_user_error_reports_status ON user_error_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_error_reports_priority ON user_error_reports(priority);
CREATE INDEX IF NOT EXISTS idx_user_error_reports_created_at ON user_error_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_user_error_reports_assigned_to ON user_error_reports(assigned_to);

-- Function to update error_logs count and last_seen
CREATE OR REPLACE FUNCTION update_error_log()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at timestamp
DROP TRIGGER IF EXISTS trigger_update_error_log_timestamp ON error_logs;
CREATE TRIGGER trigger_update_error_log_timestamp
    BEFORE UPDATE ON error_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_error_log();

-- Function to automatically aggregate hourly metrics
CREATE OR REPLACE FUNCTION aggregate_hourly_error_metrics()
RETURNS void AS $$
DECLARE
    current_hour TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get the current hour bucket
    current_hour := date_trunc('hour', NOW() - INTERVAL '1 hour');
    
    -- Insert or update hourly metrics
    INSERT INTO error_metrics_hourly (
        hour_bucket,
        total_errors,
        unique_errors,
        unique_users,
        critical_errors,
        high_errors,
        medium_errors,
        low_errors,
        system_errors,
        user_errors,
        network_errors,
        database_errors,
        auth_errors,
        validation_errors,
        avg_resolution_time_minutes
    )
    SELECT 
        current_hour,
        SUM(count) as total_errors,
        COUNT(DISTINCT fingerprint) as unique_errors,
        COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as unique_users,
        SUM(count) FILTER (WHERE severity = 'critical') as critical_errors,
        SUM(count) FILTER (WHERE severity = 'high') as high_errors,
        SUM(count) FILTER (WHERE severity = 'medium') as medium_errors,
        SUM(count) FILTER (WHERE severity = 'low') as low_errors,
        SUM(count) FILTER (WHERE category = 'system_error') as system_errors,
        SUM(count) FILTER (WHERE category = 'user_error') as user_errors,
        SUM(count) FILTER (WHERE category = 'network_error') as network_errors,
        SUM(count) FILTER (WHERE category = 'database_error') as database_errors,
        SUM(count) FILTER (WHERE category IN ('authentication_error', 'authorization_error')) as auth_errors,
        SUM(count) FILTER (WHERE category = 'validation_error') as validation_errors,
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60) FILTER (WHERE resolved_at IS NOT NULL) as avg_resolution_time_minutes
    FROM error_logs
    WHERE created_at >= current_hour AND created_at < current_hour + INTERVAL '1 hour'
    ON CONFLICT (hour_bucket) DO UPDATE SET
        total_errors = EXCLUDED.total_errors,
        unique_errors = EXCLUDED.unique_errors,
        unique_users = EXCLUDED.unique_users,
        critical_errors = EXCLUDED.critical_errors,
        high_errors = EXCLUDED.high_errors,
        medium_errors = EXCLUDED.medium_errors,
        low_errors = EXCLUDED.low_errors,
        system_errors = EXCLUDED.system_errors,
        user_errors = EXCLUDED.user_errors,
        network_errors = EXCLUDED.network_errors,
        database_errors = EXCLUDED.database_errors,
        auth_errors = EXCLUDED.auth_errors,
        validation_errors = EXCLUDED.validation_errors,
        avg_resolution_time_minutes = EXCLUDED.avg_resolution_time_minutes;
END;
$$ LANGUAGE plpgsql;

-- Create extension for cron jobs if available (optional)
-- This would allow automatic aggregation of metrics
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant permissions (adjust as needed for your user roles)
-- GRANT ALL PRIVILEGES ON TABLE error_logs TO your_app_user;
-- GRANT ALL PRIVILEGES ON TABLE error_alert_configs TO your_app_user;
-- GRANT ALL PRIVILEGES ON TABLE error_alert_events TO your_app_user;
-- GRANT ALL PRIVILEGES ON TABLE error_metrics_hourly TO your_app_user;
-- GRANT ALL PRIVILEGES ON TABLE db_performance_metrics TO your_app_user;
-- GRANT ALL PRIVILEGES ON TABLE system_health_status TO your_app_user;
-- GRANT ALL PRIVILEGES ON TABLE user_error_reports TO your_app_user;
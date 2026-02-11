-- ================================================
-- GARDEN WATERING SYSTEM TABLES
-- ================================================
-- Purpose: Manage garden watering sessions for general garden irrigation
-- Author: Smart Farming Team
-- Date: February 11, 2026

-- ================================================
-- 1. GARDEN WATERING SESSIONS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS garden_watering_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 1 AND duration_minutes <= 180),
    status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'completed', 'stopped', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    total_duration_minutes INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- 2. GARDEN WATERING LOGS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS garden_watering_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES garden_watering_sessions(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- 3. INDEXES FOR PERFORMANCE
-- ================================================
CREATE INDEX IF NOT EXISTS idx_garden_watering_sessions_user_id ON garden_watering_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_garden_watering_sessions_status ON garden_watering_sessions(status);
CREATE INDEX IF NOT EXISTS idx_garden_watering_sessions_started_at ON garden_watering_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_garden_watering_logs_session_id ON garden_watering_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_garden_watering_logs_event_type ON garden_watering_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_garden_watering_logs_created_at ON garden_watering_logs(created_at DESC);

-- ================================================
-- 4. AUTO-UPDATE TIMESTAMP TRIGGER
-- ================================================
CREATE OR REPLACE FUNCTION update_garden_watering_sessions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_garden_watering_sessions_timestamp
    BEFORE UPDATE ON garden_watering_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_garden_watering_sessions_timestamp();

-- ================================================
-- 5. COMMENTS FOR DOCUMENTATION
-- ================================================
COMMENT ON TABLE garden_watering_sessions IS 'Stores garden watering session records';
COMMENT ON TABLE garden_watering_logs IS 'Logs all events during garden watering sessions';
COMMENT ON COLUMN garden_watering_sessions.duration_minutes IS 'Planned duration (1-180 minutes)';
COMMENT ON COLUMN garden_watering_sessions.status IS 'Session status: running, completed, stopped, failed';
COMMENT ON COLUMN garden_watering_sessions.total_duration_minutes IS 'Actual duration after completion';

-- ================================================
-- SUCCESS MESSAGE
-- ================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Garden watering system tables created successfully!';
END $$;

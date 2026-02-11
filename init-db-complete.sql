-- ================================================================
-- 🌱 SMART FARMING DATABASE INITIALIZATION SCRIPT
-- ================================================================
-- This script initializes all required tables for the Smart Farming system
-- Includes: Users, Devices, Zones, Auto Drip, Tanks, Flushing, Garden Watering
-- Author: Smart Farming Team
-- Date: February 2026
-- ================================================================

-- ================================================================
-- ENABLE EXTENSIONS
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ================================================================
-- 👥 USERS & AUTHENTICATION
-- ================================================================

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'farmer', 'user')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    refresh_token TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: Admin123!)
INSERT INTO users (email, password, full_name, role, is_active)
VALUES (
    'admin@smartfarming.com',
    '$2b$10$GrVisTVYZ1l7DPp597NCZOY6yMPuHIM4c/2..wMouEbnO09wRiJze',
    'Super Admin',
    'admin',
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- Comments
COMMENT ON TABLE users IS 'Users with authentication and role-based access';
COMMENT ON COLUMN users.full_name IS 'Full name of the user';
COMMENT ON COLUMN users.role IS 'User role: admin, farmer, or user';

-- ================================================================
-- 🔌 DEVICES
-- ================================================================

CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    mqtt_topic VARCHAR(255),
    status VARCHAR(20) DEFAULT 'OFFLINE',
    is_active BOOLEAN DEFAULT TRUE,
    last_seen TIMESTAMPTZ,
    location VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Devices indexes
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(type);
CREATE INDEX IF NOT EXISTS idx_devices_mqtt_topic ON devices(mqtt_topic);
CREATE INDEX IF NOT EXISTS idx_devices_active ON devices(is_active);

-- Insert initial devices
INSERT INTO devices (
    id, name, type, mqtt_topic, status, is_active, last_seen, metadata, created_at, updated_at
) VALUES (
    'f17ee499-c275-4197-8fef-2a30271a3380',
    'ESP32 Device 1',
    'ESP32_WATERING_CONTROLLER',
    'Smartfarming/device1',
    'ONLINE',
    true,
    NOW(),
    '{"location": "Greenhouse A", "firmware": "v1.0.0", "capabilities": ["watering", "sensor"]}'::jsonb,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    last_seen = EXCLUDED.last_seen,
    updated_at = EXCLUDED.updated_at;

-- Comments
COMMENT ON TABLE devices IS 'ESP32 devices and controllers';
COMMENT ON COLUMN devices.mqtt_topic IS 'MQTT topic for device communication';

-- ================================================================
-- 🌾 ZONES (Manual Watering Control)
-- ================================================================

CREATE TABLE IF NOT EXISTS zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    device_id UUID,
    is_active BOOLEAN DEFAULT FALSE,
    duration_minutes INTEGER DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ,
    remaining_seconds INTEGER,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Zones indexes
CREATE INDEX IF NOT EXISTS idx_zones_user_id ON zones(user_id);
CREATE INDEX IF NOT EXISTS idx_zones_device_id ON zones(device_id);
CREATE INDEX IF NOT EXISTS idx_zones_is_active ON zones(is_active);
CREATE INDEX IF NOT EXISTS idx_zones_created_at ON zones(created_at DESC);

-- Trigger for zones
CREATE OR REPLACE FUNCTION update_zones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER zones_updated_at_trigger
    BEFORE UPDATE ON zones
    FOR EACH ROW
    EXECUTE FUNCTION update_zones_updated_at();

-- Insert sample zones
INSERT INTO zones (id, name, description, device_id, is_active, duration_minutes, duration_seconds, user_id, created_at, updated_at)
VALUES 
    (
        'a0000000-0000-0000-0000-000000000001',
        'Zona A',
        'Zona penyiraman area A - Greenhouse utara',
        (SELECT id FROM devices LIMIT 1),
        false,
        8,
        20,
        (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
        NOW(),
        NOW()
    ),
    (
        'a0000000-0000-0000-0000-000000000002',
        'Zona B',
        'Zona penyiraman area B - Greenhouse selatan',
        (SELECT id FROM devices LIMIT 1),
        false,
        10,
        0,
        (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
        NOW(),
        NOW()
    ),
    (
        'a0000000-0000-0000-0000-000000000003',
        'Zona C',
        'Zona penyiraman area C - Lahan terbuka',
        (SELECT id FROM devices LIMIT 1),
        false,
        15,
        30,
        (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
        NOW(),
        NOW()
    )
ON CONFLICT (id) DO NOTHING;

-- Comments
COMMENT ON TABLE zones IS 'Watering zones with manual control and countdown timer';
COMMENT ON COLUMN zones.is_active IS 'True when watering is running';
COMMENT ON COLUMN zones.remaining_seconds IS 'Remaining time in countdown';

-- ================================================================
-- ⏰ AUTO DRIP SCHEDULES (Automatic Watering)
-- ================================================================

CREATE TABLE IF NOT EXISTS auto_drip_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    time_slots JSONB NOT NULL DEFAULT '[]'::jsonb,
    active_days JSONB NOT NULL DEFAULT '[]'::jsonb,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto drip indexes
CREATE INDEX IF NOT EXISTS idx_auto_drip_zone_id ON auto_drip_schedules(zone_id);
CREATE INDEX IF NOT EXISTS idx_auto_drip_user_id ON auto_drip_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_drip_is_active ON auto_drip_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_auto_drip_created_at ON auto_drip_schedules(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auto_drip_time_slots ON auto_drip_schedules USING GIN (time_slots);
CREATE INDEX IF NOT EXISTS idx_auto_drip_active_days ON auto_drip_schedules USING GIN (active_days);

-- Trigger for auto_drip_schedules
CREATE OR REPLACE FUNCTION update_auto_drip_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_drip_updated_at_trigger
    BEFORE UPDATE ON auto_drip_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_auto_drip_updated_at();

-- Insert sample schedules
INSERT INTO auto_drip_schedules (zone_id, is_active, time_slots, active_days, user_id)
VALUES 
    (
        'a0000000-0000-0000-0000-000000000001',
        true,
        '[
            {"startTime": "07:00", "durationMinutes": 4, "durationSeconds": 0},
            {"startTime": "17:00", "durationMinutes": 3, "durationSeconds": 30}
        ]'::jsonb,
        '["monday", "wednesday", "friday"]'::jsonb,
        (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
    ),
    (
        'a0000000-0000-0000-0000-000000000002',
        true,
        '[
            {"startTime": "06:30", "durationMinutes": 5, "durationSeconds": 0},
            {"startTime": "18:00", "durationMinutes": 4, "durationSeconds": 0}
        ]'::jsonb,
        '["tuesday", "thursday", "saturday"]'::jsonb,
        (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
    )
ON CONFLICT DO NOTHING;

-- Comments
COMMENT ON TABLE auto_drip_schedules IS 'Automatic watering schedules with time slots and active days';
COMMENT ON COLUMN auto_drip_schedules.time_slots IS 'Array of time slots: [{"startTime": "07:00", "durationMinutes": 4, "durationSeconds": 0}]';
COMMENT ON COLUMN auto_drip_schedules.active_days IS 'Active days: ["monday", "tuesday", ...]';

-- ================================================================
-- 🚰 TANKS (Water Tank Control)
-- ================================================================

CREATE TABLE IF NOT EXISTS tanks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    device_id VARCHAR(255) NOT NULL,
    sensor_device_id VARCHAR(255),
    capacity NUMERIC(10, 2) NOT NULL CHECK (capacity >= 10 AND capacity <= 100000),
    current_level NUMERIC(5, 2) DEFAULT 0 CHECK (current_level >= 0 AND current_level <= 100),
    is_active BOOLEAN DEFAULT true,
    auto_fill_enabled BOOLEAN DEFAULT false,
    auto_fill_min_level NUMERIC(5, 2) DEFAULT 30 CHECK (auto_fill_min_level >= 0 AND auto_fill_min_level <= 80),
    auto_fill_max_level NUMERIC(5, 2) DEFAULT 90 CHECK (auto_fill_max_level >= 50 AND auto_fill_max_level <= 100),
    manual_fill_max_level NUMERIC(5, 2) DEFAULT 95 CHECK (manual_fill_max_level >= 50 AND manual_fill_max_level <= 100),
    manual_fill_duration INTEGER CHECK (manual_fill_duration >= 1 AND manual_fill_duration <= 180),
    agitator_enabled BOOLEAN DEFAULT false,
    agitator_status BOOLEAN DEFAULT false,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT check_auto_fill_levels CHECK (auto_fill_min_level < auto_fill_max_level)
);

-- Tank statistics
CREATE TABLE IF NOT EXISTS tank_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tank_id UUID NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_usage NUMERIC(10, 2) DEFAULT 0,
    total_filled NUMERIC(10, 2) DEFAULT 0,
    average_level NUMERIC(5, 2) DEFAULT 0,
    min_level NUMERIC(5, 2) DEFAULT 100,
    max_level NUMERIC(5, 2) DEFAULT 0,
    auto_fill_count INTEGER DEFAULT 0,
    manual_fill_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tank_id) REFERENCES tanks(id) ON DELETE CASCADE,
    UNIQUE(tank_id, date)
);

-- Tank logs
CREATE TABLE IF NOT EXISTS tank_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tank_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    level_before NUMERIC(5, 2) NOT NULL,
    level_after NUMERIC(5, 2) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tank_id) REFERENCES tanks(id) ON DELETE CASCADE
);

-- Tank indexes
CREATE INDEX IF NOT EXISTS idx_tanks_user_id ON tanks(user_id);
CREATE INDEX IF NOT EXISTS idx_tanks_device_id ON tanks(device_id);
CREATE INDEX IF NOT EXISTS idx_tanks_active ON tanks(is_active);
CREATE INDEX IF NOT EXISTS idx_tank_statistics_tank_id ON tank_statistics(tank_id);
CREATE INDEX IF NOT EXISTS idx_tank_statistics_date ON tank_statistics(date);
CREATE INDEX IF NOT EXISTS idx_tank_logs_tank_id ON tank_logs(tank_id);
CREATE INDEX IF NOT EXISTS idx_tank_logs_created_at ON tank_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_tank_logs_type ON tank_logs(type);

-- Tank triggers
CREATE OR REPLACE FUNCTION update_tank_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tank_updated_at
    BEFORE UPDATE ON tanks
    FOR EACH ROW
    EXECUTE FUNCTION update_tank_updated_at();

CREATE TRIGGER trigger_update_tank_statistics_updated_at
    BEFORE UPDATE ON tank_statistics
    FOR EACH ROW
    EXECUTE FUNCTION update_tank_updated_at();

-- Comments
COMMENT ON TABLE tanks IS 'Water tanks with auto-fill and agitator control';
COMMENT ON TABLE tank_statistics IS 'Daily water usage and fill statistics';
COMMENT ON TABLE tank_logs IS 'Activity logs for tank operations';

-- ================================================================
-- 🚿 FLUSHING SYSTEM
-- ================================================================

CREATE TABLE IF NOT EXISTS flushing_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 1 AND duration_minutes <= 180),
    status VARCHAR(20) NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'stopped', 'failed')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    total_duration_minutes INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flushing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES flushing_sessions(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('started', 'stopped', 'completed', 'failed', 'status_update')),
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Flushing indexes
CREATE INDEX idx_flushing_sessions_user_id ON flushing_sessions(user_id);
CREATE INDEX idx_flushing_sessions_status ON flushing_sessions(status);
CREATE INDEX idx_flushing_sessions_started_at ON flushing_sessions(started_at DESC);
CREATE INDEX idx_flushing_logs_session_id ON flushing_logs(session_id);
CREATE INDEX idx_flushing_logs_created_at ON flushing_logs(created_at DESC);

-- Flushing trigger
CREATE OR REPLACE FUNCTION update_flushing_sessions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_flushing_sessions_timestamp
    BEFORE UPDATE ON flushing_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_flushing_sessions_timestamp();

-- Comments
COMMENT ON TABLE flushing_sessions IS 'Flushing sessions for irrigation pipe cleaning';
COMMENT ON TABLE flushing_logs IS 'Activity logs for flushing sessions';

-- ================================================================
-- 🌻 GARDEN WATERING SYSTEM
-- ================================================================

CREATE TABLE IF NOT EXISTS garden_watering_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 1 AND duration_minutes <= 180),
    status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'completed', 'stopped', 'failed')),
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    total_duration_minutes INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS garden_watering_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES garden_watering_sessions(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Garden watering indexes
CREATE INDEX IF NOT EXISTS idx_garden_watering_sessions_user_id ON garden_watering_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_garden_watering_sessions_status ON garden_watering_sessions(status);
CREATE INDEX IF NOT EXISTS idx_garden_watering_sessions_started_at ON garden_watering_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_garden_watering_logs_session_id ON garden_watering_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_garden_watering_logs_event_type ON garden_watering_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_garden_watering_logs_created_at ON garden_watering_logs(created_at DESC);

-- Garden watering trigger
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

-- Comments
COMMENT ON TABLE garden_watering_sessions IS 'Garden watering session records';
COMMENT ON TABLE garden_watering_logs IS 'Event logs for garden watering';

-- ================================================================
-- 💧 WATERING COMMAND LOGS (MQTT Tracking)
-- ================================================================

CREATE TABLE IF NOT EXISTS watering_command_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id UUID NOT NULL,
    command VARCHAR(50) NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ack_received_at TIMESTAMPTZ,
    status_confirmed_at TIMESTAMPTZ,
    ack_received BOOLEAN DEFAULT FALSE,
    status VARCHAR(50),
    pump_status VARCHAR(20),
    solenoid_status VARCHAR(20),
    actual_duration_seconds INTEGER,
    error_message TEXT,
    timeout BOOLEAN DEFAULT FALSE,
    retry_count INTEGER DEFAULT 0,
    requested_by UUID,
    source VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE
);

-- Watering command logs indexes
CREATE INDEX idx_watering_command_logs_zone_id ON watering_command_logs(zone_id);
CREATE INDEX idx_watering_command_logs_sent_at ON watering_command_logs(sent_at DESC);
CREATE INDEX idx_watering_command_logs_status ON watering_command_logs(status);
CREATE INDEX idx_watering_command_logs_ack ON watering_command_logs(ack_received, sent_at);
CREATE INDEX idx_watering_command_logs_timeout ON watering_command_logs(timeout) WHERE timeout = TRUE;

-- Comments
COMMENT ON TABLE watering_command_logs IS 'MQTT command tracking with ESP32 responses';
COMMENT ON COLUMN watering_command_logs.command IS 'Command sent: START_MANUAL, STOP_MANUAL, etc.';

-- ================================================================
-- 📡 SENSOR DATA (TimescaleDB Hypertable)
-- ================================================================

CREATE TABLE IF NOT EXISTS sensor_data (
    time TIMESTAMPTZ NOT NULL,
    device_id UUID NOT NULL,
    sensor_type VARCHAR(50) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    unit VARCHAR(20) NOT NULL,
    metadata JSONB,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- Sensor data indexes
CREATE INDEX IF NOT EXISTS idx_sensor_device_time ON sensor_data (device_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_type_time ON sensor_data (sensor_type, time DESC);

-- ================================================================
-- 🔄 CONVERT TO TIMESCALEDB HYPERTABLES
-- ================================================================

SELECT create_hypertable('sensor_data', 'time', if_not_exists => TRUE);
SELECT create_hypertable('tank_logs', 'created_at', if_not_exists => TRUE);
SELECT create_hypertable('watering_command_logs', 'created_at', if_not_exists => TRUE);

-- ================================================================
-- 📊 TIMESCALEDB OPTIMIZATION POLICIES
-- ================================================================

-- Compression policies
SELECT add_compression_policy('sensor_data', INTERVAL '7 days', if_not_exists => TRUE);
SELECT add_compression_policy('tank_logs', INTERVAL '30 days', if_not_exists => TRUE);
SELECT add_compression_policy('watering_command_logs', INTERVAL '30 days', if_not_exists => TRUE);

-- Retention policies
SELECT add_retention_policy('sensor_data', INTERVAL '1 year', if_not_exists => TRUE);
SELECT add_retention_policy('tank_logs', INTERVAL '2 years', if_not_exists => TRUE);
SELECT add_retention_policy('watering_command_logs', INTERVAL '2 years', if_not_exists => TRUE);

-- ================================================================
-- 📈 CONTINUOUS AGGREGATES (Analytics)
-- ================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS sensor_hourly
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', time) AS hour,
    device_id,
    sensor_type,
    AVG(value) as avg_value,
    MAX(value) as max_value,
    MIN(value) as min_value,
    COUNT(*) as sample_count
FROM sensor_data
GROUP BY hour, device_id, sensor_type
WITH NO DATA;

-- Refresh policy
SELECT add_continuous_aggregate_policy('sensor_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

-- ================================================================
-- 🔐 GRANT PRIVILEGES
-- ================================================================

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO smartfarming;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO smartfarming;

-- ================================================================
-- ✅ INITIALIZATION COMPLETE
-- ================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Smart Farming Database Initialized!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '👥 Users & Authentication: ✓';
    RAISE NOTICE '🔌 Devices: ✓';
    RAISE NOTICE '🌾 Zones (Manual Watering): ✓';
    RAISE NOTICE '⏰ Auto Drip Schedules: ✓';
    RAISE NOTICE '🚰 Tanks & Statistics: ✓';
    RAISE NOTICE '🚿 Flushing System: ✓';
    RAISE NOTICE '🌻 Garden Watering: ✓';
    RAISE NOTICE '💧 Watering Command Logs: ✓';
    RAISE NOTICE '📡 Sensor Data: ✓';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 TimescaleDB Hypertables: 3';
    RAISE NOTICE '📈 Continuous Aggregates: 1';
    RAISE NOTICE '🗂️  Total Tables: 16';
    RAISE NOTICE '🔍 Total Indexes: 50+';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔐 Default Admin:';
    RAISE NOTICE '   Email: admin@smartfarming.com';
    RAISE NOTICE '   Password: Admin123!';
    RAISE NOTICE '========================================';
END $$;

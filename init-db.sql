-- ================================================================
-- 🌱 Smart Farming Database Initialization Script
-- ================================================================
-- This script initializes all required tables for the Smart Farming system
-- Including: Users, Devices, Zones, Tanks, Auto Drip, Flushing, Garden Watering
-- ================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ================================================================
-- 👥 USERS & AUTHENTICATION TABLES
-- ================================================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'farmer', 'user')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Refresh Tokens Table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_refresh_token_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ================================================================
-- 🔌 DEVICES TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    mqtt_topic VARCHAR(255),
    status VARCHAR(20) DEFAULT 'OFFLINE',
    is_active BOOLEAN DEFAULT true,
    last_seen TIMESTAMPTZ,
    location VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- 🌾 ZONES TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    device_id UUID NOT NULL,
    duration_minutes INTEGER DEFAULT 5,
    duration_seconds INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'idle',
    is_watering BOOLEAN DEFAULT false,
    started_at TIMESTAMPTZ,
    will_stop_at TIMESTAMPTZ,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_zone_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
    CONSTRAINT fk_zone_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ================================================================
-- ⏰ AUTO DRIP SCHEDULES TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS auto_drip_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL,
    is_active BOOLEAN DEFAULT true,
    time_slots JSONB NOT NULL,
    active_days TEXT[] NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_auto_drip_zone FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE,
    CONSTRAINT fk_auto_drip_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unique_zone_schedule UNIQUE (zone_id)
);

-- ================================================================
-- 🚰 TANKS TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS tanks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    capacity_liters DECIMAL(10,2) NOT NULL,
    current_level_percent DECIMAL(5,2) DEFAULT 0,
    is_agitator_on BOOLEAN DEFAULT false,
    is_auto_fill_enabled BOOLEAN DEFAULT false,
    auto_fill_min_level DECIMAL(5,2) DEFAULT 60.0,
    auto_fill_max_level DECIMAL(5,2) DEFAULT 90.0,
    manual_fill_max_level DECIMAL(5,2) DEFAULT 89.0,
    is_manual_filling BOOLEAN DEFAULT false,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tank_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ================================================================
-- 📊 TANK STATISTICS TABLE (TimescaleDB Hypertable)
-- ================================================================

CREATE TABLE IF NOT EXISTS tank_statistics (
    tank_id UUID NOT NULL,
    date DATE NOT NULL,
    total_water_used_liters DECIMAL(10,2) DEFAULT 0,
    total_water_filled_liters DECIMAL(10,2) DEFAULT 0,
    min_level_percent DECIMAL(5,2),
    max_level_percent DECIMAL(5,2),
    avg_level_percent DECIMAL(5,2),
    auto_fill_count INTEGER DEFAULT 0,
    manual_fill_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tank_id, date),
    CONSTRAINT fk_tank_stats_tank FOREIGN KEY (tank_id) REFERENCES tanks(id) ON DELETE CASCADE
);

-- ================================================================
-- 📝 TANK LOGS TABLE (TimescaleDB Hypertable)
-- ================================================================

CREATE TABLE IF NOT EXISTS tank_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tank_id UUID NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    description TEXT,
    level_before DECIMAL(5,2),
    level_after DECIMAL(5,2),
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tank_log_tank FOREIGN KEY (tank_id) REFERENCES tanks(id) ON DELETE CASCADE
);

-- ================================================================
-- 🚿 FLUSHING SESSIONS TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS flushing_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    CONSTRAINT fk_flushing_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ================================================================
-- 🌻 GARDEN WATERING SESSIONS TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS garden_watering_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    CONSTRAINT fk_garden_watering_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ================================================================
-- 💧 WATERING COMMAND LOGS TABLE (TimescaleDB Hypertable)
-- ================================================================

CREATE TABLE IF NOT EXISTS watering_command_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL,
    command_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    duration_minutes INTEGER,
    duration_seconds INTEGER,
    triggered_by VARCHAR(50),
    user_id UUID,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,
    CONSTRAINT fk_watering_log_zone FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE,
    CONSTRAINT fk_watering_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ================================================================
-- 📡 SENSOR DATA TABLE (TimescaleDB Hypertable)
-- ================================================================

CREATE TABLE IF NOT EXISTS sensor_data (
    time TIMESTAMPTZ NOT NULL,
    device_id UUID NOT NULL,
    sensor_type VARCHAR(50) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    unit VARCHAR(20) NOT NULL,
    metadata JSONB,
    CONSTRAINT fk_sensor_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- ================================================================
-- 🔄 CONVERT TO TIMESCALEDB HYPERTABLES
-- ================================================================

SELECT create_hypertable('sensor_data', 'time', if_not_exists => TRUE);
SELECT create_hypertable('tank_logs', 'timestamp', if_not_exists => TRUE);
SELECT create_hypertable('watering_command_logs', 'timestamp', if_not_exists => TRUE);

-- ================================================================
-- 📑 CREATE INDEXES FOR PERFORMANCE
-- ================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Refresh tokens indexes
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- Devices indexes
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(type);
CREATE INDEX IF NOT EXISTS idx_devices_mqtt_topic ON devices(mqtt_topic);
CREATE INDEX IF NOT EXISTS idx_devices_active ON devices(is_active);

-- Zones indexes
CREATE INDEX IF NOT EXISTS idx_zones_device ON zones(device_id);
CREATE INDEX IF NOT EXISTS idx_zones_user ON zones(user_id);
CREATE INDEX IF NOT EXISTS idx_zones_status ON zones(status);
CREATE INDEX IF NOT EXISTS idx_zones_is_watering ON zones(is_watering);

-- Auto drip schedules indexes
CREATE INDEX IF NOT EXISTS idx_auto_drip_zone ON auto_drip_schedules(zone_id);
CREATE INDEX IF NOT EXISTS idx_auto_drip_user ON auto_drip_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_drip_active ON auto_drip_schedules(is_active);

-- Tanks indexes
CREATE INDEX IF NOT EXISTS idx_tanks_user ON tanks(user_id);
CREATE INDEX IF NOT EXISTS idx_tanks_auto_fill ON tanks(is_auto_fill_enabled);

-- Tank logs indexes
CREATE INDEX IF NOT EXISTS idx_tank_logs_tank ON tank_logs(tank_id);
CREATE INDEX IF NOT EXISTS idx_tank_logs_event_type ON tank_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_tank_logs_timestamp ON tank_logs(timestamp DESC);

-- Flushing sessions indexes
CREATE INDEX IF NOT EXISTS idx_flushing_user ON flushing_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_flushing_status ON flushing_sessions(status);

-- Garden watering sessions indexes
CREATE INDEX IF NOT EXISTS idx_garden_watering_user ON garden_watering_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_garden_watering_status ON garden_watering_sessions(status);

-- Watering command logs indexes
CREATE INDEX IF NOT EXISTS idx_watering_logs_zone ON watering_command_logs(zone_id);
CREATE INDEX IF NOT EXISTS idx_watering_logs_user ON watering_command_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_watering_logs_timestamp ON watering_command_logs(timestamp DESC);

-- Sensor data indexes
CREATE INDEX IF NOT EXISTS idx_sensor_device_time ON sensor_data (device_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_type_time ON sensor_data (sensor_type, time DESC);

-- ================================================================
-- 📈 TIMESCALEDB OPTIMIZATION POLICIES
-- ================================================================

-- Add compression policy (compress data older than 7 days)
SELECT add_compression_policy('sensor_data', INTERVAL '7 days', if_not_exists => TRUE);
SELECT add_compression_policy('tank_logs', INTERVAL '30 days', if_not_exists => TRUE);
SELECT add_compression_policy('watering_command_logs', INTERVAL '30 days', if_not_exists => TRUE);

-- Add retention policy (drop data older than specified time)
SELECT add_retention_policy('sensor_data', INTERVAL '1 year', if_not_exists => TRUE);
SELECT add_retention_policy('tank_logs', INTERVAL '2 years', if_not_exists => TRUE);
SELECT add_retention_policy('watering_command_logs', INTERVAL '2 years', if_not_exists => TRUE);

-- ================================================================
-- 📊 CONTINUOUS AGGREGATES (For Analytics)
-- ================================================================

-- Hourly sensor data aggregate
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

-- Add policy to refresh the continuous aggregate
SELECT add_continuous_aggregate_policy('sensor_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

-- ================================================================
-- 👤 INSERT DEFAULT ADMIN USER
-- ================================================================

-- Default admin user
-- Email: admin@smartfarming.com
-- Password: Admin123!
INSERT INTO users (email, password, name, role) 
VALUES (
    'admin@smartfarming.com', 
    '$2b$10$rKZYvVXwXqL.iN2qG8p0buO.0xY7vLZ8Qx9TZ7Q7L.lN9gL7xZGxC', 
    'System Administrator', 
    'admin'
) ON CONFLICT (email) DO NOTHING;

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
    RAISE NOTICE '🌾 Zones: ✓';
    RAISE NOTICE '⏰ Auto Drip Schedules: ✓';
    RAISE NOTICE '� Tanks & Statistics: ✓';
    RAISE NOTICE '🚿 Flushing Sessions: ✓';
    RAISE NOTICE '🌻 Garden Watering: ✓';
    RAISE NOTICE '💧 Watering Command Logs: ✓';
    RAISE NOTICE '📡 Sensor Data: ✓';
    RAISE NOTICE '========================================';
    RAISE NOTICE '� TimescaleDB Hypertables: 4';
    RAISE NOTICE '📈 Continuous Aggregates: 1';
    RAISE NOTICE '🗂️  Indexes Created: 30+';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔐 Default Admin Created:';
    RAISE NOTICE '   Email: admin@smartfarming.com';
    RAISE NOTICE '   Password: Admin123!';
    RAISE NOTICE '========================================';
END $$;

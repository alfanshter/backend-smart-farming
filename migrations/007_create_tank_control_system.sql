-- Migration: Create Tank Control System Tables
-- Description: Tables for tank/tandon control with agitator, manual fill, auto fill, and statistics

-- Table: tanks
-- Main tank configuration table
CREATE TABLE IF NOT EXISTS tanks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    device_id VARCHAR(255) NOT NULL, -- ESP32 device ID for MQTT control (pompa, agitator)
    sensor_device_id VARCHAR(255), -- ESP32 device ID for level sensor (optional)
    capacity NUMERIC(10, 2) NOT NULL CHECK (capacity >= 10 AND capacity <= 100000), -- Capacity in liters
    current_level NUMERIC(5, 2) DEFAULT 0 CHECK (current_level >= 0 AND current_level <= 100), -- Current level in percentage (0-100)
    is_active BOOLEAN DEFAULT true,
    
    -- Auto Fill Settings
    auto_fill_enabled BOOLEAN DEFAULT false,
    auto_fill_min_level NUMERIC(5, 2) DEFAULT 30 CHECK (auto_fill_min_level >= 0 AND auto_fill_min_level <= 80),
    auto_fill_max_level NUMERIC(5, 2) DEFAULT 90 CHECK (auto_fill_max_level >= 50 AND auto_fill_max_level <= 100),
    
    -- Manual Fill Settings
    manual_fill_max_level NUMERIC(5, 2) DEFAULT 95 CHECK (manual_fill_max_level >= 50 AND manual_fill_max_level <= 100),
    manual_fill_duration INTEGER CHECK (manual_fill_duration >= 1 AND manual_fill_duration <= 180), -- Duration in minutes
    
    -- Agitator Settings
    agitator_enabled BOOLEAN DEFAULT false,
    agitator_status BOOLEAN DEFAULT false, -- Current status (on/off)
    
    -- User relationship
    user_id UUID NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT check_auto_fill_levels CHECK (auto_fill_min_level < auto_fill_max_level)
);

-- Table: tank_statistics
-- Daily statistics for water usage and fill tracking
CREATE TABLE IF NOT EXISTS tank_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tank_id UUID NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Water metrics
    total_usage NUMERIC(10, 2) DEFAULT 0, -- Total water used (liters)
    total_filled NUMERIC(10, 2) DEFAULT 0, -- Total water filled (liters)
    
    -- Level statistics
    average_level NUMERIC(5, 2) DEFAULT 0,
    min_level NUMERIC(5, 2) DEFAULT 100,
    max_level NUMERIC(5, 2) DEFAULT 0,
    
    -- Fill counts
    auto_fill_count INTEGER DEFAULT 0, -- How many times auto fill triggered
    manual_fill_count INTEGER DEFAULT 0, -- How many times manual fill used
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key
    FOREIGN KEY (tank_id) REFERENCES tanks(id) ON DELETE CASCADE,
    
    -- Unique constraint: one record per tank per day
    UNIQUE(tank_id, date)
);

-- Table: tank_logs
-- Activity logs for tank operations
CREATE TABLE IF NOT EXISTS tank_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tank_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL, -- auto_fill_start, auto_fill_stop, manual_fill_start, etc.
    level_before NUMERIC(5, 2) NOT NULL,
    level_after NUMERIC(5, 2) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB, -- Additional data (JSON format)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key
    FOREIGN KEY (tank_id) REFERENCES tanks(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tanks_user_id ON tanks(user_id);
CREATE INDEX IF NOT EXISTS idx_tanks_device_id ON tanks(device_id);
CREATE INDEX IF NOT EXISTS idx_tanks_active ON tanks(is_active);
CREATE INDEX IF NOT EXISTS idx_tank_statistics_tank_id ON tank_statistics(tank_id);
CREATE INDEX IF NOT EXISTS idx_tank_statistics_date ON tank_statistics(date);
CREATE INDEX IF NOT EXISTS idx_tank_logs_tank_id ON tank_logs(tank_id);
CREATE INDEX IF NOT EXISTS idx_tank_logs_created_at ON tank_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_tank_logs_type ON tank_logs(type);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tank_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for tanks table
CREATE TRIGGER trigger_update_tank_updated_at
    BEFORE UPDATE ON tanks
    FOR EACH ROW
    EXECUTE FUNCTION update_tank_updated_at();

-- Trigger for tank_statistics table
CREATE TRIGGER trigger_update_tank_statistics_updated_at
    BEFORE UPDATE ON tank_statistics
    FOR EACH ROW
    EXECUTE FUNCTION update_tank_updated_at();

-- Insert sample data (optional - for testing)
-- Uncomment below if you want sample data

-- INSERT INTO tanks (
--     name, description, device_id, capacity, current_level,
--     auto_fill_enabled, auto_fill_min_level, auto_fill_max_level,
--     manual_fill_max_level, agitator_enabled, user_id
-- ) VALUES (
--     'Main Water Tank',
--     'Primary water storage tank for irrigation',
--     'ESP32_TANK_001',
--     1000,
--     75,
--     true,
--     60,
--     90,
--     89,
--     true,
--     (SELECT id FROM users WHERE email = 'admin@smartfarming.com' LIMIT 1)
-- );

-- Comments for documentation
COMMENT ON TABLE tanks IS 'Main tank/tandon configuration and settings';
COMMENT ON TABLE tank_statistics IS 'Daily water usage and fill statistics per tank';
COMMENT ON TABLE tank_logs IS 'Activity logs for tank operations and events';

COMMENT ON COLUMN tanks.current_level IS 'Current water level in percentage (0-100)';
COMMENT ON COLUMN tanks.auto_fill_min_level IS 'Minimum level to trigger auto fill (%)';
COMMENT ON COLUMN tanks.auto_fill_max_level IS 'Maximum level to stop auto fill (%)';
COMMENT ON COLUMN tanks.manual_fill_max_level IS 'Maximum allowed level for manual fill (%)';
COMMENT ON COLUMN tanks.agitator_status IS 'Current status of agitator/pengaduk (true=on, false=off)';

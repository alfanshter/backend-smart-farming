-- Simple PostgreSQL schema (without TimescaleDB extension)

-- Create devices table
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  mqtt_topic VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'OFFLINE',
  is_active BOOLEAN DEFAULT true,
  last_seen TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(type);
CREATE INDEX IF NOT EXISTS idx_devices_mqtt_topic ON devices(mqtt_topic);

-- Create sensor_data table (regular table, not hypertable)
CREATE TABLE IF NOT EXISTS sensor_data (
  id SERIAL PRIMARY KEY,
  time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  sensor_type VARCHAR(50) NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  unit VARCHAR(20) NOT NULL,
  metadata JSONB
);

-- Create indexes for sensor data
CREATE INDEX IF NOT EXISTS idx_sensor_device_time ON sensor_data (device_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_type_time ON sensor_data (sensor_type, time DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_time ON sensor_data (time DESC);

-- Create hourly aggregate view (regular view, not continuous aggregate)
CREATE OR REPLACE VIEW sensor_hourly AS
SELECT 
  date_trunc('hour', time) AS hour,
  device_id,
  sensor_type,
  AVG(value) as avg_value,
  MAX(value) as max_value,
  MIN(value) as min_value,
  COUNT(*) as sample_count
FROM sensor_data
GROUP BY hour, device_id, sensor_type;

-- Log successful initialization
DO $$
BEGIN
  RAISE NOTICE '✅ PostgreSQL initialized successfully!';
  RAISE NOTICE '📊 Tables created: devices, sensor_data';
  RAISE NOTICE '📈 View created: sensor_hourly';
END $$;

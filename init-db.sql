-- Initialize TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

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

-- Create index untuk query cepat
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(type);
CREATE INDEX IF NOT EXISTS idx_devices_mqtt_topic ON devices(mqtt_topic);

-- Create sensor_data table untuk future use
CREATE TABLE IF NOT EXISTS sensor_data (
  time TIMESTAMPTZ NOT NULL,
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  sensor_type VARCHAR(50) NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  unit VARCHAR(20) NOT NULL,
  metadata JSONB
);

-- Convert sensor_data ke hypertable (TimescaleDB magic!)
SELECT create_hypertable('sensor_data', 'time', if_not_exists => TRUE);

-- Create index untuk sensor data
CREATE INDEX IF NOT EXISTS idx_sensor_device_time ON sensor_data (device_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_type_time ON sensor_data (sensor_type, time DESC);

-- Add compression policy (compress data older than 7 days)
SELECT add_compression_policy('sensor_data', INTERVAL '7 days', if_not_exists => TRUE);

-- Add retention policy (drop data older than 1 year)
SELECT add_retention_policy('sensor_data', INTERVAL '1 year', if_not_exists => TRUE);

-- Create continuous aggregate for hourly sensor averages
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
  if_not_exists => TRUE);

-- Log successful initialization
DO $$
BEGIN
  RAISE NOTICE '✅ TimescaleDB initialized successfully!';
  RAISE NOTICE '📊 Tables created: devices, sensor_data';
  RAISE NOTICE '🚀 Hypertable created for sensor_data';
  RAISE NOTICE '📈 Continuous aggregate created: sensor_hourly';
END $$;

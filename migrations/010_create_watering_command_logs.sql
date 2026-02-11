-- Migration: Create watering_command_logs table
-- Purpose: Track MQTT commands sent to ESP32 and their responses
-- Date: 2026-02-11

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create watering_command_logs table
CREATE TABLE IF NOT EXISTS watering_command_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id UUID NOT NULL,
    command VARCHAR(50) NOT NULL,  -- START_MANUAL, STOP_MANUAL, START_AUTO, STOP_AUTO
    
    -- Status tracking
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ack_received_at TIMESTAMPTZ,
    status_confirmed_at TIMESTAMPTZ,
    
    -- Response dari ESP32
    ack_received BOOLEAN DEFAULT FALSE,
    status VARCHAR(50),  -- WATERING_STARTED, WATERING_STOPPED
    pump_status VARCHAR(20),  -- ON, OFF
    solenoid_status VARCHAR(20),  -- OPEN, CLOSED
    actual_duration_seconds INTEGER,  -- Durasi sebenarnya dari ESP32
    
    -- Error handling
    error_message TEXT,
    timeout BOOLEAN DEFAULT FALSE,
    retry_count INTEGER DEFAULT 0,
    
    -- Metadata
    requested_by UUID,  -- user yang request
    source VARCHAR(20),  -- MANUAL, AUTO_DRIP, SCHEDULE
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_watering_command_logs_zone_id ON watering_command_logs(zone_id);
CREATE INDEX idx_watering_command_logs_sent_at ON watering_command_logs(sent_at DESC);
CREATE INDEX idx_watering_command_logs_status ON watering_command_logs(status);
CREATE INDEX idx_watering_command_logs_ack ON watering_command_logs(ack_received, sent_at);
CREATE INDEX idx_watering_command_logs_timeout ON watering_command_logs(timeout) WHERE timeout = TRUE;

-- Add comments for documentation
COMMENT ON TABLE watering_command_logs IS 'Log semua MQTT command yang dikirim ke ESP32 dan response-nya';
COMMENT ON COLUMN watering_command_logs.command IS 'Perintah yang dikirim (START_MANUAL, STOP_MANUAL, dll)';
COMMENT ON COLUMN watering_command_logs.sent_at IS 'Waktu perintah dikirim ke MQTT';
COMMENT ON COLUMN watering_command_logs.ack_received_at IS 'Waktu ESP32 kirim ACK';
COMMENT ON COLUMN watering_command_logs.status_confirmed_at IS 'Waktu ESP32 konfirmasi status (pompa ON/OFF)';
COMMENT ON COLUMN watering_command_logs.actual_duration_seconds IS 'Durasi penyiraman sebenarnya dari ESP32';
COMMENT ON COLUMN watering_command_logs.timeout IS 'TRUE jika ESP32 tidak respon dalam waktu yang ditentukan';

-- Insert sample log untuk testing
INSERT INTO watering_command_logs (
    zone_id, 
    command, 
    sent_at,
    ack_received,
    ack_received_at,
    status,
    status_confirmed_at,
    pump_status,
    solenoid_status,
    actual_duration_seconds,
    source,
    notes
) VALUES (
    (SELECT id FROM zones LIMIT 1),
    'START_MANUAL',
    NOW() - INTERVAL '5 minutes',
    TRUE,
    NOW() - INTERVAL '4 minutes 59 seconds',
    'WATERING_STARTED',
    NOW() - INTERVAL '4 minutes 58 seconds',
    'ON',
    'OPEN',
    NULL,
    'MANUAL',
    'Sample command log untuk testing'
);

-- Create view untuk monitoring commands yang bermasalah
CREATE OR REPLACE VIEW v_problematic_commands AS
SELECT 
    wcl.*,
    z.name as zone_name,
    CASE 
        WHEN NOT wcl.ack_received AND (NOW() - wcl.sent_at) > INTERVAL '10 seconds' THEN 'NO_ACK_TIMEOUT'
        WHEN wcl.ack_received AND wcl.status IS NULL AND (NOW() - wcl.ack_received_at) > INTERVAL '15 seconds' THEN 'NO_STATUS_TIMEOUT'
        WHEN wcl.error_message IS NOT NULL THEN 'ERROR'
        ELSE 'OK'
    END as issue_type,
    EXTRACT(EPOCH FROM (NOW() - wcl.sent_at)) as seconds_since_sent
FROM watering_command_logs wcl
JOIN zones z ON wcl.zone_id = z.id
WHERE 
    -- Command yang belum dapat ACK dalam 10 detik
    (NOT wcl.ack_received AND (NOW() - wcl.sent_at) > INTERVAL '10 seconds')
    OR
    -- Command yang sudah ACK tapi belum dapat status dalam 15 detik
    (wcl.ack_received AND wcl.status IS NULL AND (NOW() - wcl.ack_received_at) > INTERVAL '15 seconds')
    OR
    -- Command yang error
    (wcl.error_message IS NOT NULL)
ORDER BY wcl.sent_at DESC;

COMMENT ON VIEW v_problematic_commands IS 'View untuk monitoring commands yang timeout atau error';

-- Function untuk auto-update updated_at
CREATE OR REPLACE FUNCTION update_watering_command_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_watering_command_logs_updated_at
    BEFORE UPDATE ON watering_command_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_watering_command_logs_updated_at();

COMMENT ON FUNCTION update_watering_command_logs_updated_at IS 'Auto-update updated_at timestamp';

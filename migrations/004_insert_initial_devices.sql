-- Migration: Insert initial devices for Smart Farming system
-- Description: Menambahkan device ESP32 yang sudah terkonfigurasi di sistem

-- Insert ESP32 Device yang sedang running (dari MQTT logs)
INSERT INTO devices (
    id,
    name,
    type,
    mqtt_topic,
    status,
    is_active,
    last_seen,
    metadata,
    created_at,
    updated_at
) VALUES (
    'f17ee499-c275-4197-8fef-2a30271a3380',
    'ESP32 Device 1',
    'ESP32_WATERING_CONTROLLER',
    'Smartfarming/device1/command',
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

-- Insert additional example devices (optional)
INSERT INTO devices (
    id,
    name,
    type,
    mqtt_topic,
    status,
    is_active,
    last_seen,
    metadata,
    created_at,
    updated_at
) VALUES 
(
    'd17ee499-c275-4197-8fef-2a30271a3381',
    'ESP32 Device 2',
    'ESP32_WATERING_CONTROLLER',
    'Smartfarming/device2/command',
    'OFFLINE',
    true,
    NOW(),
    '{"location": "Greenhouse B", "firmware": "v1.0.0", "capabilities": ["watering", "sensor"]}'::jsonb,
    NOW(),
    NOW()
),
(
    'd17ee499-c275-4197-8fef-2a30271a3382',
    'ESP32 Device 3',
    'ESP32_WATERING_CONTROLLER',
    'Smartfarming/device3/command',
    'OFFLINE',
    true,
    NOW(),
    '{"location": "Greenhouse C", "firmware": "v1.0.0", "capabilities": ["watering", "sensor"]}'::jsonb,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Update zones to link with devices
UPDATE zones SET device_id = 'f17ee499-c275-4197-8fef-2a30271a3380' WHERE name = 'Zona A';
UPDATE zones SET device_id = 'd17ee499-c275-4197-8fef-2a30271a3381' WHERE name = 'Zona B';
UPDATE zones SET device_id = 'd17ee499-c275-4197-8fef-2a30271a3382' WHERE name = 'Zona C';

-- Comments
COMMENT ON COLUMN devices.id IS 'UUID device, matching dengan deviceId dari ESP32';
COMMENT ON COLUMN devices.mqtt_topic IS 'MQTT topic LENGKAP untuk publish command (contoh: Smartfarming/device1/command)';
COMMENT ON COLUMN devices.metadata IS 'JSON metadata berisi location, firmware version, capabilities, dll';

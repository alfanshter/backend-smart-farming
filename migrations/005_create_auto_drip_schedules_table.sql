-- Migration: Create auto_drip_schedules table
-- Description: Table untuk menyimpan jadwal penyiraman otomatis dengan time slots dan active days

CREATE TABLE IF NOT EXISTS auto_drip_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    time_slots JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Format time_slots: [{"startTime": "07:00", "durationMinutes": 4, "durationSeconds": 0}, ...]
    active_days JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Format active_days: ["monday", "wednesday", "friday"]
    user_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes untuk query performance
CREATE INDEX IF NOT EXISTS idx_auto_drip_zone_id ON auto_drip_schedules(zone_id);
CREATE INDEX IF NOT EXISTS idx_auto_drip_user_id ON auto_drip_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_drip_is_active ON auto_drip_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_auto_drip_created_at ON auto_drip_schedules(created_at DESC);

-- Index untuk JSONB query (mencari berdasarkan time_slots dan active_days)
CREATE INDEX IF NOT EXISTS idx_auto_drip_time_slots ON auto_drip_schedules USING GIN (time_slots);
CREATE INDEX IF NOT EXISTS idx_auto_drip_active_days ON auto_drip_schedules USING GIN (active_days);

-- Trigger untuk auto-update updated_at
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

-- Comments untuk dokumentasi
COMMENT ON TABLE auto_drip_schedules IS 'Jadwal penyiraman otomatis dengan time slots dan active days';
COMMENT ON COLUMN auto_drip_schedules.zone_id IS 'ID zona yang dijadwalkan (foreign key ke zones table)';
COMMENT ON COLUMN auto_drip_schedules.is_active IS 'Status aktif/non-aktif jadwal';
COMMENT ON COLUMN auto_drip_schedules.time_slots IS 'Array of time slots: [{"startTime": "07:00", "durationMinutes": 4, "durationSeconds": 0}]';
COMMENT ON COLUMN auto_drip_schedules.active_days IS 'Hari aktif dalam seminggu: ["monday", "tuesday", ...]';

-- Sample data untuk testing
INSERT INTO auto_drip_schedules (zone_id, is_active, time_slots, active_days, user_id)
VALUES 
    (
        'a0000000-0000-0000-0000-000000000001', -- Zona A
        true,
        '[
            {"startTime": "07:00", "durationMinutes": 4, "durationSeconds": 0},
            {"startTime": "17:00", "durationMinutes": 3, "durationSeconds": 30}
        ]'::jsonb,
        '["monday", "wednesday", "friday"]'::jsonb,
        (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
    ),
    (
        'a0000000-0000-0000-0000-000000000002', -- Zona B
        true,
        '[
            {"startTime": "06:30", "durationMinutes": 5, "durationSeconds": 0},
            {"startTime": "18:00", "durationMinutes": 4, "durationSeconds": 0}
        ]'::jsonb,
        '["tuesday", "thursday", "saturday"]'::jsonb,
        (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
    )
ON CONFLICT DO NOTHING;

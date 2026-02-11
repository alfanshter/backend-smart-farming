-- Migration: Create zones table for manual watering control
-- Description: Table untuk menyimpan zona penyiraman dengan kontrol manual dan countdown timer

CREATE TABLE IF NOT EXISTS zones (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    device_id UUID,  -- NULLABLE: Zone bisa belum punya device
    is_active BOOLEAN DEFAULT FALSE,
    duration_minutes INTEGER DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    started_at TIMESTAMP,
    remaining_seconds INTEGER,
    user_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes untuk query performance
CREATE INDEX IF NOT EXISTS idx_zones_user_id ON zones(user_id);
CREATE INDEX IF NOT EXISTS idx_zones_device_id ON zones(device_id);
CREATE INDEX IF NOT EXISTS idx_zones_is_active ON zones(is_active);
CREATE INDEX IF NOT EXISTS idx_zones_created_at ON zones(created_at DESC);

-- Trigger untuk auto-update updated_at
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

-- Sample data: Create default zones
INSERT INTO zones (id, name, description, device_id, is_active, duration_minutes, duration_seconds, user_id, created_at, updated_at)
VALUES 
    (
        'a0000000-0000-0000-0000-000000000001',
        'Zona A',
        'Zona penyiraman area A - Greenhouse utara',
        (SELECT id FROM devices LIMIT 1), -- Menggunakan device pertama yang ada
        false,
        8,
        20,
        (SELECT id FROM users WHERE role = 'admin' LIMIT 1), -- Menggunakan admin user
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

-- Comments untuk dokumentasi
COMMENT ON TABLE zones IS 'Zona penyiraman dengan kontrol manual dan countdown timer';
COMMENT ON COLUMN zones.id IS 'UUID primary key';
COMMENT ON COLUMN zones.name IS 'Nama zona (e.g., Zona A, Zona B)';
COMMENT ON COLUMN zones.description IS 'Deskripsi zona penyiraman';
COMMENT ON COLUMN zones.device_id IS 'ID device pump/valve yang mengontrol zona';
COMMENT ON COLUMN zones.is_active IS 'Status zona aktif/tidak (penyiraman berjalan)';
COMMENT ON COLUMN zones.duration_minutes IS 'Durasi penyiraman dalam menit';
COMMENT ON COLUMN zones.duration_seconds IS 'Durasi detik tambahan (0-59)';
COMMENT ON COLUMN zones.started_at IS 'Timestamp saat zona diaktifkan';
COMMENT ON COLUMN zones.remaining_seconds IS 'Sisa waktu countdown (untuk recovery)';
COMMENT ON COLUMN zones.user_id IS 'User yang membuat/mengaktifkan zona';

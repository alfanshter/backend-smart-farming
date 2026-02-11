-- Migration: Create Flushing System
-- Description: Sistem pembilasan otomatis untuk membersihkan pipa irigasi
-- Created: 2026-02-11

-- =====================================================
-- TABLE: flushing_sessions
-- Purpose: Menyimpan sesi flushing (pembilasan)
-- =====================================================

CREATE TABLE IF NOT EXISTS flushing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 1 AND duration_minutes <= 180),
  status VARCHAR(20) NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'stopped', 'failed')),
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  total_duration_minutes INTEGER, -- Durasi aktual yang berjalan (bisa < duration_minutes jika di-stop)
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_flushing_sessions_user_id ON flushing_sessions(user_id);
CREATE INDEX idx_flushing_sessions_status ON flushing_sessions(status);
CREATE INDEX idx_flushing_sessions_started_at ON flushing_sessions(started_at DESC);

-- Auto-update timestamp trigger
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

-- =====================================================
-- TABLE: flushing_logs
-- Purpose: Log detail aktivitas flushing
-- =====================================================

CREATE TABLE IF NOT EXISTS flushing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES flushing_sessions(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('started', 'stopped', 'completed', 'failed', 'status_update')),
  message TEXT NOT NULL,
  metadata JSONB, -- Additional data (device info, etc)
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_flushing_logs_session_id ON flushing_logs(session_id);
CREATE INDEX idx_flushing_logs_created_at ON flushing_logs(created_at DESC);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE flushing_sessions IS 'Flushing sessions untuk pembilasan pipa irigasi';
COMMENT ON COLUMN flushing_sessions.duration_minutes IS 'Durasi yang direncanakan (1-180 menit)';
COMMENT ON COLUMN flushing_sessions.total_duration_minutes IS 'Durasi aktual yang berjalan';
COMMENT ON COLUMN flushing_sessions.status IS 'Status: running, completed, stopped, failed';

COMMENT ON TABLE flushing_logs IS 'Log aktivitas flushing untuk audit trail';

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Insert sample completed flushing (sudah selesai)
-- INSERT INTO flushing_sessions (user_id, duration_minutes, status, started_at, completed_at, total_duration_minutes, notes)
-- SELECT 
--   id, 
--   15, 
--   'completed', 
--   NOW() - INTERVAL '1 hour', 
--   NOW() - INTERVAL '45 minutes', 
--   15,
--   'Flushing otomatis selesai'
-- FROM users WHERE email = 'admin@smartfarming.com' LIMIT 1;

-- Migration: Create Users Table
-- Description: Tabel untuk menyimpan data user dengan authentication

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    refresh_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: Admin123!)
-- Note: Password hash untuk 'Admin123!' dengan bcrypt salt rounds 10
INSERT INTO users (email, password, full_name, role, is_active)
VALUES (
    'admin@smartfarming.com',
    '$2b$10$GrVisTVYZ1l7DPp597NCZOY6yMPuHIM4c/2..wMouEbnO09wRiJze',
    'Super Admin',
    'admin',
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- Add comments to table and columns
COMMENT ON TABLE users IS 'Tabel untuk menyimpan data user dengan authentication';
COMMENT ON COLUMN users.id IS 'Primary key UUID';
COMMENT ON COLUMN users.email IS 'Email user (unique)';
COMMENT ON COLUMN users.password IS 'Password yang sudah di-hash dengan bcrypt';
COMMENT ON COLUMN users.full_name IS 'Nama lengkap user';
COMMENT ON COLUMN users.role IS 'Role user: admin, user, farmer';
COMMENT ON COLUMN users.is_active IS 'Status aktif user';
COMMENT ON COLUMN users.refresh_token IS 'Refresh token yang sudah di-hash';
COMMENT ON COLUMN users.created_at IS 'Timestamp saat user dibuat';
COMMENT ON COLUMN users.updated_at IS 'Timestamp saat user terakhir diupdate';

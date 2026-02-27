-- FreezerApp Sync Database Schema
-- Version: 1.0.0

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (anonymous users identified by device_id)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pairs table (shared freezers)
CREATE TABLE IF NOT EXISTS pairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'Мой холодильник',
    server_version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pair members (max 2 users per pair)
CREATE TABLE IF NOT EXISTS pair_members (
    pair_id UUID NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (pair_id, user_id)
);

-- Invite codes (6-character codes, valid for 24 hours)
CREATE TABLE IF NOT EXISTS invites (
    code TEXT PRIMARY KEY,
    pair_id UUID NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    expires_at TIMESTAMPTZ NOT NULL,
    used_by UUID REFERENCES users(id),
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY,
    pair_id UUID NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    sort_order INT,

    -- Sync fields
    updated_at TIMESTAMPTZ NOT NULL,
    deleted_at TIMESTAMPTZ,
    server_version BIGINT NOT NULL
);

-- Items (frozen food items)
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY,
    pair_id UUID NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,

    name TEXT NOT NULL,
    packages_count INT NOT NULL DEFAULT 1,
    items_count INT NOT NULL DEFAULT 1,
    shelf_number INT NOT NULL DEFAULT 1 CHECK (shelf_number >= 1 AND shelf_number <= 20),
    freeze_date DATE NOT NULL,
    expiration_date DATE NOT NULL,
    notes TEXT,
    photo_url TEXT,

    -- Sync fields
    updated_at TIMESTAMPTZ NOT NULL,
    deleted_at TIMESTAMPTZ,
    server_version BIGINT NOT NULL
);

-- History events
CREATE TABLE IF NOT EXISTS history_events (
    id UUID PRIMARY KEY,
    pair_id UUID NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,

    type TEXT NOT NULL CHECK (type IN ('itemAdded', 'quantityChanged')),
    item_id UUID NOT NULL,
    category_id UUID NOT NULL,
    item_name TEXT NOT NULL,

    packages_delta INT,
    items_delta INT,
    new_packages INT,
    new_items INT,

    -- Sync fields
    timestamp TIMESTAMPTZ NOT NULL,
    deleted_at TIMESTAMPTZ,
    server_version BIGINT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id);
CREATE INDEX IF NOT EXISTS idx_pair_members_user ON pair_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pair_members_pair ON pair_members(pair_id);

CREATE INDEX IF NOT EXISTS idx_invites_code ON invites(code) WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invites_pair ON invites(pair_id);
CREATE INDEX IF NOT EXISTS idx_invites_expires ON invites(expires_at) WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_categories_pair_version ON categories(pair_id, server_version) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_categories_pair ON categories(pair_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_items_pair_version ON items(pair_id, server_version) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_items_pair ON items(pair_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_history_pair_version ON history_events(pair_id, server_version);
CREATE INDEX IF NOT EXISTS idx_history_pair ON history_events(pair_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for pairs table (wrapped to avoid error on re-run)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_pairs_updated_at'
    ) THEN
        CREATE TRIGGER update_pairs_updated_at
            BEFORE UPDATE ON pairs
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END;
$$;

-- Comments for documentation
COMMENT ON TABLE users IS 'Anonymous users identified by device_id';
COMMENT ON TABLE pairs IS 'Shared freezers (max 2 members)';
COMMENT ON TABLE pair_members IS 'Join table for users and pairs';
COMMENT ON TABLE invites IS 'Invite codes for joining pairs (6 chars, 24h expiry)';
COMMENT ON TABLE categories IS 'Food categories with sync versioning';
COMMENT ON TABLE items IS 'Frozen food items with sync versioning';
COMMENT ON TABLE history_events IS 'History of item changes';

COMMENT ON COLUMN pairs.server_version IS 'Monotonic counter incremented on each change';
COMMENT ON COLUMN categories.updated_at IS 'Client timestamp for conflict resolution';
COMMENT ON COLUMN categories.deleted_at IS 'Soft delete timestamp';
COMMENT ON COLUMN categories.server_version IS 'Server version when this record was last modified';

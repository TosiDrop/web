-- Migration: Create user_favorites table for per-user favorite tokens.
-- Keyed by stake address (matches users.stake_address). ticker/logo are
-- denormalized snapshots so the profile favorites view is self-contained.
CREATE TABLE IF NOT EXISTS user_favorites (
  stake_address TEXT NOT NULL,
  asset_id      TEXT NOT NULL,
  ticker        TEXT,
  logo          TEXT,
  position      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (stake_address, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_stake
  ON user_favorites (stake_address, position);

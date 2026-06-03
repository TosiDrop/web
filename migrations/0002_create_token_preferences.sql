-- Migration: Create token_preferences table for per-user favorite/disliked tokens.
-- Keyed by stake address (matches users.stake_address). ticker/logo are
-- denormalized snapshots so the profile views are self-contained. `kind`
-- makes favorite-vs-dislike mutually exclusive via the primary key.
CREATE TABLE IF NOT EXISTS token_preferences (
  stake_address TEXT NOT NULL,
  asset_id      TEXT NOT NULL,
  ticker        TEXT,
  logo          TEXT,
  kind          TEXT NOT NULL CHECK (kind IN ('favorite', 'dislike')),
  position      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (stake_address, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_token_preferences_stake
  ON token_preferences (stake_address, kind, position);

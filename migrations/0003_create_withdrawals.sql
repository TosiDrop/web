-- Migration: Create withdrawals table syncing the VM API's delivered rewards
-- so history accumulates beyond its ~100-row window. Rows are immutable;
-- sync inserts with ON CONFLICT DO NOTHING. delivered_at is parsed unix
-- seconds (nullable) used for sorting and range filters.
CREATE TABLE IF NOT EXISTS withdrawals (
  stake_address      TEXT NOT NULL,
  reward_id          TEXT NOT NULL,
  token              TEXT NOT NULL,
  amount             TEXT NOT NULL,
  epoch              INTEGER,
  delivered_on       TEXT NOT NULL,
  delivered_at       INTEGER,
  withdrawal_request TEXT,
  synced_at          TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (stake_address, reward_id)
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_stake_time
  ON withdrawals (stake_address, delivered_at DESC);

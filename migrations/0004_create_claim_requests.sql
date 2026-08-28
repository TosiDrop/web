-- Persist fee quotes for accepted claim requests so personal analytics can
-- report actual historical fees once the matching withdrawal is delivered.
CREATE TABLE IF NOT EXISTS claim_requests (
  request_id     TEXT NOT NULL,
  stake_address  TEXT NOT NULL,
  network        TEXT NOT NULL,
  token_count    INTEGER NOT NULL,
  deposit        TEXT NOT NULL,
  withdrawal_fee TEXT,
  tokens_fee     TEXT,
  tx_fee         TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (network, request_id)
);

CREATE INDEX IF NOT EXISTS idx_claim_requests_stake_time
  ON claim_requests (stake_address, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_claim_requests_stake_network
  ON claim_requests (stake_address, network);

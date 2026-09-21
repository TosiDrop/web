-- Durable wallet read-model snapshots. The payload is versioned by the API
-- contract and scoped by network so Preview and Mainnet never mix.
CREATE TABLE IF NOT EXISTS wallet_snapshots (
  network       TEXT NOT NULL,
  stake_address TEXT NOT NULL,
  observed_at   INTEGER NOT NULL,
  payload       TEXT NOT NULL,
  PRIMARY KEY (network, stake_address, observed_at)
);

CREATE INDEX IF NOT EXISTS idx_wallet_snapshots_lookup
  ON wallet_snapshots (network, stake_address, observed_at DESC);

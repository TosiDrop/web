CREATE TABLE IF NOT EXISTS wallet_snapshots_latest (
  network      TEXT NOT NULL,
  stake_address TEXT NOT NULL,
  observed_at   INTEGER NOT NULL,
  payload       TEXT NOT NULL,
  PRIMARY KEY (network, stake_address)
);

INSERT INTO wallet_snapshots_latest (network, stake_address, observed_at, payload)
SELECT current.network, current.stake_address, current.observed_at, current.payload
FROM wallet_snapshots AS current
JOIN (
  SELECT network, stake_address, MAX(observed_at) AS observed_at
  FROM wallet_snapshots
  GROUP BY network, stake_address
) AS latest
  ON latest.network = current.network
 AND latest.stake_address = current.stake_address
 AND latest.observed_at = current.observed_at
ON CONFLICT(network, stake_address) DO UPDATE SET
  observed_at = excluded.observed_at,
  payload = excluded.payload;

DROP TABLE wallet_snapshots;
ALTER TABLE wallet_snapshots_latest RENAME TO wallet_snapshots;

CREATE INDEX IF NOT EXISTS idx_wallet_snapshots_lookup
  ON wallet_snapshots (network, stake_address);

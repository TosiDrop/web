-- Existing withdrawal rows were collected before network switching shipped,
-- when the Worker used Preview exclusively. Backfill them to Preview so the
-- accumulated archive remains visible; Mainnet starts its own clean history.
CREATE TABLE withdrawals_networked (
  network            TEXT NOT NULL,
  stake_address      TEXT NOT NULL,
  reward_id          TEXT NOT NULL,
  token              TEXT NOT NULL,
  amount             TEXT NOT NULL,
  epoch              INTEGER,
  delivered_on       TEXT NOT NULL,
  delivered_at       INTEGER,
  withdrawal_request TEXT,
  synced_at          TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (network, stake_address, reward_id)
);

INSERT INTO withdrawals_networked (
  network, stake_address, reward_id, token, amount, epoch,
  delivered_on, delivered_at, withdrawal_request, synced_at
)
SELECT
  'preview', stake_address, reward_id, token, amount, epoch,
  delivered_on, delivered_at, withdrawal_request, synced_at
FROM withdrawals;

DROP TABLE withdrawals;
ALTER TABLE withdrawals_networked RENAME TO withdrawals;

CREATE INDEX idx_withdrawals_network_stake_time
  ON withdrawals (network, stake_address, delivered_at DESC);

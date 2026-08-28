-- Scope the withdrawals archive by network so a Preview and a Mainnet
-- deployment never read each other's rows.
--
-- Re-application guard. SQLite cannot make DROP TABLE / RENAME conditional,
-- and an unguarded re-run of this file would rebuild the already-migrated
-- table and relabel every row. D1 applies a migration file as one batch, so
-- making the FIRST statement fail on a second application (duplicate column)
-- aborts the whole file and leaves the archive untouched. If a deployment
-- that was migrated with `d1 execute --file` later switches to
-- `d1 migrations apply`, this is the file that will refuse to replay: record
-- it in d1_migrations by hand rather than editing this guard.
ALTER TABLE withdrawals ADD COLUMN network TEXT;

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

-- Cardano stake addresses are network-tagged (stake_test… on Preview), so the
-- network of every existing row is recoverable from the row itself; it does
-- not depend on what VM_BASE_URL happened to be when the row was written.
INSERT INTO withdrawals_networked (
  network, stake_address, reward_id, token, amount, epoch,
  delivered_on, delivered_at, withdrawal_request, synced_at
)
SELECT
  CASE WHEN stake_address LIKE 'stake_test%' THEN 'preview' ELSE 'mainnet' END,
  stake_address, reward_id, token, amount, epoch,
  delivered_on, delivered_at, withdrawal_request, synced_at
FROM withdrawals;

DROP TABLE withdrawals;
ALTER TABLE withdrawals_networked RENAME TO withdrawals;

-- Every reader (history, personalAnalytics) filters on network first, so one
-- index covers both the paginated history query and its COUNT(*).
CREATE INDEX IF NOT EXISTS idx_withdrawals_network_stake_time
  ON withdrawals (network, stake_address, delivered_at DESC);

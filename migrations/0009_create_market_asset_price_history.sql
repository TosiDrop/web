-- Hourly source observations retained for portfolio and token charts.
CREATE TABLE IF NOT EXISTS market_asset_price_history (
  network     TEXT NOT NULL,
  unit        TEXT NOT NULL,
  source      TEXT NOT NULL,
  observed_at INTEGER NOT NULL,
  price_ada   REAL,
  price_usd   REAL,
  PRIMARY KEY (network, unit, source, observed_at)
);

CREATE INDEX IF NOT EXISTS idx_market_asset_price_history_lookup
  ON market_asset_price_history (network, unit, observed_at DESC);

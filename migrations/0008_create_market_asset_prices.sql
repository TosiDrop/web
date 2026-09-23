-- Provider data is ingested separately; request paths only read this cache.
CREATE TABLE IF NOT EXISTS market_asset_prices (
  network          TEXT NOT NULL,
  unit             TEXT NOT NULL,
  source           TEXT NOT NULL,
  price_ada        REAL,
  price_usd        REAL,
  price_change_24h REAL,
  observed_at      INTEGER NOT NULL,
  PRIMARY KEY (network, unit, source)
);

CREATE INDEX IF NOT EXISTS idx_market_asset_prices_observed
  ON market_asset_prices (network, observed_at DESC);

import type { Env } from '../types/env';

export interface MarketPrice {
  unit: string;
  priceUsd: number | null;
  priceAda: number | null;
  priceChange24h: number | null;
  source: string;
  sourceCount: number;
  observedAt: number;
}

/** Reads the ingestion-owned market read model; request paths never call a DEX provider. */
export async function readMarketPrices(
  env: Env,
  network: string,
  units: string[],
): Promise<Map<string, MarketPrice>> {
  if (!env.DB || units.length === 0) return new Map();
  const placeholders = units.map(() => '?').join(', ');
  const result = await env.DB.prepare(
    `SELECT unit, price_usd AS priceUsd, price_ada AS priceAda,
            price_change_24h AS priceChange24h, source, observed_at AS observedAt
     FROM market_asset_prices
     WHERE network = ? AND unit IN (${placeholders})`,
  )
    .bind(network, ...units)
    .all<MarketPrice>();
  const grouped = new Map<string, MarketPrice[]>();
  for (const row of result.results) {
    const list = grouped.get(row.unit) ?? [];
    list.push({ ...row, sourceCount: 1 });
    grouped.set(row.unit, list);
  }

  return new Map([...grouped].map(([unit, rows]) => {
    const median = (values: number[]) => {
      const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
      if (!sorted.length) return null;
      const middle = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
    };
    return [unit, {
      unit,
      priceUsd: median(rows.map((row) => row.priceUsd ?? NaN)),
      priceAda: median(rows.map((row) => row.priceAda ?? NaN)),
      priceChange24h: median(rows.map((row) => row.priceChange24h ?? NaN)),
      source: rows.map((row) => row.source).sort().join(', '),
      sourceCount: rows.length,
      observedAt: Math.max(...rows.map((row) => row.observedAt)),
    }];
  }));
}

export interface ValueHistoryPoint {
  observedAt: number;
  valueAda: number;
}

export async function readValueHistory(
  env: Env,
  network: string,
  holdings: Array<{ unit: string; amount: number }>,
  adaBalance: number,
  days = 30,
): Promise<ValueHistoryPoint[]> {
  if (!env.DB) return [];
  const start = Math.floor(Date.now() / 1000) - days * 86_400;
  const units = ['lovelace', ...holdings.map((holding) => holding.unit)];
  const placeholders = units.map(() => '?').join(', ');
  const result = await env.DB.prepare(
    `SELECT unit, observed_at AS observedAt, price_ada AS priceAda, source
     FROM market_asset_price_history
     WHERE network = ? AND observed_at >= ? AND unit IN (${placeholders})
     ORDER BY observed_at ASC`,
  ).bind(network, start, ...units).all<{ unit: string; observedAt: number; priceAda: number | null; source: string }>();

  const buckets = new Map<number, Map<string, Map<string, number>>>();
  for (const row of result.results) {
    if (row.priceAda === null || !Number.isFinite(row.priceAda)) continue;
    const bucket = Math.floor(row.observedAt / 3600) * 3600;
    const byUnit = buckets.get(bucket) ?? new Map<string, Map<string, number>>();
    const bySource = byUnit.get(row.unit) ?? new Map<string, number>();
    bySource.set(row.source, row.priceAda);
    byUnit.set(row.unit, bySource);
    buckets.set(bucket, byUnit);
  }

  const median = (values: number[]) => {
    const sorted = values.sort((a, b) => a - b);
    if (!sorted.length) return null;
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  };

  return [...buckets].map(([observedAt, byUnit]) => {
    let valueAda = adaBalance;
    let priced = false;
    for (const holding of holdings) {
      const prices = byUnit.get(holding.unit);
      const price = prices ? median([...prices.values()]) : null;
      if (price !== null) {
        valueAda += holding.amount * price;
        priced = true;
      }
    }
    return { observedAt, valueAda: priced ? valueAda : adaBalance };
  }).filter((point) => point.valueAda > 0);
}

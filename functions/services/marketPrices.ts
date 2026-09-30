import type { Env } from '../types/env';
import { catalogAssetId, nativeAssetUnit } from '../../src/shared/assets';

function marketAliases(units: string[]): string[] {
  return [...new Set(units.flatMap((unit) => [nativeAssetUnit(unit), catalogAssetId(unit)]))];
}

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
  let result: D1Result<MarketPrice>;
  try {
    result = await env.DB.prepare(
      `SELECT unit, price_usd AS priceUsd, price_ada AS priceAda,
              price_change_24h AS priceChange24h, source, observed_at AS observedAt
       FROM market_asset_prices
       WHERE network = ? AND unit IN (SELECT value FROM json_each(?))`,
    )
      .bind(network, JSON.stringify(marketAliases(units)))
      .all<MarketPrice>();
  } catch (error) {
    console.error('market price read error:', error);
    return new Map();
  }
  const grouped = new Map<string, Map<string, MarketPrice>>();
  const now = Math.floor(Date.now() / 1000);
  for (const row of result.results) {
    // Quotes older than a day cannot contribute to a current wallet estimate.
    if (!Number.isFinite(row.observedAt) || row.observedAt < now - 86_400 || row.observedAt > now + 60) continue;
    const validPrice = (value: number | null) => value === null || (Number.isFinite(value) && value > 0);
    if (!validPrice(row.priceUsd) || !validPrice(row.priceAda) || (row.priceUsd === null && row.priceAda === null)) continue;
    const unit = nativeAssetUnit(row.unit);
    const bySource = grouped.get(unit) ?? new Map<string, MarketPrice>();
    const previous = bySource.get(row.source);
    if (!previous || row.observedAt > previous.observedAt) bySource.set(row.source, { ...row, sourceCount: 1 });
    grouped.set(unit, bySource);
  }

  const aggregated = new Map([...grouped].map(([unit, bySource]) => {
    const rows = [...bySource.values()];
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
      observedAt: Math.min(...rows.map((row) => row.observedAt)),
    }];
  }));
  return new Map(units.flatMap((unit) => {
    const price = aggregated.get(nativeAssetUnit(unit));
    return price ? [[unit, { ...price, unit }] as const] : [];
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
  let result: D1Result<{ unit: string; observedAt: number; priceAda: number | null; source: string }>;
  try {
    result = await env.DB.prepare(
      `SELECT unit, observed_at AS observedAt, price_ada AS priceAda, source
       FROM market_asset_price_history
       WHERE network = ? AND observed_at >= ? AND unit IN (SELECT value FROM json_each(?))
       ORDER BY observed_at ASC`,
    ).bind(network, start, JSON.stringify(marketAliases(units))).all<{ unit: string; observedAt: number; priceAda: number | null; source: string }>();
  } catch (error) {
    console.error('market value history read error:', error);
    return [];
  }

  const buckets = new Map<number, Map<string, Map<string, number>>>();
  for (const row of result.results) {
    if (row.priceAda === null || !Number.isFinite(row.priceAda) || row.priceAda <= 0) continue;
    const bucket = Math.floor(row.observedAt / 3600) * 3600;
    const byUnit = buckets.get(bucket) ?? new Map<string, Map<string, number>>();
    const unit = nativeAssetUnit(row.unit);
    const bySource = byUnit.get(unit) ?? new Map<string, number>();
    bySource.set(row.source, row.priceAda);
    byUnit.set(unit, bySource);
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
    let complete = true;
    for (const holding of holdings) {
      const prices = byUnit.get(nativeAssetUnit(holding.unit));
      const price = prices ? median([...prices.values()]) : null;
      if (price === null) complete = false;
      else valueAda += holding.amount * price;
    }
    return { observedAt, valueAda: complete ? valueAda : 0 };
  }).filter((point) => point.valueAda > 0);
}

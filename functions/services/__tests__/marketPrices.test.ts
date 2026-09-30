import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../../types/env';
import { readValueHistory, readMarketPrices } from '../marketPrices';

function envWithRows(rows: unknown[]): Env {
  const statement = { bind: () => statement, all: async () => ({ results: rows }) };
  return { DB: { prepare: () => statement } } as unknown as Env;
}

describe('market price freshness', () => {
  afterEach(() => vi.useRealTimers());

  it('excludes stale and invalid quotes from wallet estimates and reports the oldest contributing quote', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-30T12:00:00Z'));
    const now = Date.now() / 1000;
    const quotes = await readMarketPrices(envWithRows([
      { unit: 'token', priceUsd: 2, priceAda: 4, priceChange24h: -3, source: 'a', observedAt: now - 60 },
      { unit: 'token', priceUsd: 4, priceAda: 8, priceChange24h: -1, source: 'b', observedAt: now - 120 },
      { unit: 'token', priceUsd: 100, priceAda: 200, priceChange24h: 90, source: 'old', observedAt: now - 90000 },
      { unit: 'token', priceUsd: -10, priceAda: -20, priceChange24h: 100, source: 'invalid', observedAt: now },
      { unit: 'expired', priceUsd: 1, priceAda: 2, source: 'old', observedAt: now - 90000 },
    ]), 'mainnet', ['token', 'expired']);
    expect(quotes.get('token')).toMatchObject({ priceUsd: 3, priceAda: 6, priceChange24h: -2, source: 'a, b', sourceCount: 2, observedAt: now - 120 });
    expect(quotes.has('expired')).toBe(false);
  });

  it('keeps a wallet with 100 tokens inside the database parameter limit', async () => {
    const now = Math.floor(Date.now() / 1000);
    const units = Array.from({ length: 100 }, (_, index) => `token${index}`);
    const rows = ['lovelace', ...units].map((unit) => ({ unit, priceUsd: 1, priceAda: 1, source: 'fixture', observedAt: now }));
    const statement = {
      bind: (...args: unknown[]) => {
        if (args.length > 100) throw new Error('too many SQL variables');
        return statement;
      },
      all: async () => ({ results: rows }),
    };
    const env = { DB: { prepare: () => statement } } as unknown as Env;
    expect((await readMarketPrices(env, 'mainnet', ['lovelace', ...units])).size).toBe(101);
    expect(await readValueHistory(env, 'mainnet', units.map((unit) => ({ unit, amount: 1 })), 10)).toEqual([{ observedAt: Math.floor(now / 3600) * 3600, valueAda: 110 }]);
  });
});

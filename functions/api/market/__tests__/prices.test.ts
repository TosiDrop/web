import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../../../types/env';
import { onRequestGet } from '../prices';

type Ctx = Parameters<typeof onRequestGet>[0];

function ctx(url: string, env: Partial<Env> = {}): Ctx {
  return {
    request: new Request(`https://x${url}`, { headers: { Origin: 'http://localhost:5173' } }),
    env: { VITE_NETWORK: 'preview', ...env } as Env,
  } as unknown as Ctx;
}

function db(rows: unknown[]) {
  return {
    prepare: () => ({
      bind: () => ({ all: async () => ({ results: rows }) }),
    }),
  };
}

describe('GET /api/market/prices', () => {
  beforeEach(() => {
    vi.stubGlobal('caches', {
      default: {
        match: async () => undefined,
        put: async () => undefined,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects malformed or excessive unit lists', async () => {
    const malformed = await onRequestGet(ctx('/api/market/prices?units=valid,%3Cscript%3E'));
    expect(malformed.status).toBe(400);

    const excessive = await onRequestGet(ctx(`/api/market/prices?units=${Array.from({ length: 101 }, (_, i) => `unit${i}`).join(',')}`));
    expect(excessive.status).toBe(400);
  });

  it('returns the D1 read model without contacting a market provider', async () => {
    const response = await onRequestGet(ctx('/api/market/prices?units=asset1', {
      DB: db([
        { unit: 'asset1', priceUsd: 1, priceAda: 2, priceChange24h: 4, source: 'provider-a', observedAt: 10 },
        { unit: 'asset1', priceUsd: 3, priceAda: 4, priceChange24h: 8, source: 'provider-b', observedAt: 20 },
      ]) as unknown as D1Database,
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      network: 'preview',
      degraded: false,
      source: 'd1-read-model',
      prices: {
        asset1: {
          priceUsd: 2,
          priceAda: 3,
          priceChange24h: 6,
          sourceCount: 2,
          observedAt: 20,
        },
      },
    });
  });
});

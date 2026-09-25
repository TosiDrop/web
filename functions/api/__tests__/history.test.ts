import { describe, it, expect } from 'vitest';
import type { Env } from '../../types/env';
import { onRequestGet } from '../history';

type Ctx = Parameters<typeof onRequestGet>[0];

const STAKE = 'stake1' + 'u'.repeat(40);

function fakeDb(rows: unknown[], total: number) {
  const calls: { sql: string; binds: unknown[] }[] = [];
  const prepare = (sql: string) => ({
    bind(...b: unknown[]) {
      calls.push({ sql, binds: b });
      return this;
    },
    all: async () => ({ results: rows }),
    first: async () => ({ total }),
  });
  return { prepare, __calls: calls } as unknown as D1Database & { __calls: typeof calls };
}

function ctx(qs: string, env: Partial<Env>): Ctx {
  return {
    request: new Request(`https://x/api/history?${qs}`, {
      headers: { Origin: 'http://localhost:5173' },
    }),
    env: { VITE_VM_API_KEY: 'k', ...env } as Env,
  } as unknown as Ctx;
}

const ROW = {
  reward_id: 'r1',
  token: 'lovelace',
  amount: '1000000',
  epoch: 500,
  delivered_on: '1750000000',
  delivered_at: 1750000000,
  withdrawal_request: 'w1',
};

describe('GET /api/history', () => {
  it('400 when staking_address missing', async () => {
    const res = await onRequestGet(ctx('', {}));
    expect(res.status).toBe(400);
  });

  it('400 for a bad limit', async () => {
    const res = await onRequestGet(ctx(`staking_address=${STAKE}&limit=0`, {}));
    expect(res.status).toBe(400);
    const res2 = await onRequestGet(ctx(`staking_address=${STAKE}&limit=101`, {}));
    expect(res2.status).toBe(400);
  });

  it('400 for a bad order', async () => {
    const res = await onRequestGet(ctx(`staking_address=${STAKE}&order=sideways`, {}));
    expect(res.status).toBe(400);
  });

  it('400 when from is after to', async () => {
    const res = await onRequestGet(ctx(`staking_address=${STAKE}&from=2026-06-02&to=2026-06-01`, {}));
    expect(res.status).toBe(400);
  });

  it('degrades without a DB binding', async () => {
    const res = await onRequestGet(ctx(`staking_address=${STAKE}`, {}));
    const body = await res.json();
    expect(body).toEqual({
      items: [], page: 1, limit: 50, total: 0, hasMore: false, degraded: true,
    });
  });

  it('returns camelCase items with paging metadata', async () => {
    const db = fakeDb([ROW], 1);
    const res = await onRequestGet(ctx(`staking_address=${STAKE}`, { DB: db }));
    const body = await res.json();
    expect(body).toEqual({
      items: [{
        rewardId: 'r1', token: 'lovelace', amount: '1000000', epoch: 500,
        deliveredOn: '1750000000', deliveredAt: 1750000000, withdrawalRequest: 'w1',
        receiptPriceUsd: null, receiptPriceObservedAt: null, receiptPriceSource: null,
      }],
      page: 1, limit: 50, total: 1, hasMore: false,
    });
  });

  it('includes a historical indexed price observed before delivery', async () => {
    const db = fakeDb([{
      ...ROW,
      receipt_price_usd: 0.75,
      receipt_price_observed_at: 1749999900,
      receipt_price_source: 'index-a',
    }], 1);
    const res = await onRequestGet(ctx(`staking_address=${STAKE}`, { DB: db }));
    const body = (await res.json()) as { items: Array<Record<string, unknown>> };
    expect(body.items[0]).toMatchObject({
      receiptPriceUsd: 0.75,
      receiptPriceObservedAt: 1749999900,
      receiptPriceSource: 'index-a',
    });
    const dataSql = db.__calls.find((call) => !call.sql.includes('COUNT'))!.sql;
    expect(dataSql).toContain('market_asset_price_history');
    expect(dataSql).toContain('w.delivered_at - 86400');
  });

  it('keeps claim history available before the market history migration is applied', async () => {
    const prepare = (sql: string) => ({
      bind() { return this; },
      async all() {
        if (sql.includes('market_asset_price_history')) throw new Error('no such table: market_asset_price_history');
        return { results: [ROW] };
      },
      async first() { return { total: 1 }; },
    });
    const db = { prepare } as unknown as D1Database;
    const res = await onRequestGet(ctx(`staking_address=${STAKE}`, { DB: db }));
    const body = (await res.json()) as { items: Array<Record<string, unknown>> };
    expect(res.status).toBe(200);
    expect(body.items[0].receiptPriceUsd).toBeNull();
  });

  it('derives hasMore from the limit+1 probe row', async () => {
    const rows = [ROW, { ...ROW, reward_id: 'r2' }, { ...ROW, reward_id: 'r3' }];
    const db = fakeDb(rows, 30);
    const res = await onRequestGet(ctx(`staking_address=${STAKE}&limit=2`, { DB: db }));
    const body = (await res.json()) as { items: unknown[]; hasMore: boolean; total: number };
    expect(body.items).toHaveLength(2);
    expect(body.hasMore).toBe(true);
    expect(body.total).toBe(30);
  });

  it('applies token, date-range, order, and page params to the SQL', async () => {
    const db = fakeDb([], 0);
    await onRequestGet(ctx(
      `staking_address=${STAKE}&token=lovelace&from=1700000000&to=2026-06-01&order=asc&page=3&limit=10`,
      { DB: db },
    ));
    const dataCall = db.__calls.find((c) => !c.sql.includes('COUNT'))!;
    expect(dataCall.sql).toContain('network = ?');
    expect(dataCall.sql).toContain('token = ?');
    expect(dataCall.sql).toContain('delivered_at >= ?');
    expect(dataCall.sql).toContain('delivered_at <= ?');
    expect(dataCall.sql).toContain('ASC');
    // binds: network, stake, token, from, to, limit+1, offset
    expect(dataCall.binds).toEqual([
      'preview', STAKE, 'lovelace', 1700000000, Math.floor(Date.parse('2026-06-01') / 1000), 11, 20,
    ]);
    const countCall = db.__calls.find((c) => c.sql.includes('COUNT'))!;
    expect(countCall.sql).toContain('network = ?');
    expect(countCall.binds.slice(0, 2)).toEqual(['preview', STAKE]);
  });
});

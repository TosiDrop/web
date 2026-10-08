import { describe, expect, it, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import type { Env } from '../../types/env';
import { onRequestGet } from '../platformAnalytics';

type Ctx = Parameters<typeof onRequestGet>[0];

function context(db?: D1Database): Ctx {
  return {
    request: new Request('https://example.com/api/platformAnalytics'),
    env: { VITE_VM_API_KEY: 'key', DB: db } as Env,
  } as Ctx;
}

describe('GET /api/platformAnalytics', () => {
  it('counts separate reward records when request IDs are blank', async () => {
    const sqlite = new DatabaseSync(':memory:');
    try {
      sqlite.exec(`
        CREATE TABLE withdrawals (network TEXT, stake_address TEXT, reward_id TEXT, withdrawal_request TEXT, delivered_at INTEGER);
        INSERT INTO withdrawals VALUES
          ('preview', 'wallet-a', 'r1', '', 1750000000),
          ('preview', 'wallet-a', 'r2', '', 1750000000),
          ('preview', 'wallet-a', 'r3', '   ', 1750000000),
          ('preview', 'wallet-b', 'r4', 'claim-1', 1750000000),
          ('preview', 'wallet-b', 'r5', 'claim-1', 1750000000);
      `);
      const db = {
        prepare(sql: string) {
          return { bind: (...values: string[]) => ({
            first: async () => sqlite.prepare(sql).get(...values),
            all: async () => ({ results: sqlite.prepare(sql).all(...values) }),
          }) };
        },
      } as unknown as D1Database;
      const response = await onRequestGet(context(db));
      expect(await response.json()).toMatchObject({
        summary: { claimingWallets: 2, claims: 4, returningWallets: 1 },
        months: [{ claimingWallets: 2, claims: 4 }],
      });
    } finally {
      sqlite.close();
    }
  });
  it('marks missing archive storage as unavailable', async () => {
    const response = await onRequestGet(context());
    expect(await response.json()).toMatchObject({ degraded: true });
  });

  it('counts unique claiming wallets and claims from delivered rewards', async () => {
    const sql: string[] = [];
    const db = {
      prepare: vi.fn((query: string) => {
        sql.push(query);
        return {
          bind: () => ({
            first: async () => query.includes('returning_wallets')
              ? { returning_wallets: 2 }
              : { claiming_wallets: 5, claims: 8 },
            all: async () => ({ results: [{ month: '2026-09', claiming_wallets: 3, claims: 4 }] }),
          }),
        };
      }),
    } as unknown as D1Database;
    const response = await onRequestGet(context(db));
    expect(await response.json()).toEqual({
      degraded: false,
      summary: { claimingWallets: 5, claims: 8, returningWallets: 2 },
      months: [{ month: '2026-09', claimingWallets: 3, claims: 4 }],
    });
    expect(sql.join(' ')).toContain('COUNT(DISTINCT stake_address)');
    expect(sql.join(' ')).toContain('withdrawal_request');
  });
});

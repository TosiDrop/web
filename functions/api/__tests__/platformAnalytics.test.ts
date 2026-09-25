import { describe, expect, it, vi } from 'vitest';
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

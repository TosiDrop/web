import { describe, expect, it } from 'vitest';
import type { Env } from '../../types/env';
import { onRequestGet } from '../personalAnalytics';

type Ctx = Parameters<typeof onRequestGet>[0];

const STAKE = 'stake1' + 'a'.repeat(48);

interface FakeDbOptions {
  failFees?: boolean;
}

function fakeDb(options: FakeDbOptions = {}) {
  const calls: Array<{ sql: string; binds: unknown[] }> = [];
  const prepare = (sql: string) => ({
    bind(...binds: unknown[]) {
      calls.push({ sql, binds });
      return this;
    },
    async first() {
      if (sql.includes('total_claims')) {
        return {
          total_claims: 4,
          distinct_tokens: 2,
          active_since: 1_750_000_000,
        };
      }
      if (sql.includes('total_fees_lovelace')) {
        if (options.failFees) throw new Error('no such table: claim_requests');
        return { total_fees_lovelace: 1_250_000 };
      }
      return null;
    },
    async all() {
      if (sql.includes('claims_by_month')) {
        return {
          results: [
            { month: '2026-05', claims: 1 },
            { month: '2026-06', claims: 3 },
          ],
        };
      }
      if (sql.includes('rewards_by_month')) {
        return {
          results: [
            { month: '2026-05', token: 'lovelace', amount: 1_000_000 },
            { month: '2026-06', token: 'lovelace', amount: 2_500_000 },
            { month: '2026-06', token: 'policy.token', amount: 8 },
          ],
        };
      }
      if (sql.includes('token_mix')) {
        return {
          results: [
            { token: 'lovelace', rewards: 3 },
            { token: 'policy.token', rewards: 1 },
          ],
        };
      }
      return { results: [] };
    },
  });

  return {
    db: { prepare } as unknown as D1Database,
    calls,
  };
}

function ctx(query: string, env: Partial<Env> = {}): Ctx {
  return {
    request: new Request(`https://example.com/api/personalAnalytics?${query}`, {
      headers: { Origin: 'http://localhost:5173' },
    }),
    env: { VITE_VM_API_KEY: 'test-key', ...env } as Env,
  } as unknown as Ctx;
}

describe('GET /api/personalAnalytics', () => {
  it('returns 400 without a staking address', async () => {
    const response = await onRequestGet(ctx(''));
    expect(response.status).toBe(400);
  });

  it('returns an explicit degraded empty response without D1', async () => {
    const response = await onRequestGet(ctx(`staking_address=${STAKE}`));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      degraded: true,
      feesUnavailable: true,
      summary: {
        totalClaims: 0,
        distinctTokens: 0,
        totalFeesLovelace: '0',
        activeSince: null,
      },
      claimsByMonth: [],
      rewardsByMonth: [],
      tokenMix: [],
    });
  });

  it('returns bounded history aggregates and delivered-only fee totals', async () => {
    const { db, calls } = fakeDb();
    const response = await onRequestGet(
      ctx(`staking_address=${encodeURIComponent(STAKE)}`, { DB: db }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      degraded: false,
      feesUnavailable: false,
      summary: {
        totalClaims: 4,
        distinctTokens: 2,
        totalFeesLovelace: '1250000',
        activeSince: 1_750_000_000,
      },
      claimsByMonth: [
        { month: '2026-05', claims: 1 },
        { month: '2026-06', claims: 3 },
      ],
      rewardsByMonth: [
        { month: '2026-05', token: 'lovelace', amount: '1000000' },
        { month: '2026-06', token: 'lovelace', amount: '2500000' },
        { month: '2026-06', token: 'policy.token', amount: '8' },
      ],
      tokenMix: [
        { token: 'lovelace', rewards: 3 },
        { token: 'policy.token', rewards: 1 },
      ],
    });
    expect(calls).toHaveLength(5);
    expect(calls.every((call) => call.binds[0] === STAKE)).toBe(true);
    const feeSql = calls.find((call) => call.sql.includes('total_fees_lovelace'))!.sql;
    expect(feeSql).toContain('EXISTS');
    expect(feeSql).toContain('withdrawal_request = claim_requests.request_id');
  });

  it('keeps history analytics available when the fee table is unavailable', async () => {
    const { db } = fakeDb({ failFees: true });
    const response = await onRequestGet(
      ctx(`staking_address=${encodeURIComponent(STAKE)}`, { DB: db }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.degraded).toBe(false);
    expect(body.feesUnavailable).toBe(true);
    expect(body.summary.totalClaims).toBe(4);
    expect(body.summary.totalFeesLovelace).toBe('0');
  });
});

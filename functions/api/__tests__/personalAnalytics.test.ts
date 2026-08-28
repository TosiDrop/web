import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../../types/env';

const { vmGet } = vi.hoisted(() => ({ vmGet: vi.fn() }));
vi.mock('../../services/vmClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/vmClient')>();
  return { ...actual, vmGet };
});

import { onRequestGet } from '../personalAnalytics';
import { bech32 } from 'bech32';

type Ctx = Parameters<typeof onRequestGet>[0];

const STAKE = bech32.encode('stake_test', bech32.toWords(new Uint8Array(28)));
const MAINNET_STAKE = bech32.encode('stake', bech32.toWords(new Uint8Array(28).fill(1)));

interface FakeDbOptions {
  failFees?: boolean;
  rewards?: Array<{ month: string; token: string; amount: string | number }>;
  feeRows?: Array<{
    withdrawal_fee: string | null;
    tokens_fee: string | null;
    tx_fee: string | null;
    overhead_fee: string | null;
  }>;
  empty?: boolean;
}

function fakeDb(options: FakeDbOptions = {}) {
  const calls: Array<{ sql: string; binds: unknown[] }> = [];
  const batch = vi.fn(async () => []);
  const prepare = (sql: string) => ({
    bind(...binds: unknown[]) {
      calls.push({ sql, binds });
      return this;
    },
    async first() {
      if (sql.includes('total_claims')) {
        return options.empty
          ? { total_claims: 0, distinct_tokens: 0, active_since: null }
          : { total_claims: 4, distinct_tokens: 2, active_since: 1_750_000_000 };
      }
      if (sql.includes('total_fees_lovelace')) {
        if (options.failFees) throw new Error('no such table: claim_requests');
        return { total_fees_lovelace: 1_250_000, tracked_claims: 3, complete_claims: 2 };
      }
      return null;
    },
    async all() {
      if (options.empty) return { results: [] };
      if (sql.includes('withdrawal_fee')) {
        if (options.failFees) throw new Error('no such table: claim_requests');
        return {
          results: options.feeRows ?? [
            { withdrawal_fee: '500000', tokens_fee: '200000', tx_fee: '180000', overhead_fee: '370000' },
            { withdrawal_fee: '0', tokens_fee: '0', tx_fee: '0', overhead_fee: '0' },
            { withdrawal_fee: null, tokens_fee: null, tx_fee: null, overhead_fee: null },
          ],
        };
      }
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
          results: options.rewards ?? [
            { month: '2026-05', token: 'lovelace', amount: '1000000' },
            { month: '2026-06', token: 'lovelace', amount: '2000000' },
            { month: '2026-06', token: 'lovelace', amount: 500000 },
            { month: '2026-06', token: 'policy.token', amount: '8' },
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
    db: { prepare, batch } as unknown as D1Database,
    calls,
    batch,
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

const DELIVERED = [
  { id: 'r9', token: 'lovelace', amount: '1000000', epoch: 500, delivered_on: '1750000000' },
];

describe('GET /api/personalAnalytics', () => {
  beforeEach(() => {
    vmGet.mockReset();
    vmGet.mockResolvedValue(DELIVERED);
  });

  it('returns 400 without a staking address', async () => {
    const response = await onRequestGet(ctx(''));
    expect(response.status).toBe(400);
  });

  it('returns 400 for a value that is not a stake address', async () => {
    const response = await onRequestGet(ctx('staking_address=addr1notastake'));
    expect(response.status).toBe(400);
    expect(vmGet).not.toHaveBeenCalled();
  });

  it('rejects invalid checksums and addresses from another network', async () => {
    const invalid = `${STAKE.slice(0, -1)}x`;
    expect((await onRequestGet(ctx(`staking_address=${invalid}`))).status).toBe(400);
    expect(
      (await onRequestGet(ctx(`staking_address=${MAINNET_STAKE}`, { VITE_NETWORK: 'preview' }))).status,
    ).toBe(400);
    expect(vmGet).not.toHaveBeenCalled();
  });

  it('returns an explicit degraded empty response without D1', async () => {
    const response = await onRequestGet(ctx(`staking_address=${STAKE}`));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      degraded: true,
      fresh: false,
      feesUnavailable: true,
      feeCoverage: { trackedClaims: 0, completeClaims: 0, incomplete: true },
      summary: { totalClaims: 0, distinctTokens: 0, totalFeesLovelace: null, activeSince: null },
      claimsByMonth: [],
      rewardsByMonth: [],
      tokenMix: [],
    });
  });

  it('refreshes the archive from the VM before aggregating', async () => {
    const { db, batch, calls } = fakeDb();
    const response = await onRequestGet(ctx(`staking_address=${STAKE}`, { DB: db }));
    const body = (await response.json()) as { fresh: boolean };

    expect(body.fresh).toBe(true);
    expect(vmGet).toHaveBeenCalledWith(expect.anything(), 'delivered_rewards', {
      staking_address: STAKE,
    });
    expect(batch).toHaveBeenCalledOnce();
    const upsert = calls.find((call) => call.sql.includes('INSERT INTO withdrawals'))!;
    expect(upsert.binds.slice(0, 3)).toEqual(['preview', STAKE, 'r9']);
  });

  it('still serves the archive when the VM refresh fails', async () => {
    vmGet.mockRejectedValue(new Error('VM down'));
    const { db, batch } = fakeDb();
    const response = await onRequestGet(ctx(`staking_address=${STAKE}`, { DB: db }));
    const body = (await response.json()) as { fresh: boolean; summary: { totalClaims: number } };

    expect(response.status).toBe(200);
    expect(body.fresh).toBe(false);
    expect(body.summary.totalClaims).toBe(4);
    expect(batch).not.toHaveBeenCalled();
  });

  it('returns delivered-only aggregates scoped to this user and network', async () => {
    const { db, calls } = fakeDb();
    const response = await onRequestGet(
      ctx(`staking_address=${encodeURIComponent(STAKE)}`, { DB: db }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      degraded: false,
      fresh: true,
      feesUnavailable: false,
      feeCoverage: { trackedClaims: 3, completeClaims: 2, incomplete: true },
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

    const reads = calls.filter((call) => !call.sql.includes('INSERT INTO'));
    expect(reads).toHaveLength(5);
    for (const call of reads) {
      expect(call.sql).toContain('stake_address = ?');
      expect(call.sql).toContain('network = ?');
      expect(call.binds).toContain(STAKE);
      expect(call.binds).toContain('preview');
    }
    for (const call of reads.slice(0, 4)) {
      expect(call.sql).toContain('delivered_at IS NOT NULL');
    }
    const feeSql = reads.find((call) => call.sql.includes('withdrawal_fee'))!.sql;
    expect(feeSql).toContain('EXISTS');
    expect(feeSql).toContain('withdrawal_request = claim_requests.request_id');
    expect(feeSql).toContain('withdrawals.network = claim_requests.network');
    expect(feeSql).toContain('overhead_fee');
  });

  it('binds the mainnet network when the deployment is mainnet', async () => {
    const { db, calls } = fakeDb();
    await onRequestGet(
      ctx(`staking_address=${MAINNET_STAKE}`, { DB: db, VITE_NETWORK: 'mainnet', VM_BASE_URL: 'https://vm' }),
    );

    const reads = calls.filter((call) => !call.sql.includes('INSERT INTO'));
    expect(reads.every((call) => call.binds.includes('mainnet'))).toBe(true);
    expect(reads.some((call) => call.binds.includes('preview'))).toBe(false);
  });

  it('sums native-asset quantities beyond the int64 range', async () => {
    const { db } = fakeDb({
      rewards: [
        { month: '2026-06', token: 'policy.big', amount: '9223372036854775807' },
        { month: '2026-06', token: 'policy.big', amount: '9223372036854775807' },
        { month: '2026-06', token: 'policy.big', amount: 2 },
      ],
    });
    const response = await onRequestGet(ctx(`staking_address=${STAKE}`, { DB: db }));
    const body = (await response.json()) as {
      rewardsByMonth: Array<{ token: string; amount: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.rewardsByMonth).toEqual([
      { month: '2026-06', token: 'policy.big', amount: '18446744073709551616' },
    ]);
  });

  it('sums fee components beyond the int64 range', async () => {
    const { db } = fakeDb({
      feeRows: [
        {
          withdrawal_fee: '9223372036854775807',
          tokens_fee: '9223372036854775807',
          tx_fee: '2',
          overhead_fee: '0',
        },
      ],
    });
    const response = await onRequestGet(ctx(`staking_address=${STAKE}`, { DB: db }));
    const body = (await response.json()) as { summary: { totalFeesLovelace: string } };

    expect(response.status).toBe(200);
    expect(body.summary.totalFeesLovelace).toBe('18446744073709551616');
  });

  it('returns an empty model for an account with no delivered rewards', async () => {
    const { db } = fakeDb({ empty: true });
    const response = await onRequestGet(ctx(`staking_address=${STAKE}`, { DB: db }));
    const body = (await response.json()) as {
      summary: { totalClaims: number; activeSince: number | null };
      claimsByMonth: unknown[];
      rewardsByMonth: unknown[];
      tokenMix: unknown[];
    };

    expect(body.summary.totalClaims).toBe(0);
    expect(body.summary.activeSince).toBeNull();
    expect(body.claimsByMonth).toEqual([]);
    expect(body.rewardsByMonth).toEqual([]);
    expect(body.tokenMix).toEqual([]);
  });

  it('reports fees as unknown, not zero, when the fee table is unavailable', async () => {
    const { db } = fakeDb({ failFees: true });
    const response = await onRequestGet(
      ctx(`staking_address=${encodeURIComponent(STAKE)}`, { DB: db }),
    );
    const body = (await response.json()) as {
      degraded: boolean;
      feesUnavailable: boolean;
      feeCoverage: { incomplete: boolean };
      summary: { totalClaims: number; totalFeesLovelace: string | null };
    };

    expect(response.status).toBe(200);
    expect(body.degraded).toBe(false);
    expect(body.feesUnavailable).toBe(true);
    expect(body.feeCoverage.incomplete).toBe(true);
    expect(body.summary.totalClaims).toBe(4);
    expect(body.summary.totalFeesLovelace).toBeNull();
  });
});

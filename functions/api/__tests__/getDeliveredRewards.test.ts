import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Env } from '../../types/env';

const { vmFetch } = vi.hoisted(() => ({ vmFetch: vi.fn() }));
vi.mock('../../services/vmClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/vmClient')>();
  return {
    ...actual,
    vmFetch,
    // Bypass the Cache API in tests: always a miss, return the payload directly.
    withCache: async (_req: Request, _ttl: number, fetchFn: () => Promise<unknown>) =>
      new Response(JSON.stringify(await fetchFn()), { status: 200 }),
  };
});

import { onRequestGet } from '../getDeliveredRewards';

type Ctx = Parameters<typeof onRequestGet>[0];

function fakeDb() {
  const calls: { sql: string; binds: unknown[] }[] = [];
  const prepare = (sql: string) => ({
    bind(...b: unknown[]) {
      calls.push({ sql, binds: b });
      return this;
    },
  });
  return {
    prepare,
    batch: vi.fn(async () => []),
    __calls: calls,
  } as unknown as D1Database & { batch: ReturnType<typeof vi.fn>; __calls: typeof calls };
}

const STAKE = 'stake1' + 'u'.repeat(40);

function makeCtx(env: Partial<Env>): { ctx: Ctx; waitUntil: ReturnType<typeof vi.fn> } {
  const waitUntil = vi.fn();
  return {
    ctx: {
      request: new Request(`https://x/api/getDeliveredRewards?staking_address=${STAKE}`, {
        headers: { Origin: 'http://localhost:5173' },
      }),
      env: { VITE_VM_API_KEY: 'k', ...env } as Env,
      waitUntil,
    } as unknown as Ctx,
    waitUntil,
  };
}

const VM_ROW = {
  id: 'r1',
  staking_address: STAKE,
  epoch: '500',
  token: 'lovelace',
  amount: '1000000',
  delivered_on: '1750000000',
  withdrawal_request: 'w1',
  expiry: '',
};

describe('getDeliveredRewards sync', () => {
  beforeEach(() => {
    vmFetch.mockReset();
    vmFetch.mockResolvedValue([VM_ROW]);
  });

  it('returns the VM payload untouched', async () => {
    const { ctx } = makeCtx({});
    const res = await onRequestGet(ctx);
    expect(await res.json()).toEqual([VM_ROW]);
  });

  it('does not touch D1 when the binding is absent', async () => {
    const { ctx, waitUntil } = makeCtx({});
    await onRequestGet(ctx);
    // Our mocked withCache bypasses the cache-put waitUntil, so any call here
    // would have to come from the sync path.
    expect(waitUntil).not.toHaveBeenCalled();
  });

  it('schedules an ON CONFLICT DO NOTHING batch via waitUntil when DB present', async () => {
    const db = fakeDb();
    const { ctx, waitUntil } = makeCtx({ DB: db });
    await onRequestGet(ctx);
    expect(waitUntil).toHaveBeenCalled();
    await Promise.all(waitUntil.mock.calls.map((call) => call[0]));
    expect(db.batch).toHaveBeenCalledTimes(1);
    expect(db.__calls[0].sql).toContain('ON CONFLICT');
    expect(db.__calls[0].sql).toContain(
      'ON CONFLICT (network, stake_address, reward_id)',
    );
    expect(db.__calls[0].binds).toEqual([
      'preview', STAKE, 'r1', 'lovelace', '1000000', 500, '1750000000', 1750000000, 'w1',
    ]);
  });

  it('parses ISO delivered_on and skips invalid delivered_on or amount', async () => {
    const db = fakeDb();
    vmFetch.mockResolvedValue([
      { ...VM_ROW, id: 'r2', delivered_on: '2026-06-01T00:00:00Z' },
      { ...VM_ROW, id: 'r3', delivered_on: 'not-a-date' },
      { ...VM_ROW, id: 'r4', amount: '' },
      { ...VM_ROW, id: 'r5', amount: 'abc' },
      { ...VM_ROW, id: 'r6', epoch: 'x' },
    ]);
    const { ctx, waitUntil } = makeCtx({ DB: db });
    await onRequestGet(ctx);
    await Promise.all(waitUntil.mock.calls.map((call) => call[0]));
    expect(db.__calls).toHaveLength(2);
    expect(db.__calls.map((call) => call.binds[2])).toEqual(['r2', 'r6']);
    expect(db.__calls[0].binds[7]).toBe(Math.floor(Date.parse('2026-06-01T00:00:00Z') / 1000));
    expect(db.__calls[1].binds[5]).toBe(null); // epoch 'x' -> null
  });

  it('skips rows without an id and survives a D1 failure', async () => {
    const db = fakeDb();
    (db.batch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    vmFetch.mockResolvedValue([{ ...VM_ROW, id: '' }, VM_ROW]);
    const { ctx, waitUntil } = makeCtx({ DB: db });
    const res = await onRequestGet(ctx);
    expect(res.status).toBe(200);
    await Promise.all(waitUntil.mock.calls.map((call) => call[0])); // must not reject
    expect(db.__calls).toHaveLength(1); // only the row with an id
  });
});

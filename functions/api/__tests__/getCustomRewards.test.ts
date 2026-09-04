import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../../types/env';

const { vmGet } = vi.hoisted(() => ({ vmGet: vi.fn() }));
vi.mock('../../services/vmClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/vmClient')>();
  return { ...actual, vmGet };
});

import { onRequestPost } from '../getCustomRewards';

type Ctx = Parameters<typeof onRequestPost>[0];

let deferred: Promise<unknown>[] = [];

function ctx(body: unknown, env: Partial<Env> = {}): Ctx {
  return {
    request: new Request('https://example.com/api/getCustomRewards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
      body: JSON.stringify(body),
    }),
    env: { VITE_VM_API_KEY: 'test-key', ...env } as Env,
    waitUntil: (promise: Promise<unknown>) => {
      deferred.push(promise);
    },
  } as unknown as Ctx;
}

function fakeDb() {
  const bind = vi.fn();
  const run = vi.fn().mockResolvedValue({ success: true });
  const prepare = vi.fn(() => ({
    bind: (...values: unknown[]) => {
      bind(...values);
      return { run };
    },
  }));
  return { db: { prepare } as unknown as D1Database, bind };
}

const STAKE = 'stake_test1' + 'x'.repeat(50);

describe('POST /api/getCustomRewards', () => {
  beforeEach(() => {
    vmGet.mockReset();
    deferred = [];
  });

  it('returns the VM claim and records a fee quote for analytics', async () => {
    const { db, bind } = fakeDb();
    vmGet
      .mockResolvedValueOnce({
        request_id: 55,
        deposit: 4_000_000,
        overhead_fee: 1_000_000,
        withdrawal_address: 'addr_test1abc',
      })
      .mockResolvedValueOnce({ withdrawal_fee: '500000', tokens_fee: 200_000, fee: 180_000 });

    const res = await onRequestPost(
      ctx(
        { staking_address: STAKE, session_id: STAKE.slice(0, 40), selected: 'a1,a2', overhead_fee: 1_000_000 },
        { DB: db },
      ),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      request_id: 55,
      deposit: 4_000_000,
      overhead_fee: 1_000_000,
      withdrawal_address: 'addr_test1abc',
    });
    expect(deferred).toHaveLength(1);
    await Promise.all(deferred);
    expect(bind).toHaveBeenCalledWith(
      '55',
      STAKE,
      'preview',
      2,
      '4000000',
      '500000',
      '200000',
      '180000',
      '1000000',
    );
  });

  it('returns the submitted fee when the VM omits it', async () => {
    vmGet.mockResolvedValueOnce({ request_id: 2, deposit: 1, withdrawal_address: 'addr' });

    const res = await onRequestPost(
      ctx({ staking_address: STAKE, session_id: STAKE.slice(0, 40), selected: 'a1', overhead_fee: 250_000 }),
    );

    expect(await res.json()).toMatchObject({ overhead_fee: 250_000 });
  });

  it('does not touch D1 when the binding is absent', async () => {
    vmGet.mockResolvedValueOnce({ request_id: 1, deposit: 1, withdrawal_address: 'addr' });

    const res = await onRequestPost(
      ctx({ staking_address: STAKE, session_id: STAKE.slice(0, 40), selected: 'a1' }),
    );

    expect(res.status).toBe(200);
    expect(deferred).toHaveLength(0);
    expect(vmGet).toHaveBeenCalledTimes(1);
  });
});

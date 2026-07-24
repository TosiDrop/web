import { describe, expect, it, vi } from 'vitest';
import { persistClaimQuote } from '../claimAnalytics';

function fakeDb() {
  const bind = vi.fn();
  const run = vi.fn().mockResolvedValue({ success: true });
  const prepare = vi.fn(() => ({
    bind: (...values: unknown[]) => {
      bind(...values);
      return { run };
    },
  }));

  return {
    db: { prepare } as unknown as D1Database,
    prepare,
    bind,
    run,
  };
}

describe('persistClaimQuote', () => {
  it('stores the accepted request and all quoted fee components', async () => {
    const { db, prepare, bind, run } = fakeDb();

    await persistClaimQuote(db, {
      requestId: '42',
      stakeAddress: 'stake_test1analytics',
      network: 'preview',
      tokenCount: 3,
      deposit: 5_000_000,
      withdrawalFee: '500000',
      tokensFee: 300_000,
      txFee: 180_000,
    });

    expect(prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO claim_requests'));
    expect(prepare).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT (network, request_id)'),
    );
    expect(bind).toHaveBeenCalledWith(
      '42',
      'stake_test1analytics',
      'preview',
      3,
      '5000000',
      '500000',
      '300000',
      '180000',
    );
    expect(run).toHaveBeenCalledOnce();
  });

  it('stores absent optional fee components as null', async () => {
    const { db, bind } = fakeDb();

    await persistClaimQuote(db, {
      requestId: '43',
      stakeAddress: 'stake_test1analytics',
      network: 'mainnet',
      tokenCount: 1,
      deposit: '2500000',
    });

    expect(bind).toHaveBeenCalledWith(
      '43',
      'stake_test1analytics',
      'mainnet',
      1,
      '2500000',
      null,
      null,
      null,
    );
  });
});

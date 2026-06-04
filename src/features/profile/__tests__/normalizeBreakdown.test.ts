import { describe, it, expect } from 'vitest';
import { normalizeBreakdown } from '../utils/normalizeBreakdown';

const TOKENS = {
  'pol.61626364': { ticker: 'ABCD', decimals: '4', logo: 'http://l/abcd' },
};

describe('normalizeBreakdown', () => {
  it('normalizes canonical reward rows with token metadata', () => {
    const out = normalizeBreakdown(
      {
        rewards: [{ token: 'pol.61626364', amount: '15000', epoch: 500, pool: 'TOSI', rule: 'delegator' }],
        promises: [],
      },
      TOKENS,
    );
    expect(out).toEqual([{
      token: 'pol.61626364',
      ticker: 'ABCD',
      logo: 'http://l/abcd',
      amount: 1.5,
      epoch: 500,
      pool: 'TOSI',
      rule: 'delegator',
      kind: 'reward',
    }]);
  });

  it('probes alternate field names and tags promises', () => {
    const out = normalizeBreakdown(
      {
        rewards: [],
        promises: [{ token_id: 'lovelace', quantity: 2_000_000, pool_id: 'pool1abc', source: 'fixed' }],
      },
      {},
    );
    expect(out).toEqual([{
      token: 'lovelace',
      ticker: 'ADA',
      logo: undefined,
      amount: 2,
      epoch: null,
      pool: 'pool1abc',
      rule: 'fixed',
      kind: 'promise',
    }]);
  });

  it('drops rows lacking token or amount and tolerates garbage', () => {
    const out = normalizeBreakdown(
      {
        rewards: [null, 42, 'x', {}, { token: 'lovelace' }, { amount: '5' }, { token: 'lovelace', amount: 'NaN-ish' }],
        promises: undefined,
      } as never,
      {},
    );
    expect(out).toEqual([]);
  });

  it('handles a null payload', () => {
    expect(normalizeBreakdown(null, {})).toEqual([]);
    expect(normalizeBreakdown(undefined, {})).toEqual([]);
  });

  it('decodes hex asset names when the token map has no entry', () => {
    const out = normalizeBreakdown(
      { rewards: [{ token: 'pol.434841', amount: '7' }], promises: [] },
      {},
    );
    expect(out[0].ticker).toBe('CHA');
    expect(out[0].amount).toBe(7); // 0 decimals default
  });
});

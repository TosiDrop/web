import { describe, it, expect } from 'vitest';
import {
  buildPoolComparison,
  describeEligibility,
  flattenDistributions,
  type PoolOffering,
} from '../utils/poolComparison';

const DIST = {
  id: '20',
  token_id: 'pol.6d544f5349',
  amount: '420000',
  pool_id: 'pool1a',
  enabled: 't',
  promise: 't',
  target: 'group_1',
  model: '0',
  min_stake: '1000000',
  min_age: '0',
  stake_cap: '0',
};

describe('flattenDistributions', () => {
  it('collects rules from any grouping, dedupes by id, and keeps the audience', () => {
    const out = flattenDistributions({ everyone: [DIST], vip: [DIST, { ...DIST, id: '21', enabled: 'f' }] });
    expect(out.map((d) => [d.id, d.audience])).toEqual([
      ['20', 'everyone'],
      ['21', 'vip'],
    ]);
    expect(flattenDistributions(null)).toEqual([]);
  });
});

describe('buildPoolComparison', () => {
  const pools = {
    pool1a: { id: 'pool1a', ticker: 'AAA', name: 'Pool A', enabled: 't', logo: '', delegator_count: '12' },
    pool1b: { id: 'pool1b', ticker: 'BBB', name: 'Pool B', enabled: 't', logo: '', delegator_count: '500' },
  };
  const tokens = { 'pol.6d544f5349': { ticker: 'mTOSI', decimals: '3' } };

  it('joins offerings while retaining every participating pool', () => {
    const rows = buildPoolComparison({
      pools,
      distributions: { everyone: [DIST, { ...DIST, id: '9', enabled: 'f' }] },
      partnerPoolIds: new Set(['pool1a']),
      tokens,
    });
    expect(rows.map((r) => r.ticker)).toEqual(['AAA', 'BBB']);
    expect(rows[0]).toMatchObject({
      delegators: 12,
      partner: true,
      offerings: [
        {
          id: '20',
          ticker: 'mTOSI',
          amountPerEpoch: 420,
          promise: true,
          audience: 'everyone',
          target: 'group_1',
          model: '0',
          minStakeAda: 1,
          minAgeEpochs: null,
          stakeCapAda: null,
        },
      ],
    });
  });

  it('retains pools when their distributions are all disabled', () => {
    const rows = buildPoolComparison({
      pools,
      distributions: { everyone: [{ ...DIST, enabled: 'f' }] },
      partnerPoolIds: new Set(),
      tokens,
    });
    expect(rows.map((row) => [row.poolId, row.offerings])).toEqual([
      ['pool1b', []],
      ['pool1a', []],
    ]);
  });

  it('keeps two rules for the same token distinct instead of merging them', () => {
    const rows = buildPoolComparison({
      pools,
      distributions: {
        everyone: [DIST],
        vip: [{ ...DIST, id: '30', amount: '900000', min_stake: '500000000', min_age: '3' }],
      },
      partnerPoolIds: new Set(),
      tokens,
    });
    const offerings = rows.find((r) => r.poolId === 'pool1a')!.offerings;
    expect(offerings.map((o) => o.id)).toEqual(['30', '20']);
    expect(offerings.map(describeEligibility)).toEqual(['vip · ≥ 500 ₳ · 3+ epochs', '≥ 1 ₳']);
  });

  it('marks columns unknown, not zero, when an optional source is missing', () => {
    const rows = buildPoolComparison({
      pools,
      distributions: { everyone: [DIST] },
      partnerPoolIds: null,
      tokens: null,
    });
    expect(rows.find((row) => row.poolId === 'pool1a')).toMatchObject({ poolId: 'pool1a', partner: null });
  });

  it('falls back gracefully on malformed data', () => {
    const rows = buildPoolComparison({
      pools: { x: { id: '', ticker: 'X', name: '', enabled: 't', logo: '' } },
      distributions: undefined,
      partnerPoolIds: new Set(),
      tokens: undefined,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ poolId: 'x', ticker: 'X', offerings: [] });
  });

  it('keeps projects separate from pools and applies the mainnet TosiDrop identity', () => {
    const rows = buildPoolComparison({
      pools,
      distributions: { everyone: [{ ...DIST, pool_id: 'P_BTC' }] },
      partnerPoolIds: new Set(),
      tokens,
      network: 'mainnet',
    });
    expect(rows).toContainEqual(expect.objectContaining({
      kind: 'project', poolId: 'P_BTC', ticker: 'BTC', name: 'TosiDrop', delegators: null, partner: null,
    }));
  });

  it('treats preview TOSI as a pool attribution', () => {
    const rows = buildPoolComparison({
      pools: { TOSI: { ...pools.pool1a, id: 'TOSI', ticker: 'TOSI' } },
      distributions: { everyone: [{ ...DIST, pool_id: 'TOSI' }] },
      partnerPoolIds: new Set(),
      tokens,
      network: 'preview',
    });
    expect(rows[0]).toMatchObject({ kind: 'pool', poolId: 'TOSI', ticker: 'TOSI' });
  });

  it('joins pool distributions when VM and pool metadata use different ID formats', () => {
    const rows = buildPoolComparison({
      pools: { pool1a: { ...pools.pool1a, id: 'pool1test' } },
      distributions: { everyone: [{ ...DIST, pool_id: 'pool1test' }] },
      partnerPoolIds: new Set(),
      tokens,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe('pool');
    expect(rows[0].offerings).toHaveLength(1);
  });
});

describe('describeEligibility', () => {
  const base: PoolOffering = {
    id: '1',
    token: 't',
    ticker: 'T',
    amountPerEpoch: 1,
    promise: false,
    audience: 'everyone',
    target: null,
    model: null,
    minStakeAda: null,
    minAgeEpochs: null,
    stakeCapAda: null,
  };

  it('is empty for an open rule and lists every constraint otherwise', () => {
    expect(describeEligibility(base)).toBe('');
    expect(describeEligibility({ ...base, audience: 'vip', stakeCapAda: 10_000 })).toBe('vip · cap 10,000 ₳');
  });
});

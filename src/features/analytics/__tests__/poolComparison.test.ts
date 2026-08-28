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

  it('joins offerings, stats, whitelist and sorts whitelisted first', () => {
    const rows = buildPoolComparison({
      pools,
      distributions: { everyone: [DIST, { ...DIST, id: '9', enabled: 'f' }] },
      statistics: [{ pool_id: 'pool1a', withdrawals: '3', collected_fees: '1500000' }],
      whitelist: new Set(['pool1a']),
      tokens,
    });
    expect(rows.map((r) => r.ticker)).toEqual(['AAA', 'BBB']);
    expect(rows[0]).toMatchObject({
      delegators: 12,
      whitelisted: true,
      withdrawals: 3,
      collectedFeesAda: 1.5,
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
    expect(rows[1].offerings).toEqual([]);
    expect(rows[1].delegators).toBe(500);
  });

  it('keeps two rules for the same token distinct instead of merging them', () => {
    const rows = buildPoolComparison({
      pools,
      distributions: {
        everyone: [DIST],
        vip: [{ ...DIST, id: '30', amount: '900000', min_stake: '500000000', min_age: '3' }],
      },
      statistics: [],
      whitelist: new Set(),
      tokens,
    });
    const offerings = rows.find((r) => r.poolId === 'pool1a')!.offerings;
    expect(offerings.map((o) => o.id)).toEqual(['30', '20']);
    expect(offerings.map(describeEligibility)).toEqual(['vip · ≥ 500 ₳ · 3+ epochs', '≥ 1 ₳']);
  });

  it('marks columns unknown, not zero, when an optional source is missing', () => {
    const rows = buildPoolComparison({
      pools,
      distributions: undefined,
      statistics: null,
      whitelist: null,
      tokens: null,
    });
    expect(rows[0]).toMatchObject({ whitelisted: null, withdrawals: null, collectedFeesAda: null });
  });

  it('falls back gracefully on malformed data', () => {
    const rows = buildPoolComparison({
      pools: { x: { id: '', ticker: 'X', name: '', enabled: 't', logo: '' } },
      distributions: undefined,
      statistics: { error: true },
      whitelist: new Set(),
      tokens: undefined,
    });
    expect(rows[0]).toMatchObject({ poolId: 'x', delegators: null, withdrawals: 0, collectedFeesAda: 0, whitelisted: false });
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

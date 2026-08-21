import { describe, it, expect } from 'vitest';
import { buildPoolComparison, flattenDistributions } from '../utils/poolComparison';

const DIST = {
  id: '20', token_id: 'pol.6d544f5349', amount: '420000', pool_id: 'pool1a', enabled: 't', promise: 't',
};

describe('flattenDistributions', () => {
  it('collects rules from any grouping and dedupes by id', () => {
    const out = flattenDistributions({ everyone: [DIST], vip: [DIST, { ...DIST, id: '21', enabled: 'f' }] });
    expect(out.map((d) => d.id)).toEqual(['20', '21']);
    expect(flattenDistributions(null)).toEqual([]);
  });
});

describe('buildPoolComparison', () => {
  const pools = {
    pool1a: { id: 'pool1a', ticker: 'AAA', name: 'Pool A', enabled: 't', logo: '', delegator_count: '12' },
    pool1b: { id: 'pool1b', ticker: 'BBB', name: 'Pool B', enabled: 't', logo: '', delegator_count: '500' },
  };

  it('joins offerings, stats, whitelist and sorts whitelisted first', () => {
    const rows = buildPoolComparison({
      pools,
      distributions: { everyone: [DIST, { ...DIST, id: '9', enabled: 'f' }] },
      statistics: [{ pool_id: 'pool1a', withdrawals: '3', collected_fees: '1500000' }],
      whitelist: new Set(['pool1a']),
      tokens: { 'pol.6d544f5349': { ticker: 'mTOSI', decimals: '3' } },
    });
    expect(rows.map((r) => r.ticker)).toEqual(['AAA', 'BBB']);
    expect(rows[0]).toMatchObject({
      delegators: 12,
      whitelisted: true,
      withdrawals: 3,
      collectedFeesAda: 1.5,
      offerings: [{ ticker: 'mTOSI', amountPerEpoch: 420, promise: true }],
    });
    expect(rows[1].offerings).toEqual([]);
    expect(rows[1].delegators).toBe(500);
  });

  it('falls back gracefully on missing data', () => {
    const rows = buildPoolComparison({
      pools: { x: { id: '', ticker: 'X', name: '', enabled: 't', logo: '' } },
      distributions: undefined,
      statistics: { error: true },
      whitelist: new Set(),
      tokens: undefined,
    });
    expect(rows[0]).toMatchObject({ poolId: 'x', delegators: null, withdrawals: 0, collectedFeesAda: 0 });
  });
});

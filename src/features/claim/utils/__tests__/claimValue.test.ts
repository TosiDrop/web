import { describe, expect, it } from 'vitest';
import { estimateClaimValue } from '../claimValue';

const TOKEN = {
  assetId: 'asset1', ticker: 'ONE', logo: '', decimals: 2, amount: 12.5, premium: false, native: false,
};

describe('estimateClaimValue', () => {
  it('aggregates indexed USD and ADA values using normalized claim amounts', () => {
    const result = estimateClaimValue(
      [TOKEN, { ...TOKEN, assetId: 'asset2', ticker: 'TWO', amount: 2 }],
      {
        asset1: { priceUsd: 0.4, priceAda: 0.2, priceChange24h: null, source: 'index', sourceCount: 1, observedAt: 1 },
        asset2: { priceUsd: 3, priceAda: 1.5, priceChange24h: null, source: 'index', sourceCount: 1, observedAt: 1 },
      },
    );
    expect(result).toEqual({ usd: 11, ada: 5.5, pricedCount: 2, totalCount: 2 });
  });

  it('counts unpriced tokens without assigning them zero market value', () => {
    const result = estimateClaimValue([TOKEN, { ...TOKEN, assetId: 'missing' }], {
      asset1: { priceUsd: null, priceAda: 0.25, priceChange24h: null, source: 'index', sourceCount: 1, observedAt: 1 },
    });
    expect(result).toEqual({ usd: 0, ada: 3.125, pricedCount: 1, totalCount: 2 });
  });
});

import { describe, expect, it } from 'vitest';
import { toCsv } from '@/utils/csv';
import { walletHoldingsCsvRows } from '../utils/exportWalletHoldings';

describe('wallet holdings export', () => {
  it('keeps exact quantities, marks missing prices, and protects token names in CSV', () => {
    const rows = walletHoldingsCsvRows({
      network: 'mainnet',
      stakeAddress: 'stake1abc',
      exportedAt: '2026-09-25T00:00:00.000Z',
      walletLovelace: '1234567',
      adaPriceUsd: 0.5,
      holdings: [
        { unit: 'policy.a', quantity: '12345678901234567890', name: '=SUM(1,2)', ticker: null, decimals: 6, priceUsd: 0.25, valueUsd: 3086419725.31, priceObservedAt: 1700000000, priceSource: 'dex' },
        { unit: 'policy.b', quantity: '42', name: null, ticker: 'B', decimals: null, priceUsd: null, valueUsd: null, priceObservedAt: null, priceSource: null },
      ],
    });

    expect(rows[1]).toEqual(['mainnet', 'stake1abc', '2026-09-25T00:00:00.000Z', 'lovelace', 'ADA', '1234567', 6, '1.234567', 0.5, 0.6172835, '', '']);
    expect(rows[2]).toEqual(['mainnet', 'stake1abc', '2026-09-25T00:00:00.000Z', 'policy.a', '=SUM(1,2)', '12345678901234567890', 6, '12345678901234.567890', 0.25, 3086419725.31, '2023-11-14T22:13:20.000Z', 'dex']);
    expect(rows[3]?.slice(6, 10)).toEqual(['', '', '', '']);
    expect(toCsv(rows)).toContain("'\u003dSUM(1,2)");
  });
});

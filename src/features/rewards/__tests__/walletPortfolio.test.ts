import { describe, expect, it } from 'vitest';
import { portfolioMetrics, stakingEpochs, visibleHoldings, formatWalletUnits } from '../utils/walletPortfolio';
import type { WalletHolding, WalletSummary } from '../types/walletSummary';

const holding = (unit: string, valueUsd: number | null, change: number | null): WalletHolding => ({
  unit, valueUsd, priceChange24h: change, quantity: '100', name: unit, ticker: null,
  decimals: 0, metadataPending: false, priceUsd: valueUsd === null ? null : valueUsd / 100, pricePending: valueUsd === null,
});
const summary = (holdings: WalletHolding[]) => ({
  balance: { adaPriceUsd: 0.5, adaPriceChange24h: 25 }, holdings,
} as WalletSummary);

describe('wallet portfolio calculations', () => {
  it('uses prior prices for the combined market move and labels missing prices partial', () => {
    const result = portfolioMetrics(summary([holding('TOKEN', 200, -20), holding('Unknown', null, null)]), '200000000');
    expect(result.totalUsd).toBe(300);
    expect(result.marketChangePct).toBeCloseTo(-9.090909);
    expect(result.partial).toBe(true);
    expect(result.marketChangeComplete).toBe(false);
    expect(result.averageTokenUsd).toBe(200);
  });

  it('keeps unavailable portfolio values unknown while recognizing an actual empty wallet', () => {
    expect(portfolioMetrics(summary([holding('Unknown', null, null)]), null).totalUsd).toBeNull();
    expect(portfolioMetrics(summary([]), '0').totalUsd).toBe(0);
  });

  it('aggregates reward types within each epoch using exact lovelace before chart conversion', () => {
    expect(stakingEpochs([
      { epoch: 502, amountLovelace: '1000000', poolId: null, type: 'member' },
      { epoch: 501, amountLovelace: '2500000', poolId: null, type: 'member' },
      { epoch: 502, amountLovelace: '500000', poolId: null, type: 'leader' },
      { epoch: null, amountLovelace: '800000', poolId: null, type: 'unknown' },
    ])).toEqual([{ epoch: 501, amountAda: 2.5 }, { epoch: 502, amountAda: 1.5 }]);
  });

  it('searches full asset identifiers and sorts unknown values after priced holdings', () => {
    const rows = [holding('Unknown', null, null), holding('Low', 2, 1), holding('High', 20, -1)];
    expect(visibleHoldings(rows, '', 'value').map((row) => row.unit)).toEqual(['High', 'Low', 'Unknown']);
    expect(visibleHoldings(rows, 'LOW', 'value').map((row) => row.unit)).toEqual(['Low']);
  });

  it('preserves tiny balances and rounds large quantities without losing integer precision', () => {
    expect(formatWalletUnits('1', 6)).toBe('0.000001');
    expect(formatWalletUnits('999999999999999999999999', 6)).toBe('1,000,000,000,000,000,000');
  });
});

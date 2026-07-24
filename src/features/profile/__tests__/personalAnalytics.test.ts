import { describe, expect, it } from 'vitest';
import {
  normalizePersonalAnalytics,
  type RawPersonalAnalyticsResponse,
} from '../utils/personalAnalytics';

const RAW: RawPersonalAnalyticsResponse = {
  degraded: false,
  feesUnavailable: false,
  feeCoverage: {
    trackedClaims: 2,
    completeClaims: 2,
    trackedSince: 1_760_000_000,
    incomplete: true,
  },
  summary: {
    totalClaims: 4,
    distinctTokens: 2,
    totalFeesLovelace: '1250000',
    activeSince: 1_750_000_000,
  },
  claimsByMonth: [
    { month: '2026-06', claims: 3 },
    { month: '2026-05', claims: 1 },
  ],
  rewardsByMonth: [
    { month: '2026-06', token: 'lovelace', amount: '2500000' },
    { month: '2026-05', token: 'lovelace', amount: '1000000' },
    { month: '2026-06', token: 'policy.746f7369', amount: '8' },
  ],
  tokenMix: [
    { token: 'lovelace', rewards: 3 },
    { token: 'policy.746f7369', rewards: 1 },
  ],
};

const TOKENS = {
  lovelace: { ticker: 'ADA', decimals: 6 },
  'policy.746f7369': { ticker: 'TOSI', decimals: 2, logo: 'https://cdn/tosi.png' },
};

describe('normalizePersonalAnalytics', () => {
  it('orders months and builds a cumulative series per token', () => {
    const data = normalizePersonalAnalytics(RAW, TOKENS);

    expect(data.claimsByMonth).toEqual([
      { month: '2026-05', label: 'May 2026', claims: 1 },
      { month: '2026-06', label: 'Jun 2026', claims: 3 },
    ]);
    expect(data.seriesByToken.lovelace.points).toEqual([
      { month: '2026-05', label: 'May 2026', amount: 1, cumulative: 1 },
      { month: '2026-06', label: 'Jun 2026', amount: 2.5, cumulative: 3.5 },
    ]);
    expect(data.seriesByToken['policy.746f7369'].points[0].amount).toBeCloseTo(0.08);
  });

  it('uses the most frequently delivered token as the default selection', () => {
    const data = normalizePersonalAnalytics(RAW, TOKENS);

    expect(data.defaultToken).toBe('lovelace');
    expect(data.tokenMix).toEqual([
      {
        token: 'lovelace',
        ticker: 'ADA',
        logo: undefined,
        rewards: 3,
      },
      {
        token: 'policy.746f7369',
        ticker: 'TOSI',
        logo: 'https://cdn/tosi.png',
        rewards: 1,
      },
    ]);
  });

  it('converts lovelace fee totals to ADA without mixing reward units', () => {
    const data = normalizePersonalAnalytics(RAW, TOKENS);

    expect(data.summary.totalFeesAda).toBeCloseTo(1.25);
    expect(data.seriesByToken.lovelace.ticker).toBe('ADA');
    expect(data.seriesByToken['policy.746f7369'].ticker).toBe('TOSI');
  });

  it('returns a stable empty model for accounts without history', () => {
    const data = normalizePersonalAnalytics(
      {
        ...RAW,
        summary: {
          totalClaims: 0,
          distinctTokens: 0,
          totalFeesLovelace: '0',
          activeSince: null,
        },
        claimsByMonth: [],
        rewardsByMonth: [],
        tokenMix: [],
      },
      {},
    );

    expect(data.defaultToken).toBeNull();
    expect(data.seriesByToken).toEqual({});
    expect(data.tokenMix).toEqual([]);
    expect(data.summary.activeSince).toBeNull();
  });
});

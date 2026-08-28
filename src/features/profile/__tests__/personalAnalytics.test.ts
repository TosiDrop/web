import { describe, expect, it } from 'vitest';
import {
  monthRange,
  normalizePersonalAnalytics,
  type RawPersonalAnalyticsResponse,
} from '../utils/personalAnalytics';

const RAW: RawPersonalAnalyticsResponse = {
  degraded: false,
  fresh: true,
  feesUnavailable: false,
  feeCoverage: {
    trackedClaims: 2,
    completeClaims: 2,
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

  it('fills months with no rows so bars and cumulative slopes stay honest', () => {
    const data = normalizePersonalAnalytics(
      {
        ...RAW,
        claimsByMonth: [
          { month: '2026-01', claims: 1 },
          { month: '2026-04', claims: 2 },
        ],
        rewardsByMonth: [
          { month: '2026-01', token: 'lovelace', amount: '1000000' },
          { month: '2026-04', token: 'lovelace', amount: '1000000' },
          { month: '2026-03', token: 'policy.746f7369', amount: '8' },
        ],
      },
      TOKENS,
    );

    expect(data.claimsByMonth.map((point) => [point.month, point.claims])).toEqual([
      ['2026-01', 1],
      ['2026-02', 0],
      ['2026-03', 0],
      ['2026-04', 2],
    ]);
    expect(data.seriesByToken.lovelace.points.map((point) => point.cumulative)).toEqual([
      1, 1, 1, 2,
    ]);
    // A token's series starts at its own first month but runs to the last month overall.
    expect(data.seriesByToken['policy.746f7369'].points.map((point) => point.month)).toEqual([
      '2026-03',
      '2026-04',
    ]);
  });

  it('keeps unknown fees as null instead of a zero total', () => {
    const data = normalizePersonalAnalytics(
      { ...RAW, feesUnavailable: true, summary: { ...RAW.summary, totalFeesLovelace: null } },
      TOKENS,
    );

    expect(data.summary.totalFeesAda).toBeNull();
  });

  it('enumerates months inclusively across a year boundary', () => {
    expect(monthRange('2025-11', '2026-02')).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
    expect(monthRange('2026-05', '2026-05')).toEqual(['2026-05']);
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

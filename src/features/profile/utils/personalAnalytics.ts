import {
  decimalsFor,
  tickerFor,
  type TokenMap,
} from '@/features/history/api/history.queries';

export interface RawPersonalAnalyticsResponse {
  degraded: boolean;
  feesUnavailable: boolean;
  feeCoverage: {
    trackedClaims: number;
    completeClaims: number;
    trackedSince: number | null;
    incomplete: boolean;
  };
  summary: {
    totalClaims: number;
    distinctTokens: number;
    totalFeesLovelace: string;
    activeSince: number | null;
  };
  claimsByMonth: Array<{ month: string; claims: number }>;
  rewardsByMonth: Array<{ month: string; token: string; amount: string }>;
  tokenMix: Array<{ token: string; rewards: number }>;
}

export interface MonthlyClaimPoint {
  month: string;
  label: string;
  claims: number;
}

export interface RewardPoint {
  month: string;
  label: string;
  amount: number;
  cumulative: number;
}

export interface TokenRewardSeries {
  token: string;
  ticker: string;
  logo?: string;
  points: RewardPoint[];
}

export interface TokenMixItem {
  token: string;
  ticker: string;
  logo?: string;
  rewards: number;
}

export interface PersonalAnalyticsData {
  degraded: boolean;
  feesUnavailable: boolean;
  feeCoverage: {
    trackedClaims: number;
    completeClaims: number;
    trackedSince: Date | null;
    incomplete: boolean;
  };
  summary: {
    totalClaims: number;
    distinctTokens: number;
    totalFeesAda: number;
    activeSince: Date | null;
  };
  claimsByMonth: MonthlyClaimPoint[];
  seriesByToken: Record<string, TokenRewardSeries>;
  defaultToken: string | null;
  tokenMix: TokenMixItem[];
}

function monthLabel(month: string): string {
  const date = new Date(`${month}-01T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return month;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function normalizePersonalAnalytics(
  raw: RawPersonalAnalyticsResponse,
  tokens: TokenMap,
): PersonalAnalyticsData {
  const claimsByMonth = [...raw.claimsByMonth]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((point) => ({
      ...point,
      label: monthLabel(point.month),
    }));

  const monthlyByToken = new Map<
    string,
    Array<{ month: string; amount: number }>
  >();
  for (const row of raw.rewardsByMonth) {
    const decimals = decimalsFor(row.token, tokens[row.token]);
    const amount = Number(row.amount) / Math.pow(10, decimals);
    const rows = monthlyByToken.get(row.token) ?? [];
    rows.push({ month: row.month, amount: Number.isFinite(amount) ? amount : 0 });
    monthlyByToken.set(row.token, rows);
  }

  const seriesByToken: Record<string, TokenRewardSeries> = {};
  for (const [token, rows] of monthlyByToken) {
    let cumulative = 0;
    const info = tokens[token];
    seriesByToken[token] = {
      token,
      ticker: tickerFor(token, info),
      logo: info?.logo,
      points: rows
        .sort((a, b) => a.month.localeCompare(b.month))
        .map((row) => {
          cumulative += row.amount;
          return {
            month: row.month,
            label: monthLabel(row.month),
            amount: row.amount,
            cumulative,
          };
        }),
    };
  }

  const tokenMix = [...raw.tokenMix]
    .sort((a, b) => b.rewards - a.rewards || a.token.localeCompare(b.token))
    .map((row) => ({
      token: row.token,
      ticker: tickerFor(row.token, tokens[row.token]),
      logo: tokens[row.token]?.logo,
      rewards: row.rewards,
    }));

  return {
    degraded: raw.degraded,
    feesUnavailable: raw.feesUnavailable,
    feeCoverage: {
      ...raw.feeCoverage,
      trackedSince:
        raw.feeCoverage.trackedSince === null
          ? null
          : new Date(raw.feeCoverage.trackedSince * 1000),
    },
    summary: {
      totalClaims: raw.summary.totalClaims,
      distinctTokens: raw.summary.distinctTokens,
      totalFeesAda: Number(raw.summary.totalFeesLovelace) / 1_000_000,
      activeSince:
        raw.summary.activeSince === null
          ? null
          : new Date(raw.summary.activeSince * 1000),
    },
    claimsByMonth,
    seriesByToken,
    defaultToken: tokenMix[0]?.token ?? null,
    tokenMix,
  };
}

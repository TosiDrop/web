import {
  decimalsFor,
  tickerFor,
  type TokenMap,
} from '@/features/history/api/history.queries';

export interface RawPersonalAnalyticsResponse {
  degraded: boolean;
  /** False when the VM could not be reached before aggregating; the archive may lag. */
  fresh: boolean;
  feesUnavailable: boolean;
  feeCoverage: {
    trackedClaims: number;
    completeClaims: number;
    incomplete: boolean;
  };
  summary: {
    totalClaims: number;
    distinctTokens: number;
    /** Null when the fee aggregate failed; never a stand-in zero. */
    totalFeesLovelace: string | null;
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
  fresh: boolean;
  feesUnavailable: boolean;
  feeCoverage: {
    trackedClaims: number;
    completeClaims: number;
    incomplete: boolean;
  };
  summary: {
    totalClaims: number;
    distinctTokens: number;
    totalFeesAda: number | null;
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

/** Every YYYY-MM from `from` to `to` inclusive, so charts never skip a month. */
export function monthRange(from: string, to: string): string[] {
  const [fromYear, fromMonth] = from.split('-').map(Number);
  const [toYear, toMonth] = to.split('-').map(Number);
  if (![fromYear, fromMonth, toYear, toMonth].every(Number.isFinite)) return [from];
  const months: string[] = [];
  for (let index = fromYear * 12 + (fromMonth - 1); index <= toYear * 12 + (toMonth - 1); index += 1) {
    months.push(`${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`);
  }
  return months;
}

export function normalizePersonalAnalytics(
  raw: RawPersonalAnalyticsResponse,
  tokens: TokenMap,
): PersonalAnalyticsData {
  const allMonths = [...raw.claimsByMonth, ...raw.rewardsByMonth]
    .map((row) => row.month)
    .sort();
  const lastMonth = allMonths[allMonths.length - 1];

  const claimsByMonthMap = new Map(raw.claimsByMonth.map((row) => [row.month, row.claims]));
  const firstClaimMonth = [...claimsByMonthMap.keys()].sort()[0];
  const claimsByMonth = firstClaimMonth
    ? monthRange(firstClaimMonth, lastMonth).map((month) => ({
        month,
        label: monthLabel(month),
        claims: claimsByMonthMap.get(month) ?? 0,
      }))
    : [];

  const monthlyByToken = new Map<string, Map<string, number>>();
  for (const row of raw.rewardsByMonth) {
    const decimals = decimalsFor(row.token, tokens[row.token]);
    const amount = Number(row.amount) / Math.pow(10, decimals);
    const rows = monthlyByToken.get(row.token) ?? new Map<string, number>();
    rows.set(row.month, (rows.get(row.month) ?? 0) + (Number.isFinite(amount) ? amount : 0));
    monthlyByToken.set(row.token, rows);
  }

  const seriesByToken: Record<string, TokenRewardSeries> = {};
  for (const [token, rows] of monthlyByToken) {
    let cumulative = 0;
    const info = tokens[token];
    const firstMonth = [...rows.keys()].sort()[0];
    seriesByToken[token] = {
      token,
      ticker: tickerFor(token, info),
      logo: info?.logo,
      points: monthRange(firstMonth, lastMonth).map((month) => {
        const amount = rows.get(month) ?? 0;
        cumulative += amount;
        return { month, label: monthLabel(month), amount, cumulative };
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
    fresh: raw.fresh,
    feesUnavailable: raw.feesUnavailable,
    feeCoverage: { ...raw.feeCoverage },
    summary: {
      totalClaims: raw.summary.totalClaims,
      distinctTokens: raw.summary.distinctTokens,
      totalFeesAda:
        raw.summary.totalFeesLovelace === null
          ? null
          : Number(raw.summary.totalFeesLovelace) / 1_000_000,
      activeSince:
        raw.summary.activeSince === null ? null : new Date(raw.summary.activeSince * 1000),
    },
    claimsByMonth,
    seriesByToken,
    defaultToken: tokenMix[0]?.token ?? null,
    tokenMix,
  };
}

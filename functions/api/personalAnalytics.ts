import type { Env } from '../types/env';
import { hasDb } from '../services/d1';
import {
  errorResponse,
  jsonResponse,
  optionsResponse,
  resolveNetwork,
} from '../services/vmClient';

interface SummaryRow {
  total_claims: number | string | null;
  distinct_tokens: number | string | null;
  active_since: number | string | null;
}

interface ClaimsByMonthRow {
  month: string;
  claims: number | string;
}

interface RewardsByMonthRow {
  month: string;
  token: string;
  amount: number | string;
}

interface TokenMixRow {
  token: string;
  rewards: number | string;
}

interface FeesRow {
  total_fees_lovelace: number | string | null;
}

const EMPTY_ANALYTICS = {
  degraded: true,
  feesUnavailable: true,
  summary: {
    totalClaims: 0,
    distinctTokens: 0,
    totalFeesLovelace: '0',
    activeSince: null,
  },
  claimsByMonth: [],
  rewardsByMonth: [],
  tokenMix: [],
};

function finiteNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const origin = request.headers.get('Origin');
  const stakingAddress = new URL(request.url).searchParams.get('staking_address');

  if (!stakingAddress) {
    return errorResponse('staking_address is required', 400, origin);
  }

  if (!hasDb(env)) {
    return jsonResponse(EMPTY_ANALYTICS, 200, origin);
  }

  try {
    const [summary, claimsResult, rewardsResult, tokenMixResult] = await Promise.all([
      env.DB.prepare(
        'SELECT ' +
          'COUNT(DISTINCT COALESCE(withdrawal_request, reward_id)) AS total_claims, ' +
          'COUNT(DISTINCT token) AS distinct_tokens, ' +
          'MIN(delivered_at) AS active_since ' +
          'FROM withdrawals WHERE stake_address = ?',
      )
        .bind(stakingAddress)
        .first<SummaryRow>(),
      env.DB.prepare(
        '/* claims_by_month */ ' +
          "SELECT strftime('%Y-%m', datetime(delivered_at, 'unixepoch')) AS month, " +
          'COUNT(DISTINCT COALESCE(withdrawal_request, reward_id)) AS claims ' +
          'FROM withdrawals ' +
          'WHERE stake_address = ? AND delivered_at IS NOT NULL ' +
          'GROUP BY month ORDER BY month ASC',
      )
        .bind(stakingAddress)
        .all<ClaimsByMonthRow>(),
      env.DB.prepare(
        '/* rewards_by_month */ ' +
          "SELECT strftime('%Y-%m', datetime(delivered_at, 'unixepoch')) AS month, " +
          'token, CAST(SUM(CAST(amount AS INTEGER)) AS TEXT) AS amount ' +
          'FROM withdrawals ' +
          'WHERE stake_address = ? AND delivered_at IS NOT NULL ' +
          'GROUP BY month, token ORDER BY month ASC, token ASC',
      )
        .bind(stakingAddress)
        .all<RewardsByMonthRow>(),
      env.DB.prepare(
        '/* token_mix */ ' +
          'SELECT token, COUNT(*) AS rewards ' +
          'FROM withdrawals WHERE stake_address = ? ' +
          'GROUP BY token ORDER BY rewards DESC, token ASC',
      )
        .bind(stakingAddress)
        .all<TokenMixRow>(),
    ]);

    let totalFeesLovelace = '0';
    let feesUnavailable = false;
    try {
      const network = resolveNetwork(request);
      const fees = await env.DB.prepare(
        'SELECT CAST(COALESCE(SUM(' +
          'COALESCE(CAST(withdrawal_fee AS INTEGER), 0) + ' +
          'COALESCE(CAST(tokens_fee AS INTEGER), 0) + ' +
          'COALESCE(CAST(tx_fee AS INTEGER), 0)' +
          '), 0) AS TEXT) AS total_fees_lovelace ' +
          'FROM claim_requests ' +
          'WHERE stake_address = ? AND network = ? AND EXISTS (' +
          'SELECT 1 FROM withdrawals ' +
          'WHERE withdrawals.stake_address = claim_requests.stake_address ' +
          'AND withdrawals.withdrawal_request = claim_requests.request_id' +
          ')',
      )
        .bind(stakingAddress, network)
        .first<FeesRow>();
      totalFeesLovelace = String(fees?.total_fees_lovelace ?? '0');
    } catch (error) {
      feesUnavailable = true;
      console.error('personalAnalytics fee aggregate error:', error);
    }

    return jsonResponse(
      {
        degraded: false,
        feesUnavailable,
        summary: {
          totalClaims: finiteNumber(summary?.total_claims),
          distinctTokens: finiteNumber(summary?.distinct_tokens),
          totalFeesLovelace,
          activeSince:
            summary?.active_since === null || summary?.active_since === undefined
              ? null
              : finiteNumber(summary.active_since),
        },
        claimsByMonth: (claimsResult.results ?? []).map((row) => ({
          month: row.month,
          claims: finiteNumber(row.claims),
        })),
        rewardsByMonth: (rewardsResult.results ?? []).map((row) => ({
          month: row.month,
          token: row.token,
          amount: String(row.amount),
        })),
        tokenMix: (tokenMixResult.results ?? []).map((row) => ({
          token: row.token,
          rewards: finiteNumber(row.rewards),
        })),
      },
      200,
      origin,
    );
  } catch (error) {
    console.error('personalAnalytics history aggregate error:', error);
    return errorResponse('Failed to fetch personal analytics', 500, origin);
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));

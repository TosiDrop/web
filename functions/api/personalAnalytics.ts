import type { Env } from '../types/env';
import { hasDb } from '../services/d1';
import {
  deploymentNetwork,
  errorResponse,
  jsonResponse,
  optionsResponse,
  vmConfig,
  vmGet,
} from '../services/vmClient';
import { buildWithdrawalUpserts } from '../services/withdrawalsSync';

// Authentication: none, deliberately. Every figure here is derived from the
// withdrawals archive, which history.ts and getDeliveredRewards.ts already
// serve unauthenticated for the same query parameter, and delivered rewards
// are on-chain facts. Nothing that only TosiDrop knows (for example when an
// account first used the UI) is included; keep it that way, or gate the
// endpoint with verifyStakeSignature like tokenPreferences.ts does.

interface SummaryRow {
  total_claims: number | string | null;
  distinct_tokens: number | string | null;
  active_since: number | string | null;
}

interface ClaimsByMonthRow {
  month: string;
  claims: number | string;
}

interface RewardRow {
  month: string;
  token: string;
  amount: string | number | null;
}

interface TokenMixRow {
  token: string;
  rewards: number | string;
}

interface FeesRow {
  total_fees_lovelace: number | string | null;
  tracked_claims: number | string | null;
  complete_claims: number | string | null;
}

const EMPTY_ANALYTICS = {
  degraded: true,
  fresh: false,
  feesUnavailable: true,
  feeCoverage: { trackedClaims: 0, completeClaims: 0, incomplete: true },
  summary: { totalClaims: 0, distinctTokens: 0, totalFeesLovelace: null, activeSince: null },
  claimsByMonth: [],
  rewardsByMonth: [],
  tokenMix: [],
};

function finiteNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

/** Native-asset quantities exceed int64 in aggregate; sum them as BigInt. */
function addAmount(total: bigint, raw: unknown): bigint {
  const text = String(raw ?? '').trim();
  if (/^-?\d+$/.test(text)) return total + BigInt(text);
  const number = Number(text);
  return Number.isFinite(number) ? total + BigInt(Math.trunc(number)) : total;
}

function sumRewardsByMonth(
  rows: RewardRow[],
): Array<{ month: string; token: string; amount: string }> {
  const totals = new Map<string, { month: string; token: string; amount: bigint }>();
  for (const row of rows) {
    const key = `${row.month} ${row.token}`;
    const entry = totals.get(key) ?? { month: row.month, token: row.token, amount: 0n };
    entry.amount = addAmount(entry.amount, row.amount);
    totals.set(key, entry);
  }
  return [...totals.values()]
    .sort((a, b) => a.month.localeCompare(b.month) || a.token.localeCompare(b.token))
    .map((entry) => ({ month: entry.month, token: entry.token, amount: entry.amount.toString() }));
}

/**
 * Pulls the VM's current delivered-rewards window into the archive before
 * aggregating, so a direct visit to the analytics tab is not stale until the
 * history tab happens to run. Returns false when the archive could not be
 * refreshed; the caller still serves what is archived.
 */
async function refreshArchive(
  env: Env & { DB: D1Database },
  network: string,
  stakingAddress: string,
): Promise<boolean> {
  if (!vmConfig(env)) return false;
  try {
    const data = await vmGet(env, 'delivered_rewards', { staking_address: stakingAddress });
    const stmts = buildWithdrawalUpserts(env.DB, network, stakingAddress, data);
    if (stmts.length > 0) await env.DB.batch(stmts);
    return true;
  } catch (error) {
    console.error('personalAnalytics archive refresh error:', error);
    return false;
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const origin = request.headers.get('Origin');
  const stakingAddress = new URL(request.url).searchParams.get('staking_address')?.trim();

  if (!stakingAddress || !stakingAddress.startsWith('stake')) {
    return errorResponse('staking_address must be a bech32 stake address', 400, origin);
  }

  if (!hasDb(env)) {
    return jsonResponse(EMPTY_ANALYTICS, 200, origin);
  }

  const network = deploymentNetwork(env);
  const fresh = await refreshArchive(env, network, stakingAddress);

  try {
    const delivered =
      'FROM withdrawals WHERE network = ? AND stake_address = ? AND delivered_at IS NOT NULL ';
    const [summary, claimsResult, rewardsResult, tokenMixResult] = await Promise.all([
      env.DB.prepare(
        'SELECT ' +
          'COUNT(DISTINCT COALESCE(withdrawal_request, reward_id)) AS total_claims, ' +
          'COUNT(DISTINCT token) AS distinct_tokens, ' +
          'MIN(delivered_at) AS active_since ' +
          delivered,
      )
        .bind(network, stakingAddress)
        .first<SummaryRow>(),
      env.DB.prepare(
        '/* claims_by_month */ ' +
          "SELECT strftime('%Y-%m', datetime(delivered_at, 'unixepoch')) AS month, " +
          'COUNT(DISTINCT COALESCE(withdrawal_request, reward_id)) AS claims ' +
          delivered +
          'GROUP BY month ORDER BY month ASC',
      )
        .bind(network, stakingAddress)
        .all<ClaimsByMonthRow>(),
      env.DB.prepare(
        '/* rewards_by_month */ ' +
          "SELECT strftime('%Y-%m', datetime(delivered_at, 'unixepoch')) AS month, token, amount " +
          delivered +
          'ORDER BY month ASC, token ASC',
      )
        .bind(network, stakingAddress)
        .all<RewardRow>(),
      env.DB.prepare(
        '/* token_mix */ ' +
          'SELECT token, COUNT(*) AS rewards ' +
          delivered +
          'GROUP BY token ORDER BY rewards DESC, token ASC',
      )
        .bind(network, stakingAddress)
        .all<TokenMixRow>(),
    ]);

    let totalFeesLovelace: string | null = null;
    let feesUnavailable = false;
    let trackedClaims = 0;
    let completeClaims = 0;
    try {
      const complete =
        'withdrawal_fee IS NOT NULL AND tokens_fee IS NOT NULL AND tx_fee IS NOT NULL';
      const fees = await env.DB.prepare(
        'SELECT CAST(COALESCE(SUM(CASE WHEN ' +
          complete +
          ' THEN CAST(withdrawal_fee AS INTEGER) + CAST(tokens_fee AS INTEGER) + CAST(tx_fee AS INTEGER) ' +
          '+ CAST(COALESCE(overhead_fee, 0) AS INTEGER) ELSE 0 END), 0) AS TEXT) AS total_fees_lovelace, ' +
          'COUNT(*) AS tracked_claims, ' +
          'SUM(CASE WHEN ' +
          complete +
          ' THEN 1 ELSE 0 END) AS complete_claims ' +
          'FROM claim_requests ' +
          'WHERE stake_address = ? AND network = ? AND EXISTS (' +
          'SELECT 1 FROM withdrawals ' +
          'WHERE withdrawals.stake_address = claim_requests.stake_address ' +
          'AND withdrawals.network = claim_requests.network ' +
          'AND withdrawals.withdrawal_request = claim_requests.request_id' +
          ')',
      )
        .bind(stakingAddress, network)
        .first<FeesRow>();
      totalFeesLovelace = String(fees?.total_fees_lovelace ?? '0');
      trackedClaims = finiteNumber(fees?.tracked_claims);
      completeClaims = finiteNumber(fees?.complete_claims);
    } catch (error) {
      feesUnavailable = true;
      console.error('personalAnalytics fee aggregate error:', error);
    }

    const totalClaims = finiteNumber(summary?.total_claims);
    return jsonResponse(
      {
        degraded: false,
        fresh,
        feesUnavailable,
        feeCoverage: {
          trackedClaims,
          completeClaims,
          incomplete:
            feesUnavailable || trackedClaims < totalClaims || completeClaims < trackedClaims,
        },
        summary: {
          totalClaims,
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
        rewardsByMonth: sumRewardsByMonth(rewardsResult.results ?? []),
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

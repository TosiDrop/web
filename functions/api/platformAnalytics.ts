import type { Env } from '../types/env';
import { hasDb } from '../services/d1';
import { deploymentNetwork, errorResponse, jsonResponse, optionsResponse } from '../services/vmClient';

interface SummaryRow {
  claiming_wallets: number | string | null;
  claims: number | string | null;
}

interface ReturningRow {
  returning_wallets: number | string | null;
}

interface MonthRow extends SummaryRow {
  month: string;
}

function count(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

const CLAIM_KEY = "stake_address || ':' || COALESCE(withdrawal_request, reward_id)";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const origin = request.headers.get('Origin');
  if (!hasDb(env)) {
    return jsonResponse({ degraded: true, summary: null, months: [] }, 200, origin);
  }

  const network = deploymentNetwork(env);
  const where = 'FROM withdrawals WHERE network = ? AND delivered_at IS NOT NULL';
  try {
    const [summary, returning, monthly] = await Promise.all([
      env.DB.prepare(
        `SELECT COUNT(DISTINCT stake_address) AS claiming_wallets, ` +
        `COUNT(DISTINCT ${CLAIM_KEY}) AS claims ${where}`,
      ).bind(network).first<SummaryRow>(),
      env.DB.prepare(
        'SELECT COUNT(*) AS returning_wallets FROM (' +
        `SELECT stake_address ${where} GROUP BY stake_address ` +
        'HAVING COUNT(DISTINCT COALESCE(withdrawal_request, reward_id)) > 1)',
      ).bind(network).first<ReturningRow>(),
      env.DB.prepare(
        "SELECT strftime('%Y-%m', datetime(delivered_at, 'unixepoch')) AS month, " +
        `COUNT(DISTINCT stake_address) AS claiming_wallets, COUNT(DISTINCT ${CLAIM_KEY}) AS claims ` +
        `${where} GROUP BY month ORDER BY month DESC LIMIT 12`,
      ).bind(network).all<MonthRow>(),
    ]);

    return jsonResponse({
      degraded: false,
      summary: {
        claimingWallets: count(summary?.claiming_wallets),
        claims: count(summary?.claims),
        returningWallets: count(returning?.returning_wallets),
      },
      months: (monthly.results ?? []).reverse().map((row) => ({
        month: row.month,
        claimingWallets: count(row.claiming_wallets),
        claims: count(row.claims),
      })),
    }, 200, origin);
  } catch (error) {
    console.error('platform analytics error:', error);
    return errorResponse('Platform usage analytics are unavailable', 500, origin);
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));

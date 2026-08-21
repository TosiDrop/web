import type { TokenMap } from '@/features/history/api/history.queries';
import { decimalsFor, tickerFor } from '@/features/history/api/history.queries';
import type { GetPoolsResponse } from '@/features/rewards/api/pools.queries';

/** One VM distribution rule (the VM returns these grouped by target audience). */
export interface VmDistribution {
  id: string;
  token_id: string;
  amount: string;
  pool_id: string;
  enabled: string;
  promise?: string;
  min_stake?: string;
}

export interface VmStatistic {
  pool_id: string;
  withdrawals: string;
  collected_fees: string;
}

export interface PoolOffering {
  token: string;
  ticker: string;
  logo?: string;
  amountPerEpoch: number;
  promise: boolean;
}

export interface PoolComparisonRow {
  poolId: string;
  ticker: string;
  name: string;
  logo?: string;
  delegators: number | null;
  whitelisted: boolean;
  offerings: PoolOffering[];
  withdrawals: number;
  collectedFeesAda: number;
}

interface Inputs {
  pools: GetPoolsResponse | null | undefined;
  distributions: unknown;
  statistics: unknown;
  whitelist: Set<string>;
  tokens: TokenMap | null | undefined;
}

export function flattenDistributions(raw: unknown): VmDistribution[] {
  const out = new Map<string, VmDistribution>();
  const visit = (v: unknown) => {
    if (Array.isArray(v)) return v.forEach(visit);
    if (!v || typeof v !== 'object') return;
    const d = v as Record<string, unknown>;
    if (typeof d.id === 'string' && typeof d.pool_id === 'string' && typeof d.token_id === 'string') {
      out.set(d.id, d as unknown as VmDistribution);
      return;
    }
    Object.values(d).forEach(visit);
  };
  visit(raw);
  return [...out.values()];
}

export function buildPoolComparison({
  pools,
  distributions,
  statistics,
  whitelist,
  tokens,
}: Inputs): PoolComparisonRow[] {
  const offeringsByPool = new Map<string, PoolOffering[]>();
  for (const d of flattenDistributions(distributions)) {
    if (d.enabled !== 't') continue;
    const info = tokens?.[d.token_id];
    const list = offeringsByPool.get(d.pool_id) ?? [];
    list.push({
      token: d.token_id,
      ticker: tickerFor(d.token_id, info),
      logo: info?.logo,
      amountPerEpoch: Number(d.amount) / Math.pow(10, decimalsFor(d.token_id, info)),
      promise: d.promise === 't',
    });
    offeringsByPool.set(d.pool_id, list);
  }

  const statsByPool = new Map<string, VmStatistic>();
  if (Array.isArray(statistics)) {
    for (const s of statistics as VmStatistic[]) {
      if (s && typeof s.pool_id === 'string') statsByPool.set(s.pool_id, s);
    }
  }

  const rows = Object.entries(pools ?? {}).map(([key, pool]): PoolComparisonRow => {
    const poolId = pool?.id || key;
    const stat = statsByPool.get(poolId);
    const delegators = Number(pool?.delegator_count);
    return {
      poolId,
      ticker: pool?.ticker ?? '',
      name: pool?.name ?? '',
      logo: pool?.logo || undefined,
      delegators: Number.isFinite(delegators) && pool?.delegator_count !== undefined ? delegators : null,
      whitelisted: whitelist.has(poolId) || whitelist.has(key),
      offerings: (offeringsByPool.get(poolId) ?? []).sort((a, b) => b.amountPerEpoch - a.amountPerEpoch),
      withdrawals: Number(stat?.withdrawals) || 0,
      collectedFeesAda: (Number(stat?.collected_fees) || 0) / 1_000_000,
    };
  });

  return rows.sort(
    (a, b) =>
      Number(b.whitelisted) - Number(a.whitelisted) ||
      (b.delegators ?? -1) - (a.delegators ?? -1) ||
      a.ticker.localeCompare(b.ticker),
  );
}

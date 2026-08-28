import type { TokenMap } from '@/features/history/api/history.queries';
import { decimalsFor, tickerFor } from '@/features/history/api/history.queries';
import type { GetPoolsResponse } from '@/features/rewards/api/pools.queries';

/**
 * One VM distribution rule. The VM returns rules grouped by audience
 * (`{ everyone: [...], vip: [...] }`); `audience` is that group key, attached
 * during flattening so a rule's applicability survives into the UI.
 */
export interface VmDistribution {
  id: string;
  token_id: string;
  amount: string;
  pool_id: string;
  enabled: string;
  promise?: string;
  target?: string;
  model?: string;
  min_stake?: string;
  min_age?: string;
  stake_cap?: string;
  audience?: string;
}

export interface VmStatistic {
  pool_id: string;
  withdrawals: string;
  collected_fees: string;
}

/** A single rule, never an aggregate: two rules for the same token stay distinct. */
export interface PoolOffering {
  id: string;
  token: string;
  ticker: string;
  logo?: string;
  amountPerEpoch: number;
  promise: boolean;
  audience: string | null;
  target: string | null;
  model: string | null;
  minStakeAda: number | null;
  minAgeEpochs: number | null;
  stakeCapAda: number | null;
}

export interface PoolComparisonRow {
  poolId: string;
  ticker: string;
  name: string;
  logo?: string;
  delegators: number | null;
  /** Null when the whitelist could not be fetched. */
  whitelisted: boolean | null;
  offerings: PoolOffering[];
  /** Null when statistics could not be fetched. */
  withdrawals: number | null;
  collectedFeesAda: number | null;
}

interface Inputs {
  pools: GetPoolsResponse | null | undefined;
  distributions: unknown;
  statistics: unknown | null;
  whitelist: Set<string> | null;
  tokens: TokenMap | null | undefined;
}

export function flattenDistributions(raw: unknown): VmDistribution[] {
  const out = new Map<string, VmDistribution>();
  const visit = (v: unknown, audience: string | undefined) => {
    if (Array.isArray(v)) return v.forEach((x) => visit(x, audience));
    if (!v || typeof v !== 'object') return;
    const d = v as Record<string, unknown>;
    if (typeof d.id === 'string' && typeof d.pool_id === 'string' && typeof d.token_id === 'string') {
      // First occurrence wins so a rule listed under two groups keeps its first audience.
      if (!out.has(d.id)) out.set(d.id, { ...(d as unknown as VmDistribution), audience });
      return;
    }
    for (const [key, value] of Object.entries(d)) visit(value, audience ?? key);
  };
  visit(raw, undefined);
  return [...out.values()];
}

/** Positive lovelace as ADA; zero/absent means "no threshold". */
function lovelaceThreshold(raw: string | undefined): number | null {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n / 1_000_000 : null;
}

function positiveInt(raw: string | undefined): number | null {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
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
      id: d.id,
      token: d.token_id,
      ticker: tickerFor(d.token_id, info),
      logo: info?.logo,
      amountPerEpoch: Number(d.amount) / Math.pow(10, decimalsFor(d.token_id, info)),
      promise: d.promise === 't',
      audience: d.audience ?? null,
      target: d.target || null,
      model: d.model || null,
      minStakeAda: lovelaceThreshold(d.min_stake),
      minAgeEpochs: positiveInt(d.min_age),
      stakeCapAda: lovelaceThreshold(d.stake_cap),
    });
    offeringsByPool.set(d.pool_id, list);
  }

  const statsByPool = statistics === null ? null : new Map<string, VmStatistic>();
  if (statsByPool && Array.isArray(statistics)) {
    for (const s of statistics as VmStatistic[]) {
      if (s && typeof s.pool_id === 'string') statsByPool.set(s.pool_id, s);
    }
  }

  const rows = Object.entries(pools ?? {}).map(([key, pool]): PoolComparisonRow => {
    const poolId = pool?.id || key;
    const stat = statsByPool?.get(poolId);
    const delegators = Number(pool?.delegator_count);
    return {
      poolId,
      ticker: pool?.ticker ?? '',
      name: pool?.name ?? '',
      logo: pool?.logo || undefined,
      delegators:
        Number.isFinite(delegators) && pool?.delegator_count !== undefined ? delegators : null,
      whitelisted: whitelist === null ? null : whitelist.has(poolId) || whitelist.has(key),
      offerings: (offeringsByPool.get(poolId) ?? []).sort(
        (a, b) => b.amountPerEpoch - a.amountPerEpoch || a.id.localeCompare(b.id),
      ),
      withdrawals: statsByPool === null ? null : Number(stat?.withdrawals) || 0,
      collectedFeesAda: statsByPool === null ? null : (Number(stat?.collected_fees) || 0) / 1_000_000,
    };
  });

  return rows.sort(
    (a, b) =>
      Number(b.whitelisted ?? false) - Number(a.whitelisted ?? false) ||
      (b.delegators ?? -1) - (a.delegators ?? -1) ||
      a.ticker.localeCompare(b.ticker),
  );
}

/** Short eligibility summary for a rule, e.g. "vip · ≥ 500 ₳ · 3+ epochs". Empty for an open rule. */
export function describeEligibility(o: PoolOffering): string {
  const parts: string[] = [];
  if (o.audience && o.audience !== 'everyone') parts.push(o.audience);
  if (o.minStakeAda !== null) parts.push(`≥ ${o.minStakeAda.toLocaleString('en-US')} ₳`);
  if (o.stakeCapAda !== null) parts.push(`cap ${o.stakeCapAda.toLocaleString('en-US')} ₳`);
  if (o.minAgeEpochs !== null) parts.push(`${o.minAgeEpochs}+ epochs`);
  return parts.join(' · ');
}

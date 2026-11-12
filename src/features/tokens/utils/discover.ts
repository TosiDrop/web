import type { PoolComparisonRow, VmDistribution } from '@/features/analytics/utils/poolComparison';
import type { Project } from '@/shared/projects';
import { truncateHash } from '@/utils/format';

export type DiscoverSort = 'popular' | 'recent' | 'name';

export interface TokenActivity {
  /** Wallets the token's enabled distributions reached in their latest runs. */
  reach: number;
  /** Highest distribution id. VM ids only grow, so this orders tokens by when they were added. */
  newest: number;
}

export interface DiscoverSource {
  id: string;
  kind: 'pool' | 'project';
  label: string;
  tokens: Set<string>;
}

/** Compares asset ids written as `policy.name` or `policyname`. */
export const assetKey = (id: string) => id.replace('.', '').toLowerCase();

const REACHED = /\bto (\d+) targets?\b/i;

export function tokenActivity(distributions: VmDistribution[]): Map<string, TokenActivity> {
  const out = new Map<string, TokenActivity>();
  for (const d of distributions) {
    const key = assetKey(d.token_id);
    const activity = out.get(key) ?? { reach: 0, newest: 0 };
    if (d.enabled === 't') activity.reach += Number(REACHED.exec(d.last_results ?? '')?.[1] ?? 0);
    activity.newest = Math.max(activity.newest, Number(d.id) || 0);
    out.set(key, activity);
  }
  return out;
}

/** Pools and projects with at least one enabled distribution, in pool-comparison order. */
export function discoverSources(rows: PoolComparisonRow[]): DiscoverSource[] {
  return rows
    .filter((row) => row.offerings.length > 0)
    .map((row) => ({
      id: row.poolId,
      kind: row.kind,
      label: row.kind === 'project' ? row.name : row.ticker === 'Unknown pool' ? truncateHash(row.poolId, 10, 6) : row.ticker,
      tokens: new Set(row.offerings.map((o) => assetKey(o.token))),
    }));
}

export function sortTokens(tokens: Project[], sort: DiscoverSort, activity: Map<string, TokenActivity>): Project[] {
  const score = (token: Project) => {
    const a = activity.get(assetKey(token.tokenId));
    if (sort === 'popular') return a?.reach ?? 0;
    if (sort === 'recent') return a?.newest ?? 0;
    return 0;
  };
  return [...tokens].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
}

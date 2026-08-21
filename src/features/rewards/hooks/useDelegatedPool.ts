import { useMemo } from 'react';
import { useRewardBreakdown } from '@/features/profile/hooks/useRewardBreakdown';
import type { BreakdownEntry } from '@/features/profile/utils/normalizeBreakdown';

/**
 * The VM has no delegation endpoint, but every breakdown row names its source
 * (`from`): a pool id for delegation rewards, a project key otherwise. The
 * pool behind the latest-epoch row is the wallet's current delegation.
 */
export function pickDelegatedPool(
  entries: Pick<BreakdownEntry, 'pool' | 'epoch'>[],
): string | null {
  let best: { pool: string; epoch: number } | null = null;
  for (const e of entries) {
    if (!e.pool?.startsWith('pool')) continue;
    const epoch = e.epoch ?? -1;
    if (!best || epoch > best.epoch) best = { pool: e.pool, epoch };
  }
  return best?.pool ?? null;
}

export function useDelegatedPool(stakeAddress: string | null) {
  const { data, isLoading } = useRewardBreakdown(stakeAddress);
  const poolId = useMemo(
    () => pickDelegatedPool(data?.flatMap((g) => g.entries) ?? []),
    [data],
  );
  return { poolId, isLoading };
}

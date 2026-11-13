import type { ClaimableToken } from '@/shared/rewards';

export interface RewardAmount {
  assetId: string;
  amount: number;
}

export function rewardSnapshot(rewards: ClaimableToken[]): RewardAmount[] {
  const totals = new Map<string, number>();
  for (const reward of rewards) {
    if (!reward.assetId || !Number.isFinite(reward.amount) || reward.amount <= 0) continue;
    totals.set(reward.assetId, (totals.get(reward.assetId) ?? 0) + reward.amount);
  }
  return [...totals].sort(([a], [b]) => a.localeCompare(b)).map(([assetId, amount]) => ({ assetId, amount }));
}

export function compareRewardSnapshots(previous: RewardAmount[] | null, current: RewardAmount[]) {
  const amounts = new Map(previous?.map((item) => [item.assetId, item.amount]) ?? []);
  return {
    newCount: previous === null ? 0 : current.filter((item) => item.amount > (amounts.get(item.assetId) ?? 0)).length,
    totalCount: current.length,
  };
}

export function rewardSnapshotKey(network: string, stakeAddress: string): string {
  return `td:reward-alerts:v1:${network}:${stakeAddress}`;
}

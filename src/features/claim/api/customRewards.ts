import { apiClient } from '@/api/client';

export interface CustomRewardsResult {
  request_id: string;
  deposit: number;
  withdrawal_address: string;
}

/**
 * Mirror of `sessionIdFor` in `functions/services/vmClient.ts` so the same
 * deterministic id reaches the VM no matter which entry point is used.
 */
function sessionIdFor(stakeAddress: string): string {
  return stakeAddress.slice(0, 40);
}

interface GetCustomRewardsParams {
  stakeAddress: string;
  selected: string[];
  overheadFee?: number;
}

export async function getCustomRewards({
  stakeAddress,
  selected,
  overheadFee,
}: GetCustomRewardsParams): Promise<CustomRewardsResult> {
  const params = new URLSearchParams({
    staking_address: stakeAddress,
    session_id: sessionIdFor(stakeAddress),
    selected: selected.join(','),
  });
  if (overheadFee !== undefined) {
    params.append('overhead_fee', String(overheadFee));
  }
  return apiClient.get<CustomRewardsResult>(`/api/getCustomRewards?${params.toString()}`);
}

import { apiClient } from '@/api/client';
import { sessionIdFor } from '@/shared/claim/session';

export interface CustomRewardsResult {
  request_id: string;
  deposit: number;
  withdrawal_address: string;
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

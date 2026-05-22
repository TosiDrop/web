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
  if (selected.length === 0) {
    throw new Error('selected must include at least one asset');
  }

  const body = {
    staking_address: stakeAddress,
    session_id: sessionIdFor(stakeAddress),
    selected: selected.join(','),
    ...(overheadFee !== undefined ? { overhead_fee: overheadFee } : {}),
  };
  return apiClient.post<CustomRewardsResult>('/api/getCustomRewards', body);
}

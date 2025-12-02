import { Core } from '@blaze-cardano/sdk';
import type { ClaimableToken } from '@/shared/rewards';

interface RewardsResponse {
  rewards: ClaimableToken[];
  error?: string;
}

const convertToStakeAddress = (walletAddress: string): string => {
  try {
    const address = Core.addressFromBech32(walletAddress);
    const addressDetails = address.asBase();
    if (!addressDetails) {
      throw new Error("Address is not a base address with stake credentials");
    }

    const stakeCredential = addressDetails.getStakeCredential();
    if (!stakeCredential) {
      throw new Error("Address does not contain stake credentials");
    }

    const networkId = address.getNetworkId();
    const rewardAddress = Core.RewardAccount.fromCredential(
      stakeCredential,
      networkId
    );
    return rewardAddress;
  } catch (error) {
    console.error('Error converting address with Blaze:', error);
    throw new Error(
      `Failed to convert address to stake address: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
};

export const getRewards = async (walletId: string): Promise<ClaimableToken[]> => {
  const stakeAddress = convertToStakeAddress(walletId);

  const response = await fetch(`/api/getRewards?walletId=${encodeURIComponent(stakeAddress)}`);

  if (!response.ok) {
    throw new Error(`Failed to get rewards: ${response.statusText}`);
  }

  const { rewards, error } = (await response.json()) as RewardsResponse;

  if (error) {
    throw new Error(error);
  }

  return rewards || [];
};


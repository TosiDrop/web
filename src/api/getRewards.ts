import { Core } from '@blaze-cardano/sdk'
import type { ClaimableToken } from '../types/rewards'

interface RewardsResponse {
  rewards: ClaimableToken[];
  error?: string;
}

const convertToStakeAddress = (walletAddress: string): string => {
  try {
    // Parse the bech32 address
    const address = Core.addressFromBech32(walletAddress);

    // Get the address details
    const addressDetails = address.asBase();
    if (!addressDetails) {
      throw new Error("Address is not a base address with stake credentials");
    }

    // Extract the stake credential from the base address
    const stakeCredential = addressDetails.getStakeCredential();
    if (!stakeCredential) {
      throw new Error("Address does not contain stake credentials");
    }

    // Get network ID from the original address
    const networkId = address.getNetworkId();

    // Create reward address from the stake credential
    const rewardAddress = Core.RewardAccount.fromCredential(
      stakeCredential,
      networkId
    );
    console.log('rewardAddress', rewardAddress);
    return rewardAddress;
  } catch (error) {
    console.error('Error converting address with Blaze:', error);
    throw new Error(`Failed to convert address to stake address: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const getRewards = async (walletId: string): Promise<ClaimableToken[]> => {
  try {
    const stakeAddress = convertToStakeAddress(walletId);
    console.log('Converted to stake address:', stakeAddress);

    const response = await fetch(`/api/getRewards?walletId=${encodeURIComponent(stakeAddress)}`);

    if (!response.ok) {
      throw new Error(`Failed to get rewards: ${response.statusText}`);
    }

    const { rewards, error } = await response.json() as RewardsResponse;

    if (error) {
      throw new Error(error);
    }

    console.log('rewards', rewards);
    return rewards || [];
  } catch (error) {
    console.error('Error fetching rewards:', error);
    throw error;
  }
};

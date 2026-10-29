export interface ClaimableToken {
  assetId: string;
  ticker: string;
  logo: string;
  decimals: number;
  amount: number;
  premium: boolean;
  native: boolean;
  assetType?: 'nft';
  nft?: NftRewardMetadata;
}

export interface TokenInfo {
  decimals?: string | number;
  logo?: string;
  ticker?: string;
  [key: string]: unknown;
}

export interface GetRewardsDto {
  consolidated_promises?: Record<string, number>;
  consolidated_rewards?: Record<string, number>;
  project_locked_rewards?: {
    consolidated_promises?: Record<string, number>;
    consolidated_rewards?: Record<string, number>;
  };
}

export function isNativeToken(assetId: string): boolean {
  const normalized = assetId.trim().toLowerCase();
  return normalized === '' || normalized === 'lovelace' || normalized === 'ada';
}


export interface NftRewardMetadata {
  name: string | null;
  image: string | null;
  collection: string | null;
  /** Classification evidence from the catalog; this is not on-chain authenticity verification. */
  identitySource: 'provider' | 'cip68';
}

export { nftRewardMetadata, nftImageUrl } from './nft';

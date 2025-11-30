export interface GetRewardsDto {
  consolidated_promises?: Record<string, number>;
  consolidated_rewards?: Record<string, number>;
  project_locked_rewards?: {
    consolidated_promises?: Record<string, number>;
    consolidated_rewards?: Record<string, number>;
  };
}

export interface ClaimableToken {
  assetId: string;
  ticker: string;
  logo: string;
  decimals: number;
  amount: number;
  premium: boolean;
  native: boolean;
  price: number;
  total: number;
}

export interface TokenInfo {
  decimals?: number;
  logo?: string;
  ticker?: string;
  [key: string]: unknown;
}

export interface TokenPrices {
  [assetId: string]: number;
}


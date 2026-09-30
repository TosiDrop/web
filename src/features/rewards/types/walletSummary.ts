export interface WalletHolding {
  unit: string;
  quantity: string;
  name: string | null;
  ticker: string | null;
  decimals: number | null;
  metadataPending: boolean;
  priceUsd: number | null;
  priceChange24h: number | null;
  valueUsd: number | null;
  pricePending: boolean;
  priceObservedAt?: number | null;
  priceSource?: string | null;
  priceSourceCount?: number;
}

export interface WalletSummary {
  observedAt?: number;
  degraded: boolean;
  sources?: { account: boolean; assets: boolean; rewards: boolean };
  balance: {
    accountLovelace: string | null;
    utxoLovelace: string | null;
    rewardsAvailableLovelace: string | null;
    adaPriceUsd: number | null;
    adaPriceChange24h: number | null;
    adaPriceObservedAt?: number | null;
    adaPriceSource?: string | null;
    withdrawnLovelace?: string | null;
    stakeDepositLovelace?: string | null;
  };
  delegation?: { poolId: string | null; registered: boolean | null; drepId?: string | null };
  rewards?: {
    totalLovelace: string | null;
    epochs: Array<{ epoch: number | null; amountLovelace: string; poolId: string | null; type: string | null; spendableEpoch?: number | null }>;
  };
  holdings: WalletHolding[];
  metadata: { complete: boolean; returned: number; total: number };
  market: { configured: boolean; priced: number; requested: number };
  valueHistory: {
    points: Array<{ observedAt: number; valueAda: number }>;
    basis: 'current-holdings';
    rangeDays: number;
  };
}

import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/common/Card';
import { apiClient } from '@/api/client';
import { DEPLOYMENT_NETWORK } from '@/config/network';
import { useWalletStore, type WalletInstance } from '@/store/wallet-state';
import { ApiError } from '@/types/api';
import type { WalletSummary } from '../types/walletSummary';
import { WalletPortfolio } from './WalletPortfolio';

async function readAttachedLovelace(wallet: WalletInstance): Promise<string> {
  if (!wallet) throw new Error('Wallet is not connected');
  const meshBalance = (
    wallet as unknown as {
      getBalanceMesh?: () => Promise<Array<{ unit: string; quantity: string }>>;
    }
  ).getBalanceMesh;
  if (meshBalance) {
    const assets = await meshBalance.call(wallet);
    return assets.find((asset) => asset.unit === 'lovelace')?.quantity ?? '0';
  }
  return wallet.getLovelace();
}

export function WalletComposition() {
  const { connected, stakeAddress, wallet } = useWalletStore();
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['wallet-summary', DEPLOYMENT_NETWORK, stakeAddress],
    queryFn: async () => {
      const [summaryResult, walletResult] = await Promise.allSettled([
        apiClient.get<WalletSummary>(
          `/api/wallet/summary?staking_address=${encodeURIComponent(stakeAddress!)}`,
        ),
        readAttachedLovelace(wallet),
      ]);
      const attachedLovelace =
        walletResult.status === 'fulfilled' ? walletResult.value : null;
      if (summaryResult.status === 'fulfilled')
        return { summary: summaryResult.value, attachedLovelace };
      if (
        summaryResult.reason instanceof ApiError &&
        summaryResult.reason.status === 400
      )
        throw summaryResult.reason;
      const summary: WalletSummary = {
        balance: {
          accountLovelace: attachedLovelace,
          utxoLovelace: attachedLovelace,
          rewardsAvailableLovelace: null,
          adaPriceUsd: null,
          adaPriceChange24h: null,
        },
        holdings: [],
        metadata: { complete: false, returned: 0, total: 0 },
        market: { configured: false, priced: 0, requested: 0 },
        valueHistory: { points: [], basis: 'current-holdings', rangeDays: 30 },
        degraded: true,
        sources: { account: false, assets: false, rewards: false },
      };
      return { summary, attachedLovelace };
    },
    enabled: connected && !!stakeAddress && !!wallet,
    staleTime: 30_000,
    refetchInterval: (query) =>
      query.state.error instanceof ApiError && query.state.error.status === 400
        ? false
        : 30_000,
    retry: (count, queryError) =>
      !(queryError instanceof ApiError && queryError.status === 400) &&
      count < 2,
  });

  if (error instanceof ApiError && error.status === 400) {
    return (
      <Card className="p-5">
        <div role="alert">
          <h2 className="font-medium text-text-primary">
            Wallet address rejected
          </h2>
          <p className="mt-2 text-sm text-text-secondary">{error.message}</p>
          <p className="mt-2 text-sm text-text-muted">
            Reconnect your wallet with an account on this network.
          </p>
        </div>
      </Card>
    );
  }
  if (!connected || !stakeAddress || !data) {
    return (
      <Card className="p-5">
        <p role="status" className="text-sm text-text-muted">
          {!connected
            ? 'Connect a wallet to see your holdings.'
            : isLoading
              ? 'Loading wallet portfolio…'
              : 'Waiting for wallet data…'}
        </p>
      </Card>
    );
  }
  return (
    <WalletPortfolio
      summary={data.summary}
      walletLovelace={
        data.attachedLovelace ?? data.summary.balance.utxoLovelace
      }
      liveBalance={data.attachedLovelace !== null}
      stakeAddress={stakeAddress}
      refreshing={isFetching}
      onRefresh={() => {
        void refetch();
      }}
    />
  );
}

import { useState, useEffect, useCallback } from 'react';
import { FeedbackBanner } from '@/components/common/FeedbackBanner';
import { ClaimButton } from '@/features/claim/components/ClaimButton';
import { ClaimStatusDisplay } from '@/features/claim/components/ClaimStatus';
import { DepositInfoDisplay } from '@/features/claim/components/DepositInfo';
import { useRewards } from '@/features/rewards/api/rewards.queries';
import { useClaimFlow } from '@/features/claim/hooks/useClaimFlow';
import { useWalletStore } from '@/store/wallet-state';
import { isAdaHandle, resolveAdaHandle } from '@/utils/ada-handle';
import type { ClaimableToken } from '@/shared/rewards';

import { ClaimPageHeader } from '@/features/rewards/components/ClaimPageHeader';
import { GlobalClaimCard } from '@/features/rewards/components/GlobalClaimCard';
import { AvailableDistributions } from '@/features/rewards/components/AvailableDistributions';
import { NetworkStatusWidget } from '@/features/rewards/components/NetworkStatusWidget';
import { RewardsAllocation } from '@/features/rewards/components/RewardsAllocation';
import { WalletComposition } from '@/features/rewards/components/WalletComposition';

export default function ClaimPage() {
  const { stakeAddress, connected, networkId } = useWalletStore();
  const [lookupAddress, setLookupAddress] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const claimFlow = useClaimFlow();

  // Sync lookup address with wallet connection state
  useEffect(() => {
    if (stakeAddress) {
      setLookupAddress(stakeAddress);
    } else if (!connected) {
      setLookupAddress(null);
      setResolveError(null);
    }
  }, [stakeAddress, connected]);

  const { data: rewards, isLoading, error, refetch } = useRewards(lookupAddress);

  const walletReady = connected && !!stakeAddress;
  const hasRewards = rewards && rewards.length > 0;
  const claimInProgress = !['idle', 'success', 'error'].includes(claimFlow.state.step);
  const canClaim = walletReady && lookupAddress?.toLowerCase() === stakeAddress?.toLowerCase();
  const depositInfo = 'info' in claimFlow.state ? claimFlow.state.info : null;
  const depositBusy = claimFlow.state.step === 'signing' || claimFlow.state.step === 'polling';
  const showDeposit =
    !!depositInfo && claimFlow.state.step !== 'success' && claimFlow.state.step !== 'error';

  const handleLookup = useCallback(async (input: string) => {
    setResolveError(null);

    let resolved = input;
    if (isAdaHandle(input)) {
      setResolving(true);
      try {
        resolved = await resolveAdaHandle(input);
      } catch (e) {
        setResolveError(e instanceof Error ? e.message : 'Failed to resolve handle');
        setResolving(false);
        return;
      }
      setResolving(false);
    }

    // If same address, force refetch. Otherwise update triggers a new query.
    if (resolved === lookupAddress) {
      refetch();
    } else {
      setLookupAddress(resolved);
    }
  }, [lookupAddress, refetch]);

  const handleClaim = (token?: ClaimableToken) => {
    if (!rewards) return;
    const assetIds = token ? [token.assetId] : rewards.map((r) => r.assetId);
    claimFlow.startClaim(assetIds);
  };

  return (
    <div className="space-y-6">
      <ClaimPageHeader />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <GlobalClaimCard
            onLookup={handleLookup}
            isLoading={isLoading || resolving}
            activeAddress={lookupAddress}
          />

          {resolveError && (
            <FeedbackBanner
              tone="error"
              title="Handle resolution failed"
              message={resolveError}
            />
          )}

          {error && (
            <FeedbackBanner
              tone="error"
              title="Unable to fetch rewards"
              message={error.message}
            />
          )}

          {hasRewards && canClaim && claimFlow.state.step !== 'awaiting_deposit' && (
            <ClaimButton
              state={claimFlow.state}
              onClaim={handleClaim}
              disabled={claimFlow.state.step === 'success'}
            />
          )}

          {hasRewards && !canClaim && (
            <p className="text-sm text-slate-500">
              Connect this wallet to claim rewards.
            </p>
          )}

          {showDeposit && depositInfo && (
            <DepositInfoDisplay
              depositInfo={depositInfo}
              canSendFromWallet={claimFlow.canSendFromWallet}
              onSendFromWallet={claimFlow.sendDepositFromWallet}
              onMarkDeposited={claimFlow.markDepositedExternally}
              onCancel={claimFlow.reset}
              busy={depositBusy}
            />
          )}

          {isLoading ? (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-white">Claimable Tokens</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-28 animate-pulse rounded-xl border border-border-subtle bg-surface-raised" />
                ))}
              </div>
            </div>
          ) : (
            <AvailableDistributions
              tokens={rewards ?? []}
              onClaim={handleClaim}
              claimDisabled={claimInProgress || !canClaim}
            />
          )}
        </div>

        <div className="space-y-4">
          <RewardsAllocation tokens={rewards ?? []} />
          <WalletComposition />
          <NetworkStatusWidget />
        </div>
      </div>

      <ClaimStatusDisplay
        state={claimFlow.state}
        networkId={networkId}
        onReset={claimFlow.reset}
      />
    </div>
  );
}

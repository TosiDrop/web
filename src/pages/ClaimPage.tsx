import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { FeedbackBanner } from '@/components/common/FeedbackBanner';
import { useRewards } from '@/features/rewards/api/rewards.queries';
import { useWalletStore } from '@/store/wallet-state';
import { useClaimStore } from '@/store/claim-state';
import { isAdaHandle, resolveAdaHandle } from '@/utils/ada-handle';
import { getCustomRewards } from '@/features/claim/api/customRewards';

import { ClaimPageHeader } from '@/features/rewards/components/ClaimPageHeader';
import { GlobalClaimCard } from '@/features/rewards/components/GlobalClaimCard';
import { AvailableDistributions } from '@/features/rewards/components/AvailableDistributions';
import { NetworkStatusWidget } from '@/features/rewards/components/NetworkStatusWidget';
import { RewardsAllocation } from '@/features/rewards/components/RewardsAllocation';
import { WalletComposition } from '@/features/rewards/components/WalletComposition';

export default function ClaimPage() {
  const navigate = useNavigate();
  const { stakeAddress, connected } = useWalletStore();
  const selectedAssetIds = useClaimStore((s) => s.selectedAssetIds);
  const setSelected = useClaimStore((s) => s.setSelected);
  const setRequest = useClaimStore((s) => s.setRequest);

  const [lookupAddress, setLookupAddress] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const initializedFor = useRef<string | null>(null);

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
  const canClaim = walletReady && lookupAddress?.toLowerCase() === stakeAddress?.toLowerCase();
  const hasRewards = !!rewards && rewards.length > 0;

  useEffect(() => {
    if (!rewards || !lookupAddress) return;
    if (initializedFor.current === lookupAddress) return;
    initializedFor.current = lookupAddress;
    setSelected(rewards.map((r) => r.assetId));
  }, [rewards, lookupAddress, setSelected]);

  const handleLookup = useCallback(
    async (input: string) => {
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

      if (resolved === lookupAddress) {
        refetch();
      } else {
        initializedFor.current = null;
        setLookupAddress(resolved);
      }
    },
    [lookupAddress, refetch],
  );

  const claimMutation = useMutation({
    mutationFn: getCustomRewards,
    onSuccess: (result) => {
      setRequest({
        requestId: result.request_id,
        deposit: result.deposit,
        withdrawalAddress: result.withdrawal_address,
      });
      navigate('/deposit');
    },
  });

  const handleClaim = () => {
    if (!stakeAddress || selectedAssetIds.length === 0 || claimMutation.isPending) return;
    claimMutation.mutate({ stakeAddress, selected: selectedAssetIds });
  };

  const claimDisabled =
    !canClaim || selectedAssetIds.length === 0 || claimMutation.isPending;

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

          {claimMutation.error && (
            <FeedbackBanner
              tone="error"
              title="Could not start claim"
              message={
                claimMutation.error instanceof Error
                  ? claimMutation.error.message
                  : 'Unknown error'
              }
            />
          )}

          {hasRewards && canClaim && (
            <button
              type="button"
              onClick={handleClaim}
              disabled={claimDisabled}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-cyan px-8 py-3 text-base font-semibold text-surface-base shadow-lg shadow-brand-cyan/25 transition hover:bg-cyan-300 hover:shadow-brand-cyan/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              {claimMutation.isPending
                ? 'Preparing claim...'
                : `Claim ${selectedAssetIds.length} ${selectedAssetIds.length === 1 ? 'token' : 'tokens'}`}
            </button>
          )}

          {hasRewards && !canClaim && (
            <p className="text-sm text-slate-500">
              Connect this wallet to claim rewards.
            </p>
          )}

          {isLoading ? (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-white">Claimable tokens</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-28 animate-pulse rounded-xl border border-border-subtle bg-surface-raised"
                  />
                ))}
              </div>
            </div>
          ) : (
            <AvailableDistributions tokens={rewards ?? []} />
          )}
        </div>

        <div className="space-y-4">
          <RewardsAllocation tokens={rewards ?? []} />
          <WalletComposition />
          <NetworkStatusWidget />
        </div>
      </div>
    </div>
  );
}

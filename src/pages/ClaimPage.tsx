import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { IconCheck } from '@tabler/icons-react';
import { Card } from '@/components/common/Card';
import { FeedbackBanner } from '@/components/common/FeedbackBanner';
import { useRewards } from '@/features/rewards/api/rewards.queries';
import { useWalletStore } from '@/store/wallet-state';
import { useClaimStore } from '@/store/claim-state';
import { DEPLOYMENT_NETWORK } from '@/config/network';
import { networkFromId } from '@/shared/network';
import { isAdaHandle, resolveAdaHandle } from '@/utils/ada-handle';
import { getCustomRewards } from '@/features/claim/api/customRewards';

import { GlobalClaimCard } from '@/features/rewards/components/GlobalClaimCard';
import { ClaimWelcome } from '@/features/rewards/components/ClaimWelcome';
import { ClaimHero } from '@/features/rewards/components/ClaimHero';
import { AvailableDistributions } from '@/features/rewards/components/AvailableDistributions';
import { NetworkStatusWidget } from '@/features/rewards/components/NetworkStatusWidget';
import { RewardsAllocation } from '@/features/rewards/components/RewardsAllocation';
import { RewardsSummary } from '@/features/rewards/components/RewardsSummary';
import { WalletComposition } from '@/features/rewards/components/WalletComposition';

function LoadingTokens() {
  return (
    <Card className="p-5" role="status" aria-label="Loading rewards">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton-shimmer h-24 rounded-2xl" />
        ))}
      </div>
    </Card>
  );
}

function NoRewardsState() {
  return (
    <Card variant="inset" className="flex flex-col items-center px-8 py-12 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-status-success/[0.12] text-status-success-light">
        <IconCheck size={24} stroke={2.4} />
      </span>
      <p className="text-base font-semibold text-text-primary">Nothing to claim right now</p>
      <p className="mt-1.5 max-w-xs text-md leading-relaxed text-text-muted">
        New distributions land every epoch. Check back soon, or look up another address.
      </p>
    </Card>
  );
}

export default function ClaimPage() {
  const navigate = useNavigate();
  const { stakeAddress, connected, networkId } = useWalletStore();
  const selectedAssetIds = useClaimStore((s) => s.selectedAssetIds);
  const setSelected = useClaimStore((s) => s.setSelected);
  const setRequest = useClaimStore((s) => s.setRequest);
  const lookupAddress = useClaimStore((s) => s.lookupAddress);
  const setLookupAddress = useClaimStore((s) => s.setLookupAddress);
  const initSelectionFor = useClaimStore((s) => s.initSelectionFor);

  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  useEffect(() => {
    if (stakeAddress) {
      setLookupAddress(stakeAddress);
    } else if (!connected) {
      setLookupAddress(null);
      setResolveError(null);
    }
  }, [stakeAddress, connected, setLookupAddress]);

  const { data: rewards, isLoading, error, refetch } = useRewards(lookupAddress);

  const networkMatches = !connected || networkFromId(networkId) === DEPLOYMENT_NETWORK;

  const walletReady = connected && !!stakeAddress;
  const canClaim =
    walletReady &&
    networkMatches &&
    lookupAddress?.toLowerCase() === stakeAddress?.toLowerCase();
  const hasRewards = !!rewards && rewards.length > 0;
  const total = rewards?.length ?? 0;
  const allSelected = total > 0 && rewards!.every((r) => selectedAssetIds.includes(r.assetId));

  useEffect(() => {
    if (!rewards || !lookupAddress) return;
    initSelectionFor(lookupAddress, rewards.map((r) => r.assetId));
  }, [rewards, lookupAddress, initSelectionFor]);

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
        setLookupAddress(resolved);
      }
    },
    [lookupAddress, refetch, setLookupAddress],
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

  const toggleAll = () => {
    setSelected(allSelected ? [] : (rewards ?? []).map((r) => r.assetId));
  };

  const claimDisabled =
    !canClaim || selectedAssetIds.length === 0 || claimMutation.isPending;
  const loading = isLoading || resolving;

  return (
    <div className="space-y-6">
      <GlobalClaimCard
        onLookup={handleLookup}
        isLoading={loading}
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

      {lookupAddress ? <h1 className="sr-only">Claim rewards</h1> : <ClaimWelcome />}

      {lookupAddress && !loading && hasRewards && (
        <ClaimHero
          selectedCount={selectedAssetIds.length}
          totalCount={total}
          allSelected={allSelected}
          onToggleAll={toggleAll}
          onClaim={handleClaim}
          claimDisabled={claimDisabled}
          isPending={claimMutation.isPending}
          canClaim={canClaim}
        />
      )}

      {lookupAddress && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            {loading ? (
              <LoadingTokens />
            ) : hasRewards ? (
              <AvailableDistributions tokens={rewards ?? []} />
            ) : (
              !error && <NoRewardsState />
            )}
          </div>

          <div className="space-y-5">
            <RewardsSummary tokenCount={selectedAssetIds.length} />
            <RewardsAllocation tokens={rewards ?? []} />
            {connected && (
              <>
                <WalletComposition />
                <NetworkStatusWidget />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

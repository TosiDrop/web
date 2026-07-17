import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { IconCheck } from '@tabler/icons-react';
import { FeedbackBanner } from '@/components/common/FeedbackBanner';
import { useRewards } from '@/features/rewards/api/rewards.queries';
import { useWalletStore } from '@/store/wallet-state';
import { useClaimStore } from '@/store/claim-state';
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
    <div className="card-premium p-[22px]">
      <div className="mb-[18px] flex items-center gap-3">
        <span className="inline-block h-[18px] w-[18px] animate-[tdspin_0.8s_linear_infinite] rounded-full border-2 border-white/15 border-t-accent-light" />
        <span className="text-[13.5px] text-[#C5C8D2]">Scanning stake address…</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 0.15, 0.3, 0.1, 0.25, 0.4].map((delay, i) => (
          <div
            key={i}
            className="skeleton-shimmer h-24 rounded-[13px] border border-[rgba(56,78,128,0.25)]"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </div>
    </div>
  );
}

function NoRewardsState() {
  return (
    <div className="flex h-[300px] flex-col items-center justify-center rounded-[16px] border border-border-subtle bg-surface-inset px-8 text-center">
      <span className="mb-[18px] flex h-[54px] w-[54px] items-center justify-center rounded-full bg-[#4ADE80]/[0.12]">
        <IconCheck size={26} stroke={2.4} className="text-[#4ADE80]" />
      </span>
      <p className="text-[17px] font-semibold text-[#F4F5F7]">You're all caught up</p>
      <p className="mt-1.5 max-w-[320px] text-[13px] leading-relaxed text-[#8A8E9A]">
        No claimable rewards right now. New distributions land each epoch — check back soon.
      </p>
    </div>
  );
}

export default function ClaimPage() {
  const navigate = useNavigate();
  const { stakeAddress, connected } = useWalletStore();
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
  }, [stakeAddress, connected]);

  const { data: rewards, isLoading, error, refetch } = useRewards(lookupAddress);

  const walletReady = connected && !!stakeAddress;
  const canClaim = walletReady && lookupAddress?.toLowerCase() === stakeAddress?.toLowerCase();
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

      {!lookupAddress && <ClaimWelcome />}

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

          <div className="space-y-[18px]">
            <RewardsSummary tokenCount={selectedAssetIds.length} />
            <RewardsAllocation tokens={rewards ?? []} />
            <WalletComposition />
            <NetworkStatusWidget />
          </div>
        </div>
      )}
    </div>
  );
}

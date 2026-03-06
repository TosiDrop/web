import { SectionCard } from '@/components/common/SectionCard';
import { FeedbackBanner } from '@/components/common/FeedbackBanner';
import { RewardsSummary } from '@/features/rewards/components/RewardsSummary';
import { RewardsGrid } from '@/features/rewards/components/RewardsGrid';
import { RewardsEmptyState } from '@/features/rewards/components/RewardsEmptyState';
import { ClaimButton } from '@/features/claim/components/ClaimButton';
import { ClaimStatusDisplay } from '@/features/claim/components/ClaimStatus';
import { useRewards } from '@/features/rewards/api/rewards.queries';
import { useClaimFlow } from '@/features/claim/hooks/useClaimFlow';
import { useWalletStore } from '@/store/wallet-state';

export default function ClaimPage() {
  const { stakeAddress, connected } = useWalletStore();
  const { data: rewards, isLoading, error, refetch } = useRewards(stakeAddress);
  const claimFlow = useClaimFlow();

  const hasRewards = rewards && rewards.length > 0;

  const handleClaim = () => {
    if (!rewards) return;
    const assetIds = rewards.map((r) => r.assetId);
    claimFlow.startClaim(assetIds);
  };

  return (
    <div className="space-y-8">
      <header className="space-y-4 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-blue-300">TosiDrop</p>
        <h1 className="text-4xl font-bold text-white">Claim rewards effortlessly</h1>
        <p className="text-gray-300">
          Connect your Cardano wallet to discover and claim your tokens.
        </p>
      </header>

      {!connected && (
        <SectionCard title="Get started">
          <p className="text-gray-300">
            Connect your wallet using the button in the navigation bar to see your claimable rewards.
          </p>
        </SectionCard>
      )}

      {connected && isLoading && (
        <SectionCard>
          <p className="animate-pulse text-gray-400">Loading rewards...</p>
        </SectionCard>
      )}

      {error && (
        <FeedbackBanner
          tone="error"
          title="Unable to fetch rewards"
          message={error.message}
        />
      )}

      {hasRewards && (
        <>
          <RewardsSummary tokens={rewards} />
          <SectionCard
            title="Claimable tokens"
            description="All amounts are displayed using the token's precision."
            actions={
              <ClaimButton
                state={claimFlow.state}
                onClaim={handleClaim}
                disabled={!connected || claimFlow.state.step === 'completed'}
              />
            }
          >
            <RewardsGrid tokens={rewards} />
          </SectionCard>
          <ClaimStatusDisplay state={claimFlow.state} onReset={claimFlow.reset} />
        </>
      )}

      {connected && !isLoading && !hasRewards && !error && (
        <RewardsEmptyState show />
      )}

      {connected && !isLoading && !hasRewards && (
        <div className="text-center">
          <button
            onClick={() => refetch()}
            className="text-sm text-gray-400 underline hover:text-white"
          >
            Refresh rewards
          </button>
        </div>
      )}
    </div>
  );
}

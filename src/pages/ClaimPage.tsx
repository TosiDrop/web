import { SectionCard } from '@/components/common/SectionCard';
import { FeedbackBanner } from '@/components/common/FeedbackBanner';
import { WalletAddressForm } from '@/features/rewards/components/WalletAddressForm';
import { RewardsSummary } from '@/features/rewards/components/RewardsSummary';
import { RewardsGrid } from '@/features/rewards/components/RewardsGrid';
import { RewardsEmptyState } from '@/features/rewards/components/RewardsEmptyState';
import { useRewards } from '@/features/rewards/hooks/useRewards';
import { useWalletState } from '@/store/wallet-state';

const ClaimPage = () => {
  const { walletAddress } = useWalletState();

  const {
    addressInput,
    setAddressInput,
    rewards,
    isLoading,
    error,
    fetchRewards,
    hasResults,
  } = useRewards(walletAddress);

  const showEmptyState = !isLoading && !hasResults && !error;

  return (
    <div className="space-y-8">
      <header className="text-center space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-blue-300">TosiDrop</p>
        <h1 className="text-4xl font-bold text-white">Claim rewards effortlessly</h1>
        <p className="text-gray-300">
          Use any Cardano wallet to discover the tokens you can claim. We'll show balances and optional pricing in one place.
        </p>
      </header>

      <WalletAddressForm
        value={addressInput}
        fallbackAddress={walletAddress}
        onChange={setAddressInput}
        onSubmit={() => fetchRewards()}
        isLoading={isLoading}
      />

      {error && (
        <FeedbackBanner
          tone="error"
          title="Unable to fetch rewards"
          message={error}
        />
      )}

      {hasResults && (
        <>
          <RewardsSummary tokens={rewards} />
          <SectionCard
            title="Claimable tokens"
            description="All amounts are displayed using the token's precision."
          >
            <RewardsGrid tokens={rewards} />
          </SectionCard>
        </>
      )}

      <RewardsEmptyState show={showEmptyState} />
    </div>
  );
};

export default ClaimPage;


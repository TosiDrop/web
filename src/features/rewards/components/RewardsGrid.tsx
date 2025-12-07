import type { ClaimableToken } from '@/shared/rewards';
import { RewardCard } from './RewardCard';

interface RewardsGridProps {
  tokens: ClaimableToken[];
}

export const RewardsGrid = ({ tokens }: RewardsGridProps) => {
  if (!tokens.length) return null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tokens.map((token, index) => (
        <RewardCard key={`${token.assetId}-${index}`} token={token} />
      ))}
    </div>
  );
};


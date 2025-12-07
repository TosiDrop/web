import { SectionCard } from '@/components/common/SectionCard';
import type { ClaimableToken } from '@/shared/rewards';

interface RewardsSummaryProps {
  tokens: ClaimableToken[];
}

export const RewardsSummary = ({ tokens }: RewardsSummaryProps) => {
  if (!tokens.length) return null;

  return (
    <SectionCard
      title="Rewards overview"
    >
      <dl className="grid grid-cols-1 gap-6 text-center sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <dt className="text-sm text-gray-400">Tokens</dt>
          <dd className="text-3xl font-semibold text-white">
            {tokens.length.toLocaleString()}
          </dd>
        </div>
      </dl>
    </SectionCard>
  );
};


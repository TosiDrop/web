import { SectionCard } from '@/components/common/SectionCard';

interface RewardsEmptyStateProps {
  show: boolean;
}

export const RewardsEmptyState = ({ show }: RewardsEmptyStateProps) => {
  if (!show) return null;

  return (
    <SectionCard title="No rewards found" description="We checked your wallet but didn't find any claimable tokens.">
      <ul className="list-disc space-y-2 pl-5 text-sm text-gray-300">
        <li>Make sure your wallet is connected and on the correct network.</li>
        <li>Rewards appear when your stake address has pending distributions.</li>
      </ul>
    </SectionCard>
  );
};

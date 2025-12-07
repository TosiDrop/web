import { SectionCard } from '@/components/common/SectionCard';

interface RewardsEmptyStateProps {
  show: boolean;
}

export const RewardsEmptyState = ({ show }: RewardsEmptyStateProps) => {
  if (!show) return null;

  return (
    <SectionCard title="No rewards yet" description="Enter a wallet address to get started.">
      <ul className="list-disc space-y-2 pl-5 text-sm text-gray-300">
        <li>Paste any Cardano wallet or connect your wallet from the header.</li>
        <li>Click "Get rewards" to fetch the latest claimable tokens.</li>
      </ul>
    </SectionCard>
  );
};


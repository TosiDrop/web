import { FeedbackBanner } from '@/components/common/FeedbackBanner';

export function HistoryInfoBanner() {
  return (
    <FeedbackBanner
      tone="info"
      title="Chain Indexing Delay"
      message="Recent transactions may take a few minutes to appear in your history due to blockchain indexing delays. Pending transactions will update automatically once confirmed."
    />
  );
}

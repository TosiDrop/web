import { HistoryPageHeader } from '@/features/history/components/HistoryPageHeader';
import { HistoryInfoBanner } from '@/features/history/components/HistoryInfoBanner';

export default function HistoryPage() {
  return (
    <div className="space-y-8">
      <HistoryPageHeader />
      <p className="py-12 text-center text-sm text-gray-400">
        Claim history will appear here once the history API is available.
      </p>
      <HistoryInfoBanner />
    </div>
  );
}

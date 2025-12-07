import { SectionCard } from '@/components/common/SectionCard';

const HistoryPage = () => {
  return (
    <div className="space-y-8">
      <header className="space-y-4 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-blue-300">
          History
        </p>
        <h1 className="text-4xl font-bold text-white">Claim history</h1>
        <p className="text-gray-300">
          View your past claims and transactions.
        </p>
      </header>
      <SectionCard
        title="No history yet"
        description="Your claim history will appear here once you start claiming rewards."
      >
        <p className="text-gray-400">
          Start claiming rewards to see your history.
        </p>
      </SectionCard>
    </div>
  );
};

export default HistoryPage;


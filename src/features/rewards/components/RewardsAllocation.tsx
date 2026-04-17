import type { ClaimableToken } from '@/shared/rewards';
import { DonutChart, type DonutSegment } from '@/components/charts/DonutChart';

const PALETTE = ['#3B82F6', '#A855F7', '#F59E0B', '#EC4899', '#10B981', '#22D3EE', '#8B5CF6', '#F97316', '#64748B'];

interface RewardsAllocationProps {
  tokens: ClaimableToken[];
}

export function RewardsAllocation({ tokens }: RewardsAllocationProps) {
  if (tokens.length === 0) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface-raised p-4">
        <h3 className="text-xs font-medium text-slate-400">Rewards Allocation</h3>
        <p className="mt-3 text-center text-xs text-slate-500">No rewards available</p>
      </div>
    );
  }

  const segments: DonutSegment[] = tokens.map((t, i) => ({
    label: t.ticker,
    value: t.amount || 1,
    color: PALETTE[i % PALETTE.length],
  }));

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-raised p-4">
      <h3 className="text-xs font-medium text-slate-400">Rewards Allocation</h3>
      <div className="mt-3">
        <DonutChart
          segments={segments}
          size={130}
          strokeWidth={16}
          centerLabel={`${tokens.length}`}
          centerSub="tokens"
        />
      </div>
    </div>
  );
}

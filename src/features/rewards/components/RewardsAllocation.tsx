import { useMemo } from 'react';
import type { ClaimableToken } from '@/shared/rewards';

// Color pairs (base → highlight) for the gradient bars, assigned by rank.
const BAR_COLORS: [string, string][] = [
  ['#14B8A6', '#2DD4BF'],
  ['#3B82F6', '#60A5FA'],
  ['#22C55E', '#4ADE80'],
  ['#EF4444', '#F87171'],
  ['#F59E0B', '#FBBF24'],
];

const MAX_ROWS = 5;

interface RewardsAllocationProps {
  tokens: ClaimableToken[];
}

function formatPct(fraction: number): string {
  const pct = fraction * 100;
  if (pct >= 1) return `${Math.round(pct)}%`;
  if (pct > 0) return '<1%';
  return '0%';
}

export function RewardsAllocation({ tokens }: RewardsAllocationProps) {
  const { rows, remaining } = useMemo(() => {
    const sorted = [...tokens].sort((a, b) => b.amount - a.amount);
    const total = sorted.reduce((sum, t) => sum + (t.amount || 0), 0) || 1;
    const max = sorted[0]?.amount || 1;
    const top = sorted.slice(0, MAX_ROWS).map((t, i) => ({
      ticker: t.ticker,
      pct: formatPct(t.amount / total),
      // Bar scaled to the leader for a clean ranked read, with a visible floor.
      width: `${Math.max(8, Math.round(((t.amount || 0) / max) * 100))}%`,
      colors: BAR_COLORS[i % BAR_COLORS.length],
    }));
    return { rows: top, remaining: Math.max(0, sorted.length - MAX_ROWS) };
  }, [tokens]);

  if (tokens.length === 0) {
    return (
      <div className="card-premium p-5">
        <h3 className="text-[13.5px] font-semibold text-[#C5C8D2]">Rewards allocation</h3>
        <p className="mt-3 text-center text-xs text-[#6B6F7B]">No rewards available</p>
      </div>
    );
  }

  return (
    <div className="card-premium p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[13.5px] font-semibold text-[#C5C8D2]">Rewards allocation</h3>
        <span className="font-mono text-[11px] text-[#6B6F7B]">
          {tokens.length} {tokens.length === 1 ? 'token' : 'tokens'}
        </span>
      </div>

      <div className="mt-[18px] flex flex-col gap-[13px]">
        {rows.map((row) => (
          <div key={row.ticker}>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[12.5px] text-[#C5C8D2]">{row.ticker}</span>
              <span className="font-mono text-[11px] text-[#8A8E9A]">{row.pct}</span>
            </div>
            <div className="h-[7px] overflow-hidden rounded-[5px] bg-white/[0.06]">
              <div
                className="h-full rounded-[5px]"
                style={{
                  width: row.width,
                  background: `linear-gradient(90deg, ${row.colors[0]}, ${row.colors[1]})`,
                }}
              />
            </div>
          </div>
        ))}
        {remaining > 0 && (
          <div className="text-[12px] text-[#6B6F7B]">
            +{remaining} more {remaining === 1 ? 'token' : 'tokens'}
          </div>
        )}
      </div>
    </div>
  );
}

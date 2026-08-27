import { useMemo } from 'react';
import type { ClaimableToken } from '@/shared/rewards';
import { Card } from '@/components/common/Card';

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
      color: `var(--color-chart-${(i % 6) + 1})`,
    }));
    return { rows: top, remaining: Math.max(0, sorted.length - MAX_ROWS) };
  }, [tokens]);

  if (tokens.length === 0) {
    return (
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-text-secondary">Rewards allocation</h3>
        <p className="mt-3 text-xs text-text-muted">No rewards to show.</p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-text-secondary">Rewards allocation</h3>
        <span className="font-mono text-2xs tabular-nums text-text-muted">
          {tokens.length} {tokens.length === 1 ? 'token' : 'tokens'}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.ticker}>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-md text-text-secondary">{row.ticker}</span>
              <span className="font-mono text-2xs tabular-nums text-text-muted">{row.pct}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full"
                style={{ width: row.width, backgroundColor: row.color }}
              />
            </div>
          </div>
        ))}
        {remaining > 0 && (
          <div className="text-xs text-text-muted">
            +{remaining} more {remaining === 1 ? 'token' : 'tokens'}
          </div>
        )}
      </div>
    </Card>
  );
}

import { IconAlertCircle } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { usePlatformStats, type PlatformStats as Stats } from '@/features/analytics/hooks/usePlatformStats';
import { shortUptime } from '@/features/analytics/utils/uptime';

const num = (n: number) => n.toLocaleString();
const ada = (lovelace: number) =>
  `₳ ${(lovelace / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

function Metric({ label, value, detail }: { label: string; value: string; detail?: React.ReactNode }) {
  return (
    <div className="bg-surface-raised px-5 py-5">
      <p className="label-eyebrow">{label}</p>
      <p className="mt-3 font-mono text-2xl font-medium tracking-tight text-white">{value}</p>
      {detail && <div className="mt-1 text-xs text-slate-500">{detail}</div>}
    </div>
  );
}

function StatusDot({ up, label }: { up: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('h-1.5 w-1.5 rounded-full', up ? 'bg-emerald-400' : 'bg-rose-400')} aria-hidden="true" />
      {label} {up ? 'up' : 'down'}
    </span>
  );
}

function WithdrawalsBar({ processed, failed }: { processed: number; failed: number }) {
  const total = processed + failed || 1;
  return (
    <div className="mt-2">
      <div className="flex h-1.5 overflow-hidden rounded-full bg-surface-inset" aria-hidden="true">
        <div className="bg-emerald-400" style={{ width: `${(processed / total) * 100}%` }} />
        <div className="bg-rose-400" style={{ width: `${(failed / total) * 100}%` }} />
      </div>
      <p className="mt-1">
        {num(processed)} processed · {num(failed)} failed
      </p>
    </div>
  );
}

export function PlatformStatsGrid({ stats }: { stats: Stats }) {
  return (
    <div className="card-premium grid grid-cols-2 gap-px overflow-hidden bg-border-subtle/50 md:grid-cols-4">
      <Metric label="Rewards delivered" value={num(stats.delivered_rewards)} detail="All-time token deliveries" />
      <Metric label="Delegators tracked" value={num(stats.tracked_delegators)} detail={ada(stats.tracked_stake) + ' tracked stake'} />
      <Metric
        label="Pending"
        value={num(stats.pending_tx)}
        detail={`${num(stats.pending_rewards)} rewards · ${num(stats.pending_promises)} promises queued`}
      />
      <Metric
        label="Withdrawals"
        value={num(stats.processed_withdrawals + stats.failed_withdrawals)}
        detail={<WithdrawalsBar processed={stats.processed_withdrawals} failed={stats.failed_withdrawals} />}
      />
      <Metric
        label="Uptime"
        value={shortUptime(stats.uptime)}
        detail={
          <span className="flex flex-wrap gap-x-3">
            <StatusDot up={stats.backend_up} label="Backend" />
            <StatusDot up={stats.ntds_up} label="NTDS" />
          </span>
        }
      />
      <Metric label="Epoch" value={num(stats.epoch)} detail="Current VM epoch" />
    </div>
  );
}

export function PlatformStats() {
  const { data, isLoading, error } = usePlatformStats();

  if (isLoading) {
    return (
      <div className="card-premium grid grid-cols-2 gap-px overflow-hidden bg-border-subtle/50 md:grid-cols-4" aria-busy="true" aria-label="Loading platform statistics">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-surface-raised px-5 py-5">
            <div className="skeleton-shimmer h-2.5 w-20 rounded" />
            <div className="skeleton-shimmer mt-4 h-7 w-24 rounded" />
          </div>
        ))}
      </div>
    );
  }
  if (error || !data) {
    return (
      <div role="alert" className="card-premium flex items-start gap-3 px-5 py-4 text-sm text-rose-200">
        <IconAlertCircle size={18} className="mt-0.5 shrink-0" />
        {error?.message ?? 'Platform statistics are unavailable.'}
      </div>
    );
  }
  return <PlatformStatsGrid stats={data} />;
}

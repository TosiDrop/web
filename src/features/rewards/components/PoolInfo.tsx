import { useState } from 'react';
import { IconShieldCheck, IconAlertTriangle } from '@tabler/icons-react';
import { usePools, type Pool } from '@/features/rewards/api/pools.queries';

interface PoolInfoProps {
  poolId: string | null;
}

function PoolLogo({ pool }: { pool: Pool }) {
  const [failed, setFailed] = useState(false);
  if (pool.logo && !failed) {
    return (
      <img
        src={pool.logo}
        alt=""
        onError={() => setFailed(true)}
        className="h-10 w-10 shrink-0 rounded-full border border-border-subtle bg-surface-inset object-cover"
      />
    );
  }
  const initials = (pool.ticker || pool.name || '??').slice(0, 3).toUpperCase();
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-cyan/20 bg-gradient-to-br from-brand-cyan/15 to-brand-teal/10 font-mono text-[11px] font-medium uppercase text-brand-cyan">
      {initials}
    </div>
  );
}

function WhitelistBadge({ enabled }: { enabled: boolean }) {
  if (enabled) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
        <IconShieldCheck size={11} stroke={1.8} />
        Whitelisted
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
      <IconAlertTriangle size={11} stroke={1.8} />
      Not whitelisted
    </span>
  );
}

export function PoolInfo({ poolId }: PoolInfoProps) {
  const { data: pools, isLoading } = usePools();

  if (!poolId) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface-raised p-4">
        <p className="label-eyebrow">Delegation</p>
        <p className="mt-2 text-sm text-slate-500">No delegated pool detected.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface-raised p-4">
        <div className="h-3 w-20 animate-pulse rounded bg-surface-inset" />
        <div className="mt-3 flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-surface-inset" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 animate-pulse rounded bg-surface-inset" />
            <div className="h-2.5 w-20 animate-pulse rounded bg-surface-inset/60" />
          </div>
        </div>
      </div>
    );
  }

  const pool = pools?.[poolId];

  if (!pool) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface-raised p-4">
        <p className="label-eyebrow">Delegation</p>
        <p className="mt-2 text-sm text-white">Unknown pool</p>
        <p className="mt-1 font-mono text-[11px] text-slate-500">{poolId}</p>
        <div className="mt-3">
          <WhitelistBadge enabled={false} />
        </div>
      </div>
    );
  }

  const whitelisted = pool.enabled === '1';

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-raised p-4">
      <div className="flex items-center justify-between">
        <p className="label-eyebrow">Delegation</p>
        <WhitelistBadge enabled={whitelisted} />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <PoolLogo pool={pool} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">
            {pool.name || pool.ticker || 'Pool'}
          </p>
          {pool.ticker && (
            <p className="mt-0.5 font-mono text-[11px] text-slate-400">[{pool.ticker}]</p>
          )}
        </div>
      </div>
    </div>
  );
}

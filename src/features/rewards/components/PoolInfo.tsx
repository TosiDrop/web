import { useState } from 'react';
import { IconShieldCheck, IconAlertTriangle } from '@tabler/icons-react';
import { usePools, useWhitelist, type Pool } from '@/features/rewards/api/pools.queries';

interface PoolInfoProps {
  poolId: string | null;
  /** True while the caller is still resolving which pool the wallet delegates to. */
  isLoading?: boolean;
  /** Set when the delegation lookup itself failed; distinct from "not delegating". */
  error?: Error | null;
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
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-inset font-mono text-[11px] font-medium uppercase text-slate-300">
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

function WhitelistStatus({
  poolId,
  whitelist,
  isLoading,
  isError,
}: {
  poolId: string;
  whitelist: Set<string> | undefined;
  isLoading: boolean;
  isError: boolean;
}) {
  if (isError) {
    return <span className="text-[10px] text-amber-300">Whitelist unavailable</span>;
  }
  if (isLoading || !whitelist) return null;
  return <WhitelistBadge enabled={whitelist.has(poolId)} />;
}

export function PoolInfo({ poolId, isLoading: resolving = false, error = null }: PoolInfoProps) {
  const { data: pools, isLoading: poolsLoading, isError } = usePools();
  const whitelistQuery = useWhitelist();
  const isLoading = resolving || (!!poolId && poolsLoading);
  const status = poolId ? (
    <WhitelistStatus
      poolId={poolId}
      whitelist={whitelistQuery.data}
      isLoading={whitelistQuery.isLoading}
      isError={whitelistQuery.isError}
    />
  ) : null;

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

  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-border-subtle bg-surface-raised p-4">
        <p className="label-eyebrow">Delegation</p>
        <p className="mt-2 text-sm text-rose-300">Couldn't look up your delegation.</p>
        <p className="mt-1 text-xs text-slate-500">{error.message}</p>
      </div>
    );
  }

  if (!poolId) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface-raised p-4">
        <p className="label-eyebrow">Delegation</p>
        <p className="mt-2 text-sm text-slate-500">This stake address isn't delegated to a pool.</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface-raised p-4">
        <p className="label-eyebrow">Delegation</p>
        <p className="mt-2 text-sm text-rose-300">Failed to load pool metadata.</p>
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
        {status && <div className="mt-3">{status}</div>}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-raised p-4">
      <div className="flex items-center justify-between">
        <p className="label-eyebrow">Delegation</p>
        {status}
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

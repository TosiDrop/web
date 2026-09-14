import { useState } from 'react';
import { IconShieldCheck } from '@tabler/icons-react';
import { canonicalPoolId, usePartnerPoolIds, usePools, type Pool } from '@/features/rewards/api/pools.queries';

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

function PartnerBadge({ poolId }: { poolId: string }) {
  const { data: partnerIds, isLoading } = usePartnerPoolIds();
  if (isLoading || !partnerIds?.some((id) => canonicalPoolId(id) === canonicalPoolId(poolId))) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
      <IconShieldCheck size={11} stroke={1.8} />
      Partner
    </span>
  );
}

export function PoolInfo({ poolId, isLoading: resolving = false, error = null }: PoolInfoProps) {
  const { data: pools, isLoading: poolsLoading, isError } = usePools();
  const isLoading = resolving || (!!poolId && poolsLoading);

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

  const pool = pools?.[poolId] ?? Object.entries(pools ?? {}).find(([key, value]) =>
    canonicalPoolId(key) === canonicalPoolId(poolId) || canonicalPoolId(value.id) === canonicalPoolId(poolId),
  )?.[1];

  if (!pool) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface-raised p-4">
        <p className="label-eyebrow">Delegation</p>
        <p className="mt-2 text-sm text-white">Unknown pool</p>
        <p className="mt-1 truncate font-mono text-[11px] text-slate-500" title={poolId}>{poolId}</p>
        <div className="mt-3"><PartnerBadge poolId={poolId} /></div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-raised p-4">
      <div className="flex items-center justify-between">
        <p className="label-eyebrow">Delegation</p>
        <PartnerBadge poolId={poolId} />
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
          <p className="mt-0.5 truncate font-mono text-[10px] text-slate-500" title={poolId}>{poolId}</p>
        </div>
      </div>
    </div>
  );
}

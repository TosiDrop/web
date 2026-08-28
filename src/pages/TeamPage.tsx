import { useState } from 'react';
import { IconAlertCircle, IconExternalLink } from '@tabler/icons-react';
import { useWhitelistedPools, type TeamPool } from '@/features/team/api/team.queries';

function PoolLogo({ logo, ticker }: { logo?: string; ticker: string }) {
  const [failed, setFailed] = useState(false);
  if (logo && !failed) {
    return (
      <img
        src={logo}
        alt=""
        onError={() => setFailed(true)}
        className="h-10 w-10 shrink-0 rounded-full border border-border-subtle bg-surface-inset object-cover"
      />
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-inset font-mono text-[10px] font-medium uppercase tracking-tight text-slate-300">
      {ticker.slice(0, 4)}
    </div>
  );
}

function PoolCard({ pool }: { pool: TeamPool }) {
  return (
    <a
      href={`https://cexplorer.io/pool/${pool.poolId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-4 rounded-xl border border-border-subtle bg-surface-raised p-4 transition hover:bg-surface-overlay"
    >
      <PoolLogo logo={pool.logo} ticker={pool.ticker} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-medium text-white">
          {pool.ticker}
          <IconExternalLink
            size={12}
            stroke={1.6}
            className="opacity-0 transition group-hover:opacity-60"
          />
        </p>
        <p className="mt-0.5 truncate text-xs text-slate-400">{pool.name}</p>
      </div>
    </a>
  );
}

function PoolsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-xl border border-border-subtle bg-surface-raised p-4"
        >
          <div className="h-10 w-10 animate-pulse rounded-full bg-surface-inset" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-16 animate-pulse rounded bg-surface-inset" />
            <div className="h-2.5 w-28 animate-pulse rounded bg-surface-inset/60" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TeamPage() {
  const { data: pools, isLoading, error } = useWhitelistedPools();

  return (
    <div className="space-y-7">
      <header>
        <p className="label-eyebrow">About</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
          The team
        </h1>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          Who builds TosiDrop, and the stake pools that keep it running.
        </p>
      </header>

      <section className="card-premium px-6 py-5">
        <p className="label-eyebrow">Built by</p>
        <h2 className="mt-2 text-xl font-light tracking-tight text-white">
          Blink <span className="font-semibold">Labs</span>
        </h2>
        <p className="mt-2 max-w-xl text-sm text-slate-400">
          TosiDrop is developed by Blink Labs, building open-source tooling and
          infrastructure for the Cardano ecosystem.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="https://blinklabs.io"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-sm text-slate-300 transition hover:text-white"
          >
            blinklabs.io <IconExternalLink size={12} stroke={1.6} />
          </a>
          <a
            href="https://github.com/blinklabs-io"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-sm text-slate-300 transition hover:text-white"
          >
            GitHub <IconExternalLink size={12} stroke={1.6} />
          </a>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-light tracking-tight text-white">
            Whitelisted <span className="font-semibold">pools</span>
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Delegate to these Tosi pools to earn rewards on TosiDrop.
          </p>
        </div>

        {isLoading ? (
          <PoolsSkeleton />
        ) : error ? (
          <div className="card-premium flex items-start gap-3 px-5 py-4 text-sm text-rose-200">
            <IconAlertCircle size={18} stroke={1.6} className="mt-0.5 shrink-0 text-rose-400" />
            <div>
              <p className="font-medium text-white">Couldn't load pools</p>
              <p className="mt-0.5 text-xs text-slate-400">{error.message}</p>
            </div>
          </div>
        ) : !pools || pools.length === 0 ? (
          <div className="card-premium px-6 py-16 text-center">
            <p className="label-eyebrow">No pools listed</p>
            <p className="mx-auto mt-3 max-w-sm text-sm text-slate-400">
              The whitelist is empty right now — check back soon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {pools.map((pool) => (
              <PoolCard key={pool.poolId} pool={pool} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

import { useState } from 'react';
import { IconExternalLink } from '@tabler/icons-react';
import { useWhitelistedPools, type TeamPool } from '@/features/team/api/team.queries';
import { Card } from '@/components/common/Card';
import { FeedbackBanner } from '@/components/common/FeedbackBanner';
import { GradientButton } from '@/components/common/GradientButton';
import { buttonClassName } from '@/lib/button';

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
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-inset font-mono text-2xs font-medium uppercase tracking-tight text-text-secondary"
      aria-hidden
    >
      {ticker.slice(0, 4)}
    </div>
  );
}

function PoolCard({ pool }: { pool: TeamPool }) {
  return (
    <Card className="transition hover:border-border-strong">
      <a
        href={`https://cexplorer.io/pool/${pool.poolId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-4 rounded-2xl p-4"
      >
        <PoolLogo logo={pool.logo} ticker={pool.ticker} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
            {pool.ticker}
            <IconExternalLink size={12} stroke={1.6} className="text-text-muted" aria-hidden />
            <span className="sr-only">View on Cexplorer (opens in new tab)</span>
          </p>
          <p className="mt-0.5 truncate text-xs text-text-muted">{pool.name}</p>
        </div>
      </a>
    </Card>
  );
}

function PoolsSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
      role="status"
      aria-label="Loading whitelisted pools"
    >
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Card key={i} className="flex items-center gap-4 p-4">
          <div className="skeleton-shimmer h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton-shimmer h-3 w-16 rounded-md" />
            <div className="skeleton-shimmer h-2.5 w-28 rounded-md" />
          </div>
        </Card>
      ))}
    </div>
  );
}

const EXTERNAL_LINK_CLASS = buttonClassName('secondary', 'sm');

export default function TeamPage() {
  const { data: pools, isLoading, error, refetch } = useWhitelistedPools();

  return (
    <div className="space-y-7">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">The team</h1>
        <p className="mt-2 max-w-md text-sm text-text-muted">
          Who builds TosiDrop, and the stake pools that keep it running.
        </p>
      </header>

      <Card as="section" className="px-6 py-5">
        <h2 className="text-xl font-semibold tracking-tight text-text-primary">Built by Blink Labs</h2>
        <p className="mt-2 max-w-xl text-sm text-text-muted">
          TosiDrop is developed by Blink Labs, building open-source tooling and infrastructure
          for the Cardano ecosystem.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="https://blinklabs.io"
            target="_blank"
            rel="noopener noreferrer"
            className={EXTERNAL_LINK_CLASS}
          >
            blinklabs.io
            <IconExternalLink size={14} stroke={1.6} aria-hidden />
            <span className="sr-only">(opens in new tab)</span>
          </a>
          <a
            href="https://github.com/blinklabs-io"
            target="_blank"
            rel="noopener noreferrer"
            className={EXTERNAL_LINK_CLASS}
          >
            GitHub
            <IconExternalLink size={14} stroke={1.6} aria-hidden />
            <span className="sr-only">(opens in new tab)</span>
          </a>
        </div>
      </Card>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text-primary">Whitelisted pools</h2>
          <p className="mt-1 text-sm text-text-muted">
            Delegate to a whitelisted pool to earn rewards on TosiDrop.
          </p>
        </div>

        {isLoading ? (
          <PoolsSkeleton />
        ) : error ? (
          <div className="space-y-3">
            <FeedbackBanner tone="error" title="Couldn't load pools" message={error.message} />
            <GradientButton variant="secondary" size="sm" onClick={() => refetch()}>
              Try again
            </GradientButton>
          </div>
        ) : !pools || pools.length === 0 ? (
          <Card variant="inset" className="px-6 py-16 text-center">
            <p className="text-sm font-semibold text-text-primary">No pools listed</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-text-muted">
              The whitelist is empty right now — check back soon.
            </p>
          </Card>
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

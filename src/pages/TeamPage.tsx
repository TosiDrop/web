import { useState } from 'react';
import { IconExternalLink, IconShieldCheck } from '@tabler/icons-react';
import { poolExplorerUrl, usePartnerPools, type TeamPool } from '@/features/team/api/team.queries';
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
    <Card as="article" className="flex h-full flex-col transition hover:border-border-strong">
      <div className="flex items-start gap-4 p-5">
        <PoolLogo logo={pool.logo} ticker={pool.ticker || pool.name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-text-primary">
              {pool.ticker || 'Unnamed pool'}
            </p>
            <span className="inline-flex items-center gap-1 rounded-full border border-status-success/25 bg-status-success/10 px-2 py-0.5 text-2xs font-medium text-status-success-light">
              <IconShieldCheck size={11} stroke={1.8} aria-hidden />
              Partner
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-text-muted">{pool.name || 'Cardano stake pool'}</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col border-t border-border-subtle px-5 py-4">
        <p className="min-h-10 text-sm leading-5 text-text-secondary">
          {pool.description || 'A participating pool eligible for TosiDrop distribution programs.'}
        </p>
        <p className="mt-4 break-all font-mono text-2xs text-text-muted">{pool.poolId}</p>
      </div>
      <a
        href={poolExplorerUrl(pool.poolId)}
        target="_blank"
        rel="noopener noreferrer"
        className={`${buttonClassName('secondary', 'sm')} m-4 mt-0 justify-center`}
      >
        View pool details
        <IconExternalLink size={14} stroke={1.6} aria-hidden />
        <span className="sr-only">on Cexplorer (opens in new tab)</span>
      </a>
    </Card>
  );
}

function PoolsSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
      role="status"
      aria-label="Loading partner pools"
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
  const { data: pools, isLoading, error, refetch } = usePartnerPools();

  return (
    <div className="space-y-7">
      <header>
        <p className="label-eyebrow">Delegate with confidence</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-primary">Participating pools</h1>
        <p className="mt-2 max-w-md text-sm text-text-muted">
          Discover the Cardano stake pools participating in TosiDrop token distribution.
        </p>
      </header>

      <Card as="section" className="border-accent/20 bg-gradient-to-br from-accent/10 via-surface-raised to-surface-raised px-6 py-5" aria-labelledby="pool-benefit-heading">
        <div className="flex items-start gap-3">
          <IconShieldCheck size={21} stroke={1.7} className="mt-0.5 shrink-0 text-status-success-light" aria-hidden />
          <div>
            <h2 id="pool-benefit-heading" className="text-lg font-semibold text-text-primary">Why choose a partner pool?</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              Partner pools are configured to participate in TosiDrop distributions. Claims from a non-partner pool may include a 1 ADA pool fee; the final amount is always confirmed in the claim flow.
            </p>
          </div>
        </div>
      </Card>

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
          <h2 className="text-xl font-semibold tracking-tight text-text-primary">Partner pools</h2>
          <p className="mt-1 text-sm text-text-muted">
            These partner pools are eligible for TosiDrop distributions. Use the pool details link to review each operator before delegating in your wallet.
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
              No partner pools are listed right now — check back soon.
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

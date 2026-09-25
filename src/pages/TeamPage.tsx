import { lazy, Suspense, useMemo, useState } from 'react';
import { IconExternalLink, IconSearch, IconShieldCheck } from '@tabler/icons-react';
import { poolExplorerUrl, useParticipatingPools, type TeamPool } from '@/features/team/api/team.queries';
import { Card } from '@/components/common/Card';
import { DataUnavailable } from '@/components/common/DataUnavailable';
import { useWalletStore } from '@/store/wallet-state';
import { useDelegatedPool } from '@/features/rewards/hooks/useDelegatedPool';
import { DEPLOYMENT_NETWORK } from '@/config/network';
import { networkFromId } from '@/shared/network';

const DelegationCard = lazy(async () => {
  const module = await import('@/features/rewards/components/InlineDelegateAction');
  return { default: module.InlineDelegateAction };
});

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

function PoolCard({
  pool,
  currentPoolId,
  registered,
  connected,
  networkMatches,
  onDelegated,
}: {
  pool: TeamPool;
  currentPoolId: string | null;
  registered: boolean | null;
  connected: boolean;
  networkMatches: boolean;
  onDelegated: () => void;
}) {
  return (
    <Card as="article" className="flex min-w-0 h-full flex-col overflow-hidden transition hover:border-border-strong">
      <div className="flex min-w-0 items-start gap-4 p-5">
        <PoolLogo logo={pool.logo} ticker={pool.ticker || pool.name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-text-primary">
              {pool.ticker || 'Unnamed pool'}
            </p>
            {pool.partner && (
              <span className="inline-flex items-center gap-1 rounded-full border border-status-success/25 bg-status-success/10 px-2 py-0.5 text-2xs font-medium text-status-success-light">
                <IconShieldCheck size={11} stroke={1.8} aria-hidden />
                TosiDrop partner
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-xs text-text-muted">{pool.name || 'Cardano stake pool'}</p>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col border-t border-border-subtle px-5 py-4">
        <p className="min-h-10 break-words text-sm leading-5 text-text-secondary [overflow-wrap:anywhere]">
          {pool.description || 'A participating pool eligible for TosiDrop distribution programs.'}
        </p>
        <p className="mt-4 break-all font-mono text-2xs text-text-muted">{pool.poolId}</p>
      </div>
      {connected && (
        <div className="flex justify-end border-t border-border-subtle px-4 py-3">
          <Suspense fallback={<span role="status" aria-label="Loading delegation" className="text-2xs text-text-faint">Loading…</span>}>
            <DelegationCard
              poolId={pool.poolId}
              currentPoolId={currentPoolId}
              registered={registered}
              networkMatches={networkMatches}
              onDelegated={onDelegated}
            />
          </Suspense>
        </div>
      )}
      <a
        href={poolExplorerUrl(pool.poolId)}
        target="_blank"
        rel="noopener noreferrer"
        className="mx-4 mb-4 mt-0 inline-flex min-w-0 items-center justify-center gap-2 break-all rounded-lg border border-border-default px-3 py-2 text-center text-xs text-text-secondary transition hover:border-accent/50 hover:text-text-primary"
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

function PoolCards({
  pools,
  connected,
  networkMatches,
  currentPoolId = null,
  registered = null,
  onDelegated = () => undefined,
}: {
  pools: TeamPool[];
  connected: boolean;
  networkMatches: boolean;
  currentPoolId?: string | null;
  registered?: boolean | null;
  onDelegated?: () => void;
}) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {pools.map((pool) => (
        <PoolCard
          key={pool.poolId}
          pool={pool}
          currentPoolId={currentPoolId}
          registered={registered}
          connected={connected}
          networkMatches={networkMatches}
          onDelegated={onDelegated}
        />
      ))}
    </div>
  );
}

function ConnectedPoolCards({ pools, networkMatches }: { pools: TeamPool[]; networkMatches: boolean }) {
  const { stakeAddress } = useWalletStore();
  const { poolId, registered, refetch } = useDelegatedPool(stakeAddress);
  return (
    <PoolCards
      pools={pools}
      connected
      networkMatches={networkMatches}
      currentPoolId={poolId}
      registered={registered}
      onDelegated={() => { void refetch(); }}
    />
  );
}

export default function TeamPage() {
  const { data: pools, isLoading, error, refetch } = useParticipatingPools();
  const connected = useWalletStore((state) => state.connected);
  const networkId = useWalletStore((state) => state.networkId);
  const networkMatches = !connected || networkFromId(networkId) === DEPLOYMENT_NETWORK;
  const [query, setQuery] = useState('');
  const [partnerOnly, setPartnerOnly] = useState(false);
  const filteredPools = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (pools ?? []).filter((pool) => {
      if (partnerOnly && !pool.partner) return false;
      if (!normalizedQuery) return true;
      return [pool.ticker, pool.name, pool.poolId, pool.description ?? '']
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [partnerOnly, pools, query]);
  const partnerCount = pools?.filter((pool) => pool.partner).length ?? 0;

  return (
    <div className="space-y-7">
      <header>
        <p className="label-eyebrow">Participate in the network</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-primary">Participating pools</h1>
        <p className="mt-2 max-w-md text-sm text-text-muted">
          Discover the Cardano stake pools participating in TosiDrop token distribution.
        </p>
      </header>

      <section className="flex flex-wrap items-center justify-between gap-5 rounded-xl border border-border-subtle bg-surface-raised px-5 py-4" aria-label="Built by Blink Labs">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Built by Blink Labs</h2>
          <p className="mt-1 text-xs text-text-muted">The team behind TosiDrop.</p>
        </div>
        <a href="https://blinklabs.io" target="_blank" rel="noopener noreferrer" aria-label="Visit Blink Labs (opens in new tab)">
          <img src="/blink-labs-logo.png" alt="Blink Labs" className="h-auto w-40 sm:w-52" />
        </a>
      </section>

      <p className="flex items-start gap-2 text-xs leading-5 text-text-muted">
        <IconShieldCheck size={15} stroke={1.7} className="mt-0.5 shrink-0 text-status-success-light" aria-hidden />
        Partner pools are marked for distribution eligibility. Claims from other pools may include a 1 ADA pool fee; the final amount is confirmed during claiming.
      </p>

      <section className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight text-text-primary">Pool directory</h2>
            <p className="mt-1 text-sm text-text-muted">
              Explore the pools tracked by TosiDrop. Partner status marks pools
              eligible for TosiDrop distributions; every listed pool remains a
              valid delegation destination.
            </p>
          </div>
          {!isLoading && !error && pools && pools.length > 0 && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="relative block sm:w-56">
                <span className="sr-only">Search participating pools</span>
                <IconSearch size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" aria-hidden />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search pools"
                  className="h-9 w-full rounded-lg border border-border-default bg-surface-inset pl-9 pr-3 text-xs text-text-primary placeholder:text-text-faint focus:border-accent/60 focus:outline-none"
                />
              </label>
              <button
                type="button"
                aria-pressed={partnerOnly}
                onClick={() => setPartnerOnly((value) => !value)}
                className={`h-9 rounded-lg border px-3 text-xs font-medium transition ${partnerOnly
                  ? 'border-status-success/40 bg-status-success/10 text-status-success-light'
                  : 'border-border-default text-text-muted hover:border-accent/40 hover:text-text-primary'}`}
              >
                Partners only
              </button>
            </div>
          )}
        </div>

        {!isLoading && !error && pools && pools.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-text-faint">
            <span aria-label={`${filteredPools.length} of ${pools.length} pools shown`}>
              <strong className="font-medium text-text-secondary">{filteredPools.length}</strong> of {pools.length} pools shown
            </span>
            <span><strong className="font-medium text-status-success-light">{partnerCount}</strong> partner {partnerCount === 1 ? 'pool' : 'pools'}</span>
          </div>
        )}

        {isLoading ? (
          <PoolsSkeleton />
        ) : error ? (
          <DataUnavailable title="Pool index is catching up" message="The latest participating-pool snapshot is not available yet. We will keep retrying this view." onRetry={() => { void refetch(); }} />
        ) : !pools || pools.length === 0 ? (
          <Card variant="inset" className="px-6 py-16 text-center">
            <p className="text-sm font-semibold text-text-primary">No pools listed</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-text-muted">
              No partner pools are listed right now — check back soon.
            </p>
          </Card>
        ) : filteredPools.length === 0 ? (
          <Card variant="inset" className="px-6 py-16 text-center">
            <p className="text-sm font-semibold text-text-primary">No matching pools</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-text-muted">
              Try a different search or show all participating pools.
            </p>
          </Card>
        ) : (
          connected ? <ConnectedPoolCards pools={filteredPools} networkMatches={networkMatches} /> : <PoolCards pools={filteredPools} connected={false} networkMatches />
        )}
      </section>
    </div>
  );
}

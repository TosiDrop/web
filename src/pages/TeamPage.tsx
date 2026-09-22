import { lazy, Suspense, useState } from 'react';
import { IconExternalLink, IconShieldCheck } from '@tabler/icons-react';
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
    <Card as="article" className="flex h-full flex-col transition hover:border-border-strong">
      <div className="flex items-start gap-4 p-5">
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
      <div className="flex flex-1 flex-col border-t border-border-subtle px-5 py-4">
        <p className="min-h-10 text-sm leading-5 text-text-secondary">
          {pool.description || 'A participating pool eligible for TosiDrop distribution programs.'}
        </p>
        <p className="mt-4 break-all font-mono text-2xs text-text-muted">{pool.poolId}</p>
      </div>
      {connected && (
        <div className="flex justify-end border-t border-border-subtle px-4 py-3">
          <Suspense fallback={<span className="text-2xs text-text-faint">Loading…</span>}>
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
        className="mx-4 mb-4 mt-0 inline-flex items-center justify-center gap-2 rounded-lg border border-border-default px-3 py-2 text-xs text-text-secondary transition hover:border-accent/50 hover:text-text-primary"
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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
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

  return (
    <div className="space-y-7">
      <header>
        <p className="label-eyebrow">Delegate with confidence</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-primary">Cardano pools</h1>
        <p className="mt-2 max-w-md text-sm text-text-muted">
          Discover the Cardano stake pools participating in TosiDrop token distribution.
        </p>
      </header>

      <p className="flex items-start gap-2 text-xs leading-5 text-text-muted">
        <IconShieldCheck size={15} stroke={1.7} className="mt-0.5 shrink-0 text-status-success-light" aria-hidden />
        Partner pools are marked for distribution eligibility. Claims from other pools may include a 1 ADA pool fee; the final amount is confirmed during claiming.
      </p>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text-primary">Participating pools</h2>
          <p className="mt-1 text-sm text-text-muted">
            Explore the pools tracked by TosiDrop. Partner status marks pools
            eligible for TosiDrop distributions; every listed pool remains a
            valid delegation destination.
          </p>
        </div>

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
        ) : (
          connected ? <ConnectedPoolCards pools={pools} networkMatches={networkMatches} /> : <PoolCards pools={pools} connected={false} networkMatches />
        )}
      </section>
    </div>
  );
}

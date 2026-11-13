import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { IconExternalLink, IconSearch } from '@tabler/icons-react';
import { Card } from '@/components/common/Card';
import { DataUnavailable } from '@/components/common/DataUnavailable';
import { StateMessage } from '@/features/profile/components/StateMessage';
import { useTokenMap } from '@/features/projects/api/projects.queries';
import { tickerFor, type TokenInfo } from '@/features/history/api/history.queries';
import { usePublicTokens, type PublicMarketPrice } from '../api/tokens.queries';
import { describeDistribution } from '@/features/projects/utils/describeDistribution';
import { truncateHash } from '@/utils/format';
import { MarkdownContent } from '@/components/common/MarkdownContent';
import type { Project } from '@/shared/projects';
import { watchedAddressError } from '@/features/watchlist/validation';
import { useWalletStore } from '@/store/wallet-state';
import { useOnboardingStore } from '@/store/onboarding-state';
import { GradientButton } from '@/components/common/GradientButton';
import { useWatchedRewards } from '@/features/watchlist/api/watchedRewards.queries';
import { addedAt, discoverTokens, readDiscoveryFilters, writeDiscoveryFilters, type DiscoveryFilters } from '../utils/discovery';
import type { PublicTokensResponse } from '../api/tokens.queries';
import type { TokenMap } from '@/features/history/api/history.queries';

function TokenMark({ token }: { token: Project }) {
  const [failed, setFailed] = useState(false);
  if (token.logoUrl && !failed) {
    return <img src={token.logoUrl} alt="" onError={() => setFailed(true)} className="h-12 w-12 rounded-2xl border border-border-subtle bg-surface-inset object-cover" />;
  }
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border-subtle bg-surface-inset font-mono text-xs font-medium uppercase text-text-secondary">
      {token.name.slice(0, 3)}
    </span>
  );
}

function formatPrice(value: number | null | undefined, currency: 'USD' | 'ADA'): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  if (currency === 'ADA') return `₳ ${value < 0.0001 ? value.toPrecision(3) : value.toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
  return value < 0.01
    ? `$${value.toPrecision(3)}`
    : value.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 4 });
}

function TokenCard({ token, ticker, info, marketPrice }: { token: Project; ticker: string; info?: TokenInfo; marketPrice?: PublicMarketPrice }) {
  const hasDistribution = token.distribution.amountPerEpoch !== '';
  return (
    <Card as="article" className="flex h-full flex-col p-5 transition hover:border-border-strong">
      <div className="flex items-start gap-3">
        <TokenMark token={token} />
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-base font-semibold text-text-primary [overflow-wrap:anywhere]">
            <Link to={`/tokens/${encodeURIComponent(token.tokenId)}`} className="hover:text-accent-light">{token.name}</Link>
          </h2>
          <p className="mt-1 break-all font-mono text-[11px] text-text-muted">
            {ticker} · {truncateHash(token.tokenId, 10, 6)}
          </p>
        </div>
      </div>
      <MarkdownContent content={token.description || 'A TosiDrop token distribution program.'} className="mt-4 h-[4.5rem] overflow-hidden text-text-muted" />
      <div className="mt-4 grid grid-cols-2 gap-3 border-y border-border-subtle py-3">
        <div>
          <p className="label-eyebrow">Market price</p>
          <p className="mt-1 break-all font-mono text-sm tabular-nums text-text-primary">{formatPrice(marketPrice?.priceUsd, 'USD')}</p>
          <p className="mt-0.5 break-all font-mono text-2xs text-text-faint">{formatPrice(marketPrice?.priceAda, 'ADA')}</p>
        </div>
        <div className="text-right">
          <p className="label-eyebrow">24h</p>
          <p className={`mt-1 font-mono text-sm tabular-nums ${marketPrice?.priceChange24h === null || marketPrice?.priceChange24h === undefined ? 'text-text-faint' : marketPrice.priceChange24h >= 0 ? 'text-status-success-light' : 'text-status-error-light'}`}>
            {marketPrice?.priceChange24h === null || marketPrice?.priceChange24h === undefined ? '—' : `${marketPrice.priceChange24h >= 0 ? '+' : ''}${marketPrice.priceChange24h.toFixed(2)}%`}
          </p>
          <p className="mt-0.5 text-2xs text-text-faint">multi-source index</p>
        </div>
      </div>
      <div className="mt-4 border-t border-border-subtle pt-3 text-xs text-text-muted">
        <p>{hasDistribution ? describeDistribution(token, ticker) : 'Platform token · no active distribution'}</p>
        <p className="mt-2 font-mono text-2xs text-text-faint">
          {info?.decimals !== undefined ? `${info.decimals} decimal places` : 'Token metadata'}
        </p>
      </div>
      <Link to={`/tokens/${encodeURIComponent(token.tokenId)}`} className="mt-4 inline-flex min-h-11 items-center text-xs font-medium text-accent-light hover:underline">View token details</Link>
      {token.website && (
        <a
          href={token.website}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-xs font-medium text-accent-light hover:text-white"
        >
          Visit token website <IconExternalLink size={13} stroke={1.7} aria-hidden />
          <span className="sr-only">(opens in new tab)</span>
        </a>
      )}
    </Card>
  );
}

export function TokenCatalog() {
  const { data, isLoading, error, refetch } = usePublicTokens();
  const { data: fallbackTokens } = useTokenMap();
  if (isLoading) {
    return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading tokens">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton-shimmer h-56 rounded-2xl" />)}</div>;
  }
  if (error) {
    return <DataUnavailable title="Token catalog is catching up" message="The latest approved token programs are not available yet." onRetry={() => { void refetch(); }} />;
  }
  if (data?.degraded) {
    return <DataUnavailable title="Token catalog unavailable" message="Token distribution programs could not be loaded right now. Try again shortly." onRetry={() => { void refetch(); }} />;
  }
  if (!data?.projects.length) {
    return <StateMessage title="No tokens listed yet" message="Token metadata and approved distribution programs will appear here." />;
  }

  return <DiscoveryResults data={data} tokens={data.tokens ?? fallbackTokens} />;
}

const filterControl = 'h-11 w-full min-w-0 rounded-xl border border-border-subtle bg-surface-inset px-3 text-sm text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent';

function DiscoveryResults({ data, tokens }: { data: PublicTokensResponse; tokens?: TokenMap }) {
  const [params, setParams] = useSearchParams();
  const filters = readDiscoveryFilters(params);
  const stakeAddress = useWalletStore((state) => state.stakeAddress);
  const connected = useWalletStore((state) => state.connected);
  const openModal = useOnboardingStore((state) => state.openModal);
  const rewards = useWatchedRewards(connected ? stakeAddress : null, filters.claimable);
  const update = (patch: Partial<DiscoveryFilters>) => setParams(writeDiscoveryFilters(params, { ...filters, ...patch }), { replace: true });
  const reset = () => setParams(writeDiscoveryFilters(params, readDiscoveryFilters(new URLSearchParams())), { replace: true });
  const visibleTokens = useMemo(() => discoverTokens(data.projects, readDiscoveryFilters(params), tokens, rewards.data), [data.projects, params, tokens, rewards.data]);
  const pools = [...new Set(data.projects.map((token) => token.poolId).filter(Boolean))].sort();
  const hasFilters = Boolean(filters.search || filters.pool || filters.project || filters.claimable || filters.sort !== 'name');
  const awaitingWallet = filters.claimable && (!connected || !stakeAddress || !!watchedAddressError(stakeAddress));
  const checkingRewards = filters.claimable && !awaitingWallet && rewards.isPending;
  const rewardsFailed = filters.claimable && !awaitingWallet && !!rewards.error;

  return (
    <div className="space-y-5">
      <div className="space-y-4 rounded-2xl border border-border-subtle bg-surface-inset/40 p-4 sm:p-5">
        <label className="relative block">
          <span className="sr-only">Search tokens</span>
          <IconSearch size={18} stroke={1.7} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden />
          <input value={filters.search} onChange={(event) => update({ search: event.target.value })} placeholder="Search name, ticker, pool or token ID" className={`${filterControl} pl-10 placeholder:text-text-muted`} />
        </label>
        <div className="grid min-w-0 gap-3 sm:grid-cols-3">
          <label className="min-w-0 space-y-1.5 text-xs text-text-secondary">Pool
            <select value={filters.pool} onChange={(event) => update({ pool: event.target.value })} className={filterControl}>
              <option value="">All pools</option>
              {filters.pool && !pools.includes(filters.pool) && <option value={filters.pool}>Pool unavailable</option>}
              {pools.map((pool) => <option key={pool} value={pool}>{truncateHash(pool, 14, 8)}</option>)}
            </select>
          </label>
          <label className="min-w-0 space-y-1.5 text-xs text-text-secondary">Project
            <select value={filters.project} onChange={(event) => update({ project: event.target.value })} className={filterControl}>
              <option value="">All projects</option>
              {filters.project && !data.projects.some((project) => project.id === filters.project) && <option value={filters.project}>Project unavailable</option>}
              {[...data.projects].sort((a, b) => a.name.localeCompare(b.name)).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>
          <label className="min-w-0 space-y-1.5 text-xs text-text-secondary">Sort by
            <select value={filters.sort} onChange={(event) => update({ sort: event.target.value === 'newest' ? 'newest' : 'name' })} className={filterControl}>
              <option value="name">Name A–Z</option><option value="newest">Recently added</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" checked={filters.claimable} onChange={(event) => update({ claimable: event.target.checked })} className="h-4 w-4 accent-accent focus-visible:outline-2 focus-visible:outline-accent" />
            Currently claimable by my wallet
          </label>
          {hasFilters && <GradientButton variant="ghost" onClick={reset}>Reset filters</GradientButton>}
        </div>
        {filters.sort === 'newest' && <p className="text-xs leading-5 text-text-muted">Uses approval or creation dates. Programs with unknown dates appear last.</p>}
      </div>
      {data.metadataDegraded && <p role="status" className="text-xs text-text-muted">Some token details are temporarily unavailable; the catalog is showing the data it could retrieve.</p>}
      {awaitingWallet ? (
        <div className="rounded-xl border border-border-subtle p-5">
          <h2 className="text-base font-medium text-text-primary">Connect your wallet to find available rewards</h2>
          <p className="mt-2 text-sm leading-6 text-text-muted">This filter checks current rewards for your connected wallet. You can also explore read-only wallets in your <Link to="/watchlist" className="text-accent-light underline underline-offset-4">watchlist</Link>.</p>
          <GradientButton className="mt-4" onClick={openModal}>Connect wallet</GradientButton>
        </div>
      ) : checkingRewards ? <p role="status" className="py-8 text-sm text-text-muted">Checking your currently claimable rewards…</p>
        : rewardsFailed ? <DataUnavailable title="Available rewards could not be checked" message="Retry the wallet check or reset filters to browse all programs." onRetry={() => { void rewards.refetch(); }} />
        : <>
          <p role="status" className="text-sm text-text-muted">{visibleTokens.length} {visibleTokens.length === 1 ? 'program' : 'programs'} found{filters.claimable ? ' with rewards available now' : ''}</p>
          {visibleTokens.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleTokens.map((token) => <div key={token.id} className="min-w-0">
                {filters.sort === 'newest' && <p className="mb-2 text-xs text-text-muted">{addedAt(token) === null ? 'Added date unknown' : `Added ${new Date(addedAt(token)!).toLocaleDateString()}`}</p>}
                <TokenCard token={token} ticker={tickerFor(token.tokenId, tokens?.[token.tokenId])} info={tokens?.[token.tokenId]} marketPrice={data.marketPrices?.[token.tokenId]} />
              </div>)}
            </div>
          ) : <div className="py-4"><StateMessage title="No matching tokens" message={filters.claimable ? 'Your wallet has no current rewards matching these filters. Reset filters to explore other programs.' : 'Try another name, ticker or pool, or reset your filters to explore all programs.'} /></div>}
        </>}
    </div>
  );
}

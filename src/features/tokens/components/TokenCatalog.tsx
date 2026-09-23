import { useMemo, useState } from 'react';
import { IconExternalLink, IconSearch } from '@tabler/icons-react';
import { Card } from '@/components/common/Card';
import { DataUnavailable } from '@/components/common/DataUnavailable';
import { StateMessage } from '@/features/profile/components/StateMessage';
import { useTokenMap } from '@/features/projects/api/projects.queries';
import { tickerFor, type TokenInfo } from '@/features/history/api/history.queries';
import { usePublicTokens, type PublicMarketPrice } from '../api/tokens.queries';
import { describeDistribution } from '@/features/projects/utils/describeDistribution';
import { truncateHash } from '@/utils/format';
import type { Project } from '@/shared/projects';

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
          <h2 className="truncate text-base font-semibold text-text-primary">{token.name}</h2>
          <p className="mt-1 font-mono text-[11px] text-text-muted">
            {ticker} · {truncateHash(token.tokenId, 10, 6)}
          </p>
        </div>
      </div>
      <p className="mt-4 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-text-muted">
        {token.description || 'A TosiDrop token distribution program.'}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 border-y border-border-subtle py-3">
        <div>
          <p className="label-eyebrow">Market price</p>
          <p className="mt-1 font-mono text-sm tabular-nums text-text-primary">{formatPrice(marketPrice?.priceUsd, 'USD')}</p>
          <p className="mt-0.5 font-mono text-2xs text-text-faint">{formatPrice(marketPrice?.priceAda, 'ADA')}</p>
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
      {token.website && (
        <a
          href={token.website}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-accent-light hover:text-white"
        >
          Visit token website <IconExternalLink size={13} stroke={1.7} aria-hidden />
          <span className="sr-only">(opens in new tab)</span>
        </a>
      )}
    </Card>
  );
}

export function TokenCatalog() {
  const [search, setSearch] = useState('');
  const { data, isLoading, error, refetch } = usePublicTokens();
  const { data: fallbackTokens } = useTokenMap();
  const tokens = data?.tokens ?? fallbackTokens;
  const visibleTokens = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data?.projects ?? []).filter((token) => {
      if (!query) return true;
      const ticker = tickerFor(token.tokenId, tokens?.[token.tokenId]);
      return [token.name, token.description, ticker, token.tokenId].some((value) => value.toLowerCase().includes(query));
    });
  }, [data?.projects, search, tokens]);

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

  return (
    <div className="space-y-5">
      <label className="relative block max-w-md">
        <span className="sr-only">Search tokens</span>
        <IconSearch size={16} stroke={1.7} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tokens" className="h-11 w-full rounded-xl border border-border-subtle bg-surface-inset pl-10 pr-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent/50" />
      </label>
      {data.metadataDegraded && (
        <p role="status" className="text-xs text-text-muted">
          Some token details are temporarily unavailable; the catalog is showing the data it could retrieve.
        </p>
      )}
      {visibleTokens.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleTokens.map((token) => <TokenCard key={token.id} token={token} ticker={tickerFor(token.tokenId, tokens?.[token.tokenId])} info={tokens?.[token.tokenId]} marketPrice={data.marketPrices?.[token.tokenId]} />)}
        </div>
      ) : (
        <StateMessage title="No matching tokens" message="Try a different name, ticker, or token ID." />
      )}
    </div>
  );
}

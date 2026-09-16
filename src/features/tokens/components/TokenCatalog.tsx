import { useMemo, useState } from 'react';
import { IconExternalLink, IconSearch } from '@tabler/icons-react';
import { Card } from '@/components/common/Card';
import { FeedbackBanner } from '@/components/common/FeedbackBanner';
import { GradientButton } from '@/components/common/GradientButton';
import { StateMessage } from '@/features/profile/components/StateMessage';
import { useTokenMap } from '@/features/projects/api/projects.queries';
import { tickerFor } from '@/features/history/api/history.queries';
import { usePublicTokens } from '../api/tokens.queries';
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

function TokenCard({ token, ticker }: { token: Project; ticker: string }) {
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
      <p className="mt-4 border-t border-border-subtle pt-3 text-xs text-text-muted">
        {describeDistribution(token, ticker)}
      </p>
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
  const { data: tokens } = useTokenMap();
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
    return <div className="space-y-3"><FeedbackBanner tone="error" title="Couldn't load tokens" message={error.message} /><GradientButton variant="secondary" size="sm" onClick={() => refetch()}>Try again</GradientButton></div>;
  }
  if (data?.degraded) {
    return <StateMessage title="Token catalog unavailable" message="Token distribution programs could not be loaded right now. Try again shortly." />;
  }
  if (!data?.projects.length) {
    return <StateMessage title="No tokens listed yet" message="Approved token distribution programs will appear here." />;
  }

  return (
    <div className="space-y-5">
      <label className="relative block max-w-md">
        <span className="sr-only">Search tokens</span>
        <IconSearch size={16} stroke={1.7} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tokens" className="h-11 w-full rounded-xl border border-border-subtle bg-surface-inset pl-10 pr-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent/50" />
      </label>
      {visibleTokens.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleTokens.map((token) => <TokenCard key={token.id} token={token} ticker={tickerFor(token.tokenId, tokens?.[token.tokenId])} />)}
        </div>
      ) : (
        <StateMessage title="No matching tokens" message="Try a different name, ticker, or token ID." />
      )}
    </div>
  );
}

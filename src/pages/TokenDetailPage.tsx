import { Link, useParams } from 'react-router-dom';
import { IconArrowLeft, IconExternalLink } from '@tabler/icons-react';
import { Card } from '@/components/common/Card';
import { CopyButton } from '@/components/common/CopyButton';
import { MarkdownContent } from '@/components/common/MarkdownContent';
import { usePublicTokens } from '@/features/tokens/api/tokens.queries';
import { useTokenMap } from '@/features/projects/api/projects.queries';
import { useMarketPrices } from '@/features/market/api/market.queries';
import { formatMarketPrice } from '@/features/market/format';
import { tickerFor } from '@/features/history/api/history.queries';
import { usePreferences } from '@/features/favorites/hooks/usePreferences';
import { FavoriteStarButton } from '@/features/favorites/components/FavoriteStarButton';
import { FavoritesSaveBar } from '@/features/favorites/components/FavoritesSaveBar';

export default function TokenDetailPage() {
  const { assetId = '' } = useParams();
  const { data: catalog, isLoading } = usePublicTokens();
  const { data: tokenMap } = useTokenMap();
  const { data: prices } = useMarketPrices(assetId ? [assetId] : []);
  const preferences = usePreferences();
  const project = catalog?.projects.find((item) => item.tokenId === assetId);
  const metadata = tokenMap?.[assetId] ?? catalog?.tokens?.[assetId];
  const ticker = tickerFor(assetId, metadata);
  const name = project?.name || metadata?.name || ticker;
  const price = prices?.[assetId] ?? catalog?.marketPrices?.[assetId];
  const logo = project?.logoUrl || metadata?.logo || '';

  if (!assetId) return <p className="text-sm text-text-muted">Token ID is missing.</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/tokens" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary">
        <IconArrowLeft size={16} aria-hidden /> Discover tokens
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-words text-3xl font-semibold tracking-tight text-text-primary [overflow-wrap:anywhere]">{name}</h1>
          {name !== ticker && <p className="mt-1 text-sm text-text-muted">{ticker}</p>}
        </div>
        {preferences.connected && preferences.preferencesReady && (
          <FavoriteStarButton
            active={preferences.isFavorite(assetId)}
            ticker={ticker}
            onToggle={() => preferences.toggleFavorite({ assetId, ticker, logo })}
          />
        )}
      </header>

      <FavoritesSaveBar />

      <Card className="space-y-4 p-5">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Asset ID</h2>
          <div className="mt-2 flex items-start gap-2">
            <p className="min-w-0 break-all font-mono text-xs leading-5 text-text-secondary">{assetId}</p>
            <CopyButton value={assetId} ariaLabel="Copy asset ID" />
          </div>
        </div>
        <div className="grid gap-4 border-t border-border-subtle pt-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-text-muted">Indexed USD price</p>
            <p className="mt-1 font-mono text-lg tabular-nums text-text-primary">{formatMarketPrice(price?.priceUsd, 'USD')}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Indexed ADA price</p>
            <p className="mt-1 font-mono text-lg tabular-nums text-text-primary">{formatMarketPrice(price?.priceAda, 'ADA')}</p>
          </div>
        </div>
        <p className="text-xs leading-5 text-text-muted">
          {price
            ? `Price observed ${new Date(price.observedAt * 1000).toLocaleString()} from ${price.sourceCount} indexed source${price.sourceCount === 1 ? '' : 's'}. Display only; market prices can be incomplete or stale.`
            : 'No indexed price is available for this asset. Wallet quantities and market values may differ from other sources.'}
        </p>
      </Card>

      {project ? (
        <Card className="space-y-4 p-5">
          <h2 className="text-lg font-semibold text-text-primary">About this token</h2>
          <MarkdownContent content={project.description} />
          {project.website && (
            <a href={project.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-accent-light hover:underline">
              Project website <IconExternalLink size={14} aria-hidden />
              <span className="sr-only">(opens in new tab)</span>
            </a>
          )}
        </Card>
      ) : (
        <Card className="p-5 text-sm text-text-muted">
          {isLoading ? 'Loading token program details…' : 'No TosiDrop distribution program details are listed for this asset.'}
        </Card>
      )}
    </div>
  );
}

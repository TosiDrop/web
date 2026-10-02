import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconDownload, IconSearch } from '@tabler/icons-react';
import { DEPLOYMENT_NETWORK } from '@/config/network';
import { catalogAssetId } from '@/shared/assets';
import { downloadCsv } from '@/utils/csv';
import type { WalletHolding, WalletSummary } from '../types/walletSummary';
import {
  formatWalletUnits, holdingName, visibleHoldings,
  walletPercent, walletUsd, walletPrice, type HoldingsSort,
} from '../utils/walletPortfolio';
import { walletHoldingsCsvRows } from '../utils/exportWalletHoldings';

function AssetName({ holding, detailed }: { holding: WalletHolding; detailed: boolean }) {
  return (
    <div className="min-w-0">
      <Link to={`/tokens/${encodeURIComponent(catalogAssetId(holding.unit))}`}
        className="break-words font-medium text-text-primary hover:text-accent-light hover:underline [overflow-wrap:anywhere]">
        {holdingName(holding)}
      </Link>
      {detailed && holding.name && holding.name !== holdingName(holding) && (
        <p className="mt-1 break-words text-xs text-text-muted [overflow-wrap:anywhere]">{holding.name}</p>
      )}
      {detailed && <details className="mt-1 text-xs font-normal text-text-muted">
        <summary className="cursor-pointer hover:text-text-secondary">Source &amp; asset ID</summary>
        <p className="mt-2 leading-5">
          {holding.priceObservedAt
            ? `${holding.priceSource || 'Indexed market'} · ${new Date(holding.priceObservedAt * 1000).toLocaleString()}`
            : 'USD price unavailable'}
          {holding.decimals === null && ' · Token decimals unavailable'}
        </p>
        <p className="mt-1 break-all font-mono leading-5">{holding.unit}</p>
      </details>}
    </div>
  );
}

function Quantity({ holding }: { holding: WalletHolding }) {
  return (
    <span className="break-words font-mono tabular-nums [overflow-wrap:anywhere]">
      {holding.decimals === null ? holding.quantity : formatWalletUnits(holding.quantity, holding.decimals)}
      {holding.decimals === null && <span className="block font-sans text-xs text-text-muted">raw units</span>}
    </span>
  );
}

function Change({ value }: { value: number | null }) {
  return <span className={`font-mono tabular-nums ${value === null ? 'text-text-muted' : value >= 0 ? 'text-status-success-light' : 'text-status-error-light'}`}>{walletPercent(value)}</span>;
}

function share(value: number | null, total: number | null) {
  if (value === null || total === null || total <= 0) return '—';
  const percent = (value / total) * 100;
  return percent > 0 && percent < 0.1 ? '<0.1%' : `${percent.toFixed(1)}%`;
}

export function WalletHoldings({ summary, walletLovelace, stakeAddress, totalUsd, averageTokenUsd }: {
  summary: WalletSummary;
  walletLovelace: string | null;
  stakeAddress: string;
  totalUsd: number | null;
  averageTokenUsd: number | null;
}) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<HoldingsSort>('value');
  const [showAll, setShowAll] = useState(false);
  const [detailed, setDetailed] = useState(false);
  const filtered = visibleHoldings(summary.holdings, search, sort);
  const visible = showAll ? filtered : filtered.slice(0, 5);
  return (
    <section id="holdings" aria-labelledby="wallet-holdings-title" className="@container mt-6 border-t border-border-subtle pt-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="wallet-holdings-title" className="text-base font-medium text-text-primary">
          Your tokens <span className="ml-1 font-mono text-sm text-text-muted">{summary.sources?.assets === false ? '—' : summary.holdings.length}</span>
        </h3>
        <button type="button" disabled={summary.sources?.assets === false && walletLovelace === null}
          onClick={() => downloadCsv(`tosidrop-wallet-holdings-${new Date().toISOString().slice(0, 10)}.csv`, walletHoldingsCsvRows({
            network: DEPLOYMENT_NETWORK, stakeAddress, exportedAt: new Date().toISOString(), walletLovelace,
            adaPriceUsd: summary.balance.adaPriceUsd, adaPriceObservedAt: summary.balance.adaPriceObservedAt,
            adaPriceSource: summary.balance.adaPriceSource, holdings: summary.holdings,
          }))}
          className="inline-flex min-h-9 items-center gap-2 text-xs text-text-muted hover:text-text-primary disabled:opacity-60">
          <IconDownload size={14} aria-hidden /> Export CSV
        </button>
      </header>
      {summary.sources?.assets === false ? (
        <p className="mt-4 text-sm text-text-muted">Token holdings are temporarily unavailable.</p>
      ) : summary.holdings.length === 0 ? (
        <p className="mt-4 text-sm text-text-muted">No native tokens found for this stake address.</p>
      ) : <>
        <div className="my-4 flex flex-wrap items-center gap-3">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search holdings</span>
            <IconSearch size={16} className="pointer-events-none absolute left-3 top-3 text-text-muted" aria-hidden />
            <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setShowAll(false); }}
              placeholder="Find a token" className="h-10 w-full rounded-lg border border-border-default bg-surface-inset pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted" />
          </label>
          <button type="button" aria-expanded={detailed} onClick={() => setDetailed((value) => !value)}
            className="min-h-10 text-xs text-text-secondary hover:text-accent-light">{detailed ? 'Less detail' : 'More detail'}</button>
          {detailed && <label className="flex items-center gap-2 text-xs text-text-muted">
            Sort by
            <select value={sort} onChange={(event) => setSort(event.target.value as HoldingsSort)}
              className="h-10 rounded-lg border border-border-default bg-surface-inset px-3 text-sm text-text-secondary">
              <option value="value">Holdings value</option><option value="name">Token name</option><option value="change">24h change</option>
            </select>
          </label>}
        </div>
        {detailed && <p className="mb-4 text-xs text-text-muted">Average valued token holding: <span className="font-mono text-text-secondary">{walletUsd(averageTokenUsd)}</span> · ADA excluded</p>}
        {filtered.length === 0 ? <div className="py-6 text-center">
          <p role="status" className="text-sm text-text-muted">No holdings match your search.</p>
          <button type="button" onClick={() => setSearch('')} className="mt-3 text-sm text-accent-light hover:underline">Clear search</button>
        </div> : <>
          <div className="hidden @3xl:block">
            <table className="w-full table-fixed text-sm">
              <caption className="sr-only">Token quantities and estimated USD values{detailed && ', unit prices, daily movement and allocation'}</caption>
              <colgroup>
                <col className={detailed ? 'w-[28%]' : 'w-[40%]'} /><col className={detailed ? 'w-[16%]' : 'w-[30%]'} />
                {detailed && <><col className="w-[16%]" /><col className="w-[12%]" /></>}
                <col className={detailed ? 'w-[18%]' : 'w-[30%]'} />{detailed && <col className="w-[10%]" />}
              </colgroup>
              <thead className="border-b border-border-subtle text-xs text-text-muted">
                <tr>
                  <th scope="col" className="pb-3 pr-3 text-left font-normal">Token</th>
                  <th scope="col" className="pb-3 pr-3 text-right font-normal">Quantity</th>
                  {detailed && <><th scope="col" className="pb-3 pr-3 text-right font-normal">Price (USD)</th><th scope="col" className="pb-3 pr-3 text-right font-normal">24h</th></>}
                  <th scope="col" className="pb-3 text-right font-normal">Value (USD)</th>
                  {detailed && <th scope="col" className="pb-3 text-right font-normal">Share</th>}
                </tr>
              </thead>
              <tbody>{visible.map((holding) => <tr key={holding.unit} className="border-b border-border-subtle/50 align-top">
                <th scope="row" className="py-3 pr-3 text-left font-normal"><AssetName holding={holding} detailed={detailed} /></th>
                <td className="py-3 pr-3 text-right text-text-secondary"><Quantity holding={holding} /></td>
                {detailed && <><td className="break-words py-3 pr-3 text-right font-mono text-text-secondary [overflow-wrap:anywhere]">{walletPrice(holding.priceUsd)}</td><td className="py-3 pr-3 text-right"><Change value={holding.priceChange24h} /></td></>}
                <td className="break-words py-3 text-right font-mono text-text-primary [overflow-wrap:anywhere]">{walletUsd(holding.valueUsd)}</td>
                {detailed && <td className="py-3 pl-3 text-right font-mono text-text-muted">{share(holding.valueUsd, totalUsd)}</td>}
              </tr>)}</tbody>
            </table>
          </div>
          <ul className="divide-y divide-border-subtle @3xl:hidden">{visible.map((holding) => <li key={holding.unit} className="py-3">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)] items-start gap-3 text-sm">
              <div className="min-w-0"><AssetName holding={holding} detailed={detailed} />{!detailed && <p className="mt-1 text-xs text-text-muted"><Quantity holding={holding} /></p>}</div>
              <div className="min-w-0 text-right"><p className="break-words font-mono text-text-primary [overflow-wrap:anywhere]">{walletUsd(holding.valueUsd)}</p>{detailed && <p className="mt-1 text-xs text-text-muted">{share(holding.valueUsd, totalUsd)} of valued holdings</p>}</div>
            </div>
            {detailed && <dl className="mt-3 grid grid-cols-2 gap-3 text-xs @md:grid-cols-3">
              <div className="min-w-0"><dt className="text-text-muted">Quantity</dt><dd className="mt-1 text-text-secondary"><Quantity holding={holding} /></dd></div>
              <div className="min-w-0"><dt className="text-text-muted">Price (USD)</dt><dd className="mt-1 break-words font-mono text-text-secondary [overflow-wrap:anywhere]">{walletPrice(holding.priceUsd)}</dd></div>
              <div><dt className="text-text-muted">24h change</dt><dd className="mt-1"><Change value={holding.priceChange24h} /></dd></div>
            </dl>}
          </li>)}</ul>
        </>}
        {filtered.length > 5 && <button type="button" onClick={() => setShowAll((value) => !value)}
          className="mt-4 min-h-9 text-sm font-medium text-accent-light hover:underline">{showAll ? 'Show fewer tokens' : `View all ${filtered.length} tokens`}</button>}
      </>}
      {detailed && !summary.metadata.complete && summary.sources?.assets !== false && <p className="mt-3 text-xs leading-5 text-text-muted">Some metadata is unavailable. Metadata and prices cover up to 100 token types; all indexed quantities remain visible.</p>}
    </section>
  );
}

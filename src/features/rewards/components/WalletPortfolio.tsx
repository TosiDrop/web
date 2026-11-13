import { useId, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { IconRefresh } from '@tabler/icons-react';
import { Card } from '@/components/common/Card';
import type { WalletSummary } from '../types/walletSummary';
import {
  formatWalletUnits,
  portfolioMetrics,
  walletPercent,
  walletUsd,
  walletPrice,
} from '../utils/walletPortfolio';
import { WalletHoldings } from './WalletHoldings';
import {
  WALLET_TOOLTIP_STYLE,
  WALLET_CHART_TICK,
} from '../utils/walletChartTheme';
import { WalletStaking } from './WalletStaking';

const COLORS = [
  '#67E8F9',
  '#DCCFA8',
  '#A78BFA',
  '#34D399',
  '#F472B6',
  '#FBBF24',
];

export function WalletMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="min-w-0 py-3 sm:px-4">
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd
        className="mt-2 break-words font-mono text-xl font-medium tabular-nums text-text-primary [overflow-wrap:anywhere]"
      >
        {value}
      </dd>
      <p className="mt-1.5 text-xs leading-5 text-text-muted">{detail}</p>
    </div>
  );
}

export function WalletPortfolio({
  summary,
  walletLovelace,
  liveBalance,
  stakeAddress,
  refreshing,
  onRefresh,
}: {
  summary: WalletSummary;
  walletLovelace: string | null;
  liveBalance: boolean;
  stakeAddress: string;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const [range, setRange] = useState<7 | 30>(30);
  const [chart, setChart] = useState<'history' | 'allocation'>('history');
  const [stakingOpen, setStakingOpen] = useState(false);
  const gradientId = useId();
  const metrics = portfolioMetrics(summary, walletLovelace);
  const [openedAt] = useState(() => Math.floor(Date.now() / 1000));
  const start = Math.max(openedAt, summary.observedAt ?? 0) - range * 86_400;
  const history = summary.valueHistory.points.filter(
    (point) => point.observedAt >= start,
  );
  const change =
    history.length > 1 && history[0].valueAda > 0
      ? (history[history.length - 1].valueAda / history[0].valueAda - 1) * 100
      : null;
  const allocation =
    metrics.allocation.length > 6
      ? [
          ...metrics.allocation.slice(0, 5),
          {
            id: 'other',
            name: `Other ${metrics.allocation.length - 5} assets`,
            value: metrics.allocation
              .slice(5)
              .reduce((sum, item) => sum + item.value, 0),
          },
        ]
      : metrics.allocation;
  const allocationTotal = allocation.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="min-w-0 overflow-hidden p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text-primary">
            Wallet at a glance
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            {summary.observedAt
              ? `Updated ${new Date(summary.observedAt * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
              : 'Wallet index is catching up'}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border-default px-3 py-2 text-xs text-text-secondary transition hover:bg-surface-inset disabled:opacity-60"
        >
          <IconRefresh
            size={14}
            className={refreshing ? 'animate-spin' : ''}
            aria-hidden
          />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>
      <dl className="mt-4 grid grid-cols-2 divide-y divide-border-subtle border-y border-border-subtle [&>div:first-child]:col-span-2 sm:grid-cols-3 sm:divide-y-0 sm:[&>div:first-child]:col-span-1">
        <WalletMetric
          label="Estimated value"
          value={walletUsd(metrics.totalUsd)}
          detail={
            summary.sources?.assets === false
              ? 'Holdings index unavailable'
              : metrics.partial ? `${metrics.priced.length} of ${summary.holdings.length} tokens priced · partial` : 'ADA and priced tokens'
          }
        />
        <WalletMetric
          label="Wallet ADA"
          value={
            walletLovelace === null
              ? '—'
              : `₳ ${formatWalletUnits(walletLovelace, 6)}`
          }
          detail={
            liveBalance
              ? 'Connected wallet'
              : walletLovelace === null
                ? 'Balance source unavailable'
                : 'Indexed balance'
          }
        />
        <WalletMetric
          label="Staking rewards"
          value={
            summary.balance.rewardsAvailableLovelace === null
              ? '—'
              : `₳ ${formatWalletUnits(summary.balance.rewardsAvailableLovelace, 6)}`
          }
          detail="Available in your stake account"
        />
      </dl>
      <details className="mt-3 text-xs text-text-muted">
        <summary className="w-fit cursor-pointer hover:text-text-secondary">About these estimates</summary>
        <div className="mt-2 max-w-2xl space-y-2 leading-5">
          <p>Values include ADA and priced tokens. Unpriced assets and staking rewards are excluded. Indexed holdings can lag your wallet; quotes may be up to 24 hours old.</p>
          <p>ADA/USD <span className="font-mono text-text-secondary">{walletPrice(summary.balance.adaPriceUsd)}</span> · 24h {walletPercent(summary.balance.adaPriceChange24h)}</p>
          <p>Holdings price move: {walletPercent(metrics.marketChangePct)}{!metrics.marketChangeComplete && ' · partial coverage'}. Current quantities only.</p>
          {summary.balance.adaPriceObservedAt && <p>Quote: {new Date(summary.balance.adaPriceObservedAt * 1000).toLocaleString()} · {summary.balance.adaPriceSource || 'Indexed market'}</p>}
        </div>
      </details>
      {summary.degraded && (
        <p role="status" className="mt-2 text-sm text-status-pending-light">
          Some wallet sources are unavailable. Available data stays visible as
          we retry.
        </p>
      )}

      <div className="mt-6">
        <div role="group" aria-label="Wallet chart" className="mb-4 flex gap-6 border-b border-border-subtle">
          {(['history', 'allocation'] as const).map((view) => (
            <button key={view} id={`${gradientId}-${view}`} type="button"
              aria-pressed={chart === view} aria-controls={`${gradientId}-chart`}
              onClick={() => setChart(view)}
              className={`min-h-10 border-b-2 pb-2 text-sm ${chart === view ? 'border-accent text-accent-light' : 'border-transparent text-text-muted hover:text-text-primary'}`}>
              {view === 'history' ? 'Price history' : 'Allocation'}
            </button>
          ))}
        </div>
        <div role="region" id={`${gradientId}-chart`} aria-labelledby={`${gradientId}-${chart}`}>
        {chart === 'history' ? <section
          aria-label="Holdings price history"
          className="min-w-0"
        >
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs text-text-muted">
                Current holdings valued at past prices · ADA
              </p>
            </div>
            <div
              className="inline-flex gap-1 rounded-lg border border-border-default p-1"
              role="group"
              aria-label="Price history range"
            >
              {([7, 30] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  aria-pressed={range === days}
                  onClick={() => setRange(days)}
                  className={`min-h-8 rounded-md px-3 text-xs ${range === days ? 'bg-accent/15 font-medium text-accent-light' : 'text-text-muted hover:text-text-primary'}`}
                >
                  {days}D
                </button>
              ))}
            </div>
          </header>
          {history.length > 1 ? (
            <>
              <p className="mt-3 text-xs text-text-muted">
                <span className={`font-mono ${change !== null && change >= 0 ? 'text-status-success-light' : 'text-status-error-light'}`}>{walletPercent(change)}</span> across available snapshots
              </p>
              <div
                className="mt-3 h-40 sm:h-44"
                role="img"
                aria-label={`Current holdings revalued at past prices over ${range} days. Latest ${history[history.length - 1].valueAda.toFixed(2)} ADA. Change ${walletPercent(change)}.`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={history}
                    margin={{ top: 5, right: 4, bottom: 0, left: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id={gradientId}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#67E8F9"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="100%"
                          stopColor="#67E8F9"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      stroke="#384E80"
                      strokeOpacity={0.3}
                    />
                    <XAxis
                      dataKey="observedAt"
                      tickFormatter={(value) =>
                        new Date(Number(value) * 1000).toLocaleDateString(
                          'en-US',
                          { month: 'short', day: 'numeric' },
                        )
                      }
                      tick={WALLET_CHART_TICK}
                      minTickGap={30}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      width={60}
                      domain={['auto', 'auto']}
                      tick={WALLET_CHART_TICK}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) =>
                        Number(value).toLocaleString('en-US', {
                          maximumFractionDigits:
                            Math.abs(Number(value)) < 1 ? 4 : 0,
                        })
                      }
                    />
                    <Tooltip
                      contentStyle={WALLET_TOOLTIP_STYLE}
                      labelFormatter={(value) =>
                        new Date(Number(value) * 1000).toLocaleString()
                      }
                      formatter={(value) => [
                        `₳ ${Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })}`,
                        'Revalued holdings',
                      ]}
                    />
                    <Area
                      dataKey="valueAda"
                      type="monotone"
                      stroke="#67E8F9"
                      strokeWidth={2}
                      fill={`url(#${gradientId})`}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="mt-4 flex min-h-24 items-center justify-center rounded-lg border border-dashed border-border-default px-6 text-center text-sm leading-6 text-text-muted">
              {summary.sources?.assets === false
                ? 'Holdings history is unavailable while the wallet index reconnects.'
                : 'Price history will appear when enough indexed prices are available.'}
            </div>
          )}
          <p className="mt-3 text-xs leading-5 text-text-muted">
            Price replay of today&apos;s holdings, not historical wallet balances.
          </p>
        </section> : <section
          aria-labelledby="wallet-allocation-title"
          className="min-w-0"
        >
          <h3
            id="wallet-allocation-title"
            className="text-sm font-medium text-text-primary"
          >
            Asset allocation
          </h3>
          <p className="mt-1 text-xs text-text-muted">
            Share of estimated holdings value in USD
          </p>
          {allocationTotal > 0 ? (
            <>
              <div
                className="relative mx-auto my-3 h-44 w-44"
                role="img"
                aria-label="Asset allocation chart. Values and percentages listed below."
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocation}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={80}
                      paddingAngle={2}
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {allocation.map((item, i) => (
                        <Cell key={item.id} fill={COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={WALLET_TOOLTIP_STYLE}
                      formatter={(value) => [walletUsd(Number(value)), 'Value']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono text-lg text-text-primary">
                    {metrics.allocation.length}
                  </span>
                  <span className="text-xs text-text-muted">valued assets</span>
                </div>
              </div>
              <ul className="mx-auto max-w-lg space-y-2">
                {allocation.map((item, i) => (
                  <li key={item.id} className="flex items-start gap-2 text-xs">
                    <span
                      className="mt-1 h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: COLORS[i] }}
                    />
                    <span className="min-w-0 flex-1 break-words text-text-secondary [overflow-wrap:anywhere]">
                      {item.name}
                    </span>
                    <span className="shrink-0 text-right font-mono text-text-secondary">
                      {walletUsd(item.value)}
                      <span className="ml-2 text-text-muted">
                        {((item.value / allocationTotal) * 100).toFixed(1)}%
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="flex min-h-24 items-center justify-center text-center text-sm text-text-muted">
              Allocation appears when holdings have indexed USD prices.
            </div>
          )}
          {metrics.unpriced > 0 && (
            <p className="mt-4 text-xs leading-5 text-text-muted">
              {metrics.unpriced} token{metrics.unpriced === 1 ? '' : 's'} with
              unavailable valuations excluded. View their quantities below.
            </p>
          )}
        </section>}
        </div>
      </div>
      <WalletHoldings
        summary={summary}
        walletLovelace={walletLovelace}
        stakeAddress={stakeAddress}
        totalUsd={metrics.totalUsd}
        averageTokenUsd={metrics.averageTokenUsd}
      />
      <section id="staking" className="mt-6 border-t border-border-subtle pt-4">
        <details onToggle={(event) => setStakingOpen(event.currentTarget.open)}>
          <summary className="cursor-pointer text-sm text-text-secondary hover:text-text-primary">Staking details</summary>
          {stakingOpen && <WalletStaking summary={summary} />}
        </details>
      </section>
    </Card>
  );
}

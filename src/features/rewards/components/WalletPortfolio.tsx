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
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: string;
}) {
  return (
    <div className="min-w-0 py-3 sm:px-4">
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd
        className={`mt-2 break-words font-mono text-xl font-medium tabular-nums [overflow-wrap:anywhere] ${tone ?? 'text-text-primary'}`}
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
              ? `Indexed data fetched ${new Date(summary.observedAt * 1000).toLocaleString()}`
              : 'Wallet index is catching up'}{' '}
            · Refreshes every 30 seconds while visible
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
      <dl className="mt-4 grid divide-y divide-border-subtle border-y border-border-subtle sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-4">
        <WalletMetric
          label="Estimated holdings value"
          value={walletUsd(metrics.totalUsd)}
          detail={
            summary.sources?.assets === false
              ? 'Holdings index unavailable'
              : `${metrics.priced.length} of ${summary.holdings.length} tokens valued${metrics.partial ? ' · partial estimate' : ' · includes wallet ADA'}`
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
              ? 'Balance from your connected wallet'
              : walletLovelace === null
                ? 'Balance source unavailable'
                : 'Balance from the stake address index'
          }
        />
        <WalletMetric
          label="Available staking rewards"
          value={
            summary.balance.rewardsAvailableLovelace === null
              ? '—'
              : `₳ ${formatWalletUnits(summary.balance.rewardsAvailableLovelace, 6)}`
          }
          detail="Stake account balance · separate from holdings"
        />
        <WalletMetric
          label="24h price movement"
          value={walletPercent(metrics.marketChangePct)}
          tone={
            metrics.marketChangePct === null
              ? undefined
              : metrics.marketChangePct >= 0
                ? 'text-status-success-light'
                : 'text-status-error-light'
          }
          detail={
            metrics.marketChangePct === null
              ? '24h prices unavailable'
              : `${metrics.marketChangeComplete ? 'All priced holdings' : 'Available 24h prices only'} · current quantities`
          }
        />
      </dl>
      <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
        <span>
          ADA/USD{' '}
          <span className="font-mono text-text-secondary">
            {walletPrice(summary.balance.adaPriceUsd)}
          </span>
        </span>
        <span>
          24h{' '}
          <span className="font-mono text-text-secondary">
            {walletPercent(summary.balance.adaPriceChange24h)}
          </span>
        </span>
        {summary.balance.adaPriceObservedAt && (
          <span>
            Quote:{' '}
            {new Date(
              summary.balance.adaPriceObservedAt * 1000,
            ).toLocaleString()}{' '}
            · {summary.balance.adaPriceSource || 'Indexed market'}
          </span>
        )}
      </p>
      <p className="mt-2 text-xs leading-5 text-text-muted">
        Values are estimates. Indexed holdings can lag your wallet; quotes may
        be up to 24 hours old. Unpriced assets and staking rewards are excluded
        from the holdings value. The 24h move reflects prices of current
        quantities.
      </p>
      {summary.degraded && (
        <p role="status" className="mt-2 text-sm text-status-pending-light">
          Some wallet sources are unavailable. Available data stays visible as
          we retry.
        </p>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section
          aria-labelledby="wallet-price-history-title"
          className="min-w-0"
        >
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3
                id="wallet-price-history-title"
                className="text-sm font-medium text-text-primary"
              >
                Holdings price history
              </h3>
              <p className="mt-1 text-xs text-text-muted">
                Current quantities revalued in ADA
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
              <p className="mt-4 flex flex-wrap items-baseline gap-2">
                <span className="font-mono text-2xl text-text-primary">
                  ₳{' '}
                  {history[history.length - 1].valueAda.toLocaleString(
                    'en-US',
                    { maximumFractionDigits: 2 },
                  )}
                </span>
                <span
                  className={`font-mono text-xs ${change !== null && change >= 0 ? 'text-status-success-light' : 'text-status-error-light'}`}
                >
                  {walletPercent(change)}
                </span>
                <span className="text-xs text-text-muted">
                  across available snapshots
                </span>
              </p>
              <div
                className="mt-3 h-56"
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
            <div className="mt-4 flex h-56 items-center justify-center rounded-lg border border-dashed border-border-default px-6 text-center text-sm leading-6 text-text-muted">
              {summary.sources?.assets === false
                ? 'Holdings history is unavailable while the wallet index reconnects.'
                : `A ${range}-day view needs at least two indexed price snapshots covering all your holdings. Historical prices are unavailable for some or all holdings.`}
            </div>
          )}
          <p className="mt-3 text-xs leading-5 text-text-muted">
            This is a price replay of today&apos;s holdings. Historical wallet
            balances, deposits, withdrawals, and realized returns are outside
            this chart.
          </p>
        </section>

        <section
          aria-labelledby="wallet-allocation-title"
          className="min-w-0 border-t border-border-subtle pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0"
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
              <ul className="space-y-3">
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
            <div className="flex min-h-56 items-center justify-center text-center text-sm text-text-muted">
              Allocation appears when holdings have indexed USD prices.
            </div>
          )}
          {metrics.unpriced > 0 && (
            <p className="mt-4 text-xs leading-5 text-text-muted">
              {metrics.unpriced} token{metrics.unpriced === 1 ? '' : 's'} with
              unavailable valuations excluded. View their quantities below.
            </p>
          )}
        </section>
      </div>
      <WalletHoldings
        summary={summary}
        walletLovelace={walletLovelace}
        stakeAddress={stakeAddress}
        totalUsd={metrics.totalUsd}
        averageTokenUsd={metrics.averageTokenUsd}
      />
      <WalletStaking summary={summary} />
    </Card>
  );
}

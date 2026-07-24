import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { IconAlertCircle, IconChartDots3 } from '@tabler/icons-react';
import { useWalletStore } from '@/store/wallet-state';
import { usePersonalAnalytics } from '@/features/profile/hooks/usePersonalAnalytics';

const TOKEN_COLORS = ['#22D3EE', '#A78BFA', '#34D399', '#FBBF24', '#F472B6'];

const TOOLTIP_STYLE = {
  background: 'rgba(15, 21, 36, 0.96)',
  border: '1px solid rgba(56, 78, 128, 0.45)',
  borderRadius: 10,
  color: '#E5E7EB',
  fontFamily: 'Geist Mono, monospace',
  fontSize: 11,
};

function formatReward(value: number): string {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: value >= 1 ? 4 : 6,
  });
}

function StateMessage({
  eyebrow,
  message,
}: {
  eyebrow: string;
  message: string;
}) {
  return (
    <div className="card-premium px-6 py-14 text-center">
      <p className="label-eyebrow">{eyebrow}</p>
      <p className="mx-auto mt-3 max-w-sm text-sm text-slate-400">{message}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div
      className="space-y-4"
      aria-label="Loading personal analytics"
      aria-busy="true"
    >
      <div className="card-premium grid grid-cols-2 gap-px overflow-hidden bg-border-subtle/50 md:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="bg-surface-raised px-5 py-5">
            <div className="skeleton-shimmer h-2.5 w-20 rounded" />
            <div className="skeleton-shimmer mt-4 h-7 w-24 rounded" />
          </div>
        ))}
      </div>
      <div className="card-premium px-5 py-5">
        <div className="skeleton-shimmer h-3 w-36 rounded" />
        <div className="skeleton-shimmer mt-6 h-64 rounded-xl" />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="bg-surface-raised px-5 py-5">
      <p className="label-eyebrow">{label}</p>
      <p className="mt-3 font-mono text-2xl font-medium tracking-tight text-white">
        {value}
      </p>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
    </div>
  );
}

export function PersonalAnalytics() {
  const stakeAddress = useWalletStore((state) => state.stakeAddress);
  const { data, isLoading, error } = usePersonalAnalytics(stakeAddress);
  const [selectedToken, setSelectedToken] = useState('');

  useEffect(() => {
    if (data?.defaultToken) {
      setSelectedToken((current) =>
        current && data.seriesByToken[current] ? current : data.defaultToken!,
      );
    }
  }, [data]);

  const selectedSeries = selectedToken
    ? data?.seriesByToken[selectedToken]
    : undefined;
  const activeSince = data?.summary.activeSince?.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const totalRewards = useMemo(
    () => data?.tokenMix.reduce((sum, item) => sum + item.rewards, 0) ?? 0,
    [data],
  );
  const feeTrackedSince = data?.feeCoverage.trackedSince?.toLocaleDateString(
    undefined,
    { month: 'short', year: 'numeric', timeZone: 'UTC' },
  );

  if (!stakeAddress) {
    return (
      <StateMessage
        eyebrow="Personal history"
        message="Connect a wallet to see your claim trends."
      />
    );
  }

  if (isLoading) return <LoadingState />;

  if (error) {
    return (
      <div className="card-premium flex items-start gap-3 px-5 py-4 text-sm text-rose-200">
        <IconAlertCircle
          size={18}
          stroke={1.6}
          className="mt-0.5 shrink-0 text-rose-400"
        />
        <div>
          <p className="font-medium text-white">Couldn't load personal analytics</p>
          <p className="mt-0.5 text-xs text-slate-400">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!data || data.summary.totalClaims === 0) {
    return (
      <StateMessage
        eyebrow={data?.degraded ? 'History archive unavailable' : 'No claims yet'}
        message={
          data?.degraded
            ? 'Personal trends appear once the history archive is connected.'
            : 'Your first claim starts the timeline.'
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <section
        className="card-premium grid grid-cols-2 gap-px overflow-hidden bg-border-subtle/50 md:grid-cols-4"
        aria-label="Claim summary"
      >
        <Metric label="Claims delivered" value={String(data.summary.totalClaims)} />
        <Metric
          label="Reward variety"
          value={`${data.summary.distinctTokens} token types`}
        />
        <Metric
          label="Tracked fees"
          value={`${formatReward(data.summary.totalFeesAda)} ADA`}
          detail={
            data.feesUnavailable
              ? 'Unavailable'
              : `${data.feeCoverage.completeClaims} complete claim${
                  data.feeCoverage.completeClaims === 1 ? '' : 's'
                }${feeTrackedSince ? ` since ${feeTrackedSince}` : ''}`
          }
        />
        <Metric label="Active since" value={activeSince ?? '—'} />
      </section>

      <section className="card-premium overflow-hidden">
        <header className="flex flex-col gap-4 border-b border-border-subtle/60 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="label-eyebrow">Delivered over time</p>
            <h3 className="mt-1.5 text-base font-medium text-white">
              Reward accumulation
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              A running total for one reward asset at a time.
            </p>
          </div>
          <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
            Reward token
            <select
              value={selectedToken}
              onChange={(event) => setSelectedToken(event.target.value)}
              className="rounded-lg border border-border-default bg-surface-inset px-3 py-2 font-mono text-xs normal-case tracking-normal text-slate-200 outline-none transition focus:border-accent"
            >
              {Object.values(data.seriesByToken).map((series) => (
                <option key={series.token} value={series.token}>
                  {series.ticker}
                </option>
              ))}
            </select>
          </label>
        </header>
        <div
          className="h-[300px] px-2 pb-3 pt-5 sm:px-5"
          aria-label={`${selectedSeries?.ticker ?? 'Reward'} accumulation chart`}
        >
          <ul className="sr-only" aria-label="Reward accumulation data">
            {(selectedSeries?.points ?? []).map((point) => (
              <li key={point.month}>
                {point.label}: {formatReward(point.cumulative)}{' '}
                {selectedSeries?.ticker} cumulative
              </li>
            ))}
          </ul>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={selectedSeries?.points ?? []}>
              <defs>
                <linearGradient id="rewardFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#22D3EE" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(56,78,128,0.22)" vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7895', fontSize: 10, fontFamily: 'Geist Mono' }}
                minTickGap={24}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={46}
                tick={{ fill: '#6B7895', fontSize: 10, fontFamily: 'Geist Mono' }}
                tickFormatter={(value) => formatReward(Number(value))}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value) => [
                  `${formatReward(Number(value))} ${selectedSeries?.ticker ?? ''}`,
                  'Cumulative',
                ]}
              />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="#22D3EE"
                strokeWidth={2.2}
                fill="url(#rewardFill)"
                activeDot={{ r: 4, fill: '#67E8F9', stroke: '#0B1120', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <section className="card-premium overflow-hidden">
          <header className="border-b border-border-subtle/60 px-5 py-4">
            <p className="label-eyebrow">Monthly cadence</p>
            <h3 className="mt-1.5 text-sm font-medium text-white">
              Claim frequency
            </h3>
          </header>
          <div className="h-56 px-2 pb-3 pt-5 sm:px-4" aria-label="Claim frequency chart">
            <ul className="sr-only" aria-label="Claim frequency data">
              {data.claimsByMonth.map((point) => (
                <li key={point.month}>
                  {point.label}: {point.claims} claim{point.claims === 1 ? '' : 's'}
                </li>
              ))}
            </ul>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.claimsByMonth}>
                <CartesianGrid stroke="rgba(56,78,128,0.22)" vertical={false} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7895', fontSize: 10, fontFamily: 'Geist Mono' }}
                  minTickGap={18}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                  tick={{ fill: '#6B7895', fontSize: 10, fontFamily: 'Geist Mono' }}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="claims" fill="#67E8F9" radius={[5, 5, 1, 1]} maxBarSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card-premium overflow-hidden">
          <header className="border-b border-border-subtle/60 px-5 py-4">
            <p className="label-eyebrow">Delivery mix</p>
            <h3 className="mt-1.5 text-sm font-medium text-white">
              Tokens claimed
            </h3>
          </header>
          <div className="grid min-h-56 grid-cols-[minmax(130px,0.8fr)_1fr] items-center gap-2 px-4 py-4">
            <div className="relative h-40" aria-label="Tokens claimed chart">
              <ul className="sr-only" aria-label="Tokens claimed data">
                {data.tokenMix.map((item) => (
                  <li key={item.token}>
                    {item.ticker}: {item.rewards} reward{item.rewards === 1 ? '' : 's'}
                  </li>
                ))}
              </ul>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.tokenMix}
                    dataKey="rewards"
                    nameKey="ticker"
                    innerRadius={44}
                    outerRadius={66}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {data.tokenMix.map((item, index) => (
                      <Cell
                        key={item.token}
                        fill={TOKEN_COLORS[index % TOKEN_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-xl text-white">{totalRewards}</span>
                <span className="label-eyebrow mt-0.5">rewards</span>
              </div>
            </div>
            <ul className="space-y-2.5">
              {data.tokenMix.map((item, index) => (
                <li key={item.token} className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: TOKEN_COLORS[index % TOKEN_COLORS.length],
                    }}
                  />
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-300">
                    {item.ticker}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">
                    {item.rewards}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      {(data.feesUnavailable || data.feeCoverage.incomplete) && (
        <div className="flex items-start gap-2 rounded-xl border border-border-subtle bg-surface-inset/50 px-4 py-3 text-xs text-slate-500">
          <IconChartDots3 size={15} stroke={1.6} className="mt-0.5 shrink-0 text-accent" />
          {data.feesUnavailable
            ? 'Fee history is temporarily unavailable. '
            : `The fee total covers ${data.feeCoverage.completeClaims} of ${data.summary.totalClaims} delivered claims. `}
          Earlier rewards remain included in every other chart.
        </div>
      )}
    </div>
  );
}

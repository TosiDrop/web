import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { IconDownload, IconExternalLink } from '@tabler/icons-react';
import { DEPLOYMENT_NETWORK } from '@/config/network';
import { downloadCsv } from '@/utils/csv';
import type { WalletSummary } from '../types/walletSummary';
import { formatWalletUnits, stakingEpochs } from '../utils/walletPortfolio';
import { exactWalletUnits } from '../utils/exportWalletHoldings';
import {
  WALLET_TOOLTIP_STYLE,
  WALLET_CHART_TICK,
} from '../utils/walletChartTheme';

function ada(raw: string | null | undefined) {
  return raw === null || raw === undefined
    ? '—'
    : `₳ ${formatWalletUnits(raw, 6)}`;
}

export function WalletStaking({ summary }: { summary: WalletSummary }) {
  const [range, setRange] = useState<12 | 36 | 'all'>(12);
  const points = stakingEpochs(summary.rewards?.epochs ?? []);
  const latestEpoch = points.at(-1)?.epoch;
  const visible =
    range === 'all'
      ? points
      : points.filter(
          (point) =>
            latestEpoch !== undefined && point.epoch > latestEpoch - range,
        );
  const average = visible.length
    ? visible.reduce((sum, point) => sum + point.amountAda, 0) / visible.length
    : null;
  const poolId = summary.delegation?.poolId;
  const host =
    DEPLOYMENT_NETWORK === 'mainnet' ? 'cexplorer.io' : 'preview.cexplorer.io';
  const unavailable =
    summary.sources?.rewards === false ||
    summary.rewards?.totalLovelace === null ||
    !summary.rewards;
  return (
    <section
      aria-labelledby="wallet-staking-title"
      className="mt-4"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3
            id="wallet-staking-title"
            className="text-base font-medium text-text-primary"
          >
            Staking &amp; delegation
          </h3>
          <p className="mt-1 text-xs text-text-muted">
            ADA rewards recorded on chain · separate from TosiDrop token claims
          </p>
        </div>
        <button
          type="button"
          disabled={unavailable}
          onClick={() =>
            downloadCsv(
              `tosidrop-staking-rewards-${new Date().toISOString().slice(0, 10)}.csv`,
              [
                [
                  'network',
                  'earned_epoch',
                  'spendable_epoch',
                  'amount_lovelace',
                  'amount_ada',
                  'pool_id',
                  'reward_type',
                ],
                ...(summary.rewards?.epochs ?? []).map((row) => [
                  DEPLOYMENT_NETWORK,
                  row.epoch ?? '',
                  row.spendableEpoch ?? '',
                  row.amountLovelace,
                  exactWalletUnits(row.amountLovelace, 6),
                  row.poolId ?? '',
                  row.type ?? '',
                ]),
              ],
            )
          }
          className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border-default px-3 py-2 text-xs text-text-secondary hover:bg-surface-inset disabled:opacity-60"
        >
          <IconDownload size={14} aria-hidden /> Export staking CSV
        </button>
      </header>
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-text-muted">Total rewards earned</dt>
              <dd className="mt-2 break-words font-mono text-lg text-text-primary [overflow-wrap:anywhere]">
                {ada(summary.rewards?.totalLovelace)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">
                Latest earned epoch {latestEpoch ?? ''}
              </dt>
              <dd className="mt-2 font-mono text-lg text-text-primary">
                {points.length
                  ? `₳ ${points[points.length - 1].amountAda.toLocaleString('en-US', { maximumFractionDigits: 4 })}`
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">
                Average per recorded epoch
              </dt>
              <dd className="mt-2 font-mono text-lg text-text-primary">
                {average === null
                  ? '—'
                  : `₳ ${average.toLocaleString('en-US', { maximumFractionDigits: 4 })}`}
              </dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-sm text-text-secondary">
              Rewards by earned epoch
            </h4>
            <div
              role="group"
              aria-label="Staking history range"
              className="inline-flex gap-1 rounded-lg border border-border-default p-1"
            >
              {([12, 36, 'all'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={range === value}
                  onClick={() => setRange(value)}
                  className={`min-h-8 rounded-md px-2 text-xs ${range === value ? 'bg-accent/15 text-accent-light' : 'text-text-muted hover:text-text-primary'}`}
                >
                  {value === 'all' ? 'All' : `${value} epochs`}
                </button>
              ))}
            </div>
          </div>
          {visible.length ? (
            <div
              className="mt-4 h-52"
              role="img"
              aria-label={`Staking rewards in ADA for ${visible.length} recorded epochs. Latest epoch ${latestEpoch}.`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={visible}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="#384E80"
                    strokeOpacity={0.3}
                  />
                  <XAxis
                    dataKey="epoch"
                    tick={WALLET_CHART_TICK}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={20}
                  />
                  <YAxis
                    width={40}
                    tick={WALLET_CHART_TICK}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={WALLET_TOOLTIP_STYLE}
                    labelFormatter={(value) => `Earned epoch ${Number(value)}`}
                    formatter={(value) => [
                      `₳ ${Number(value).toLocaleString('en-US', { maximumFractionDigits: 6 })}`,
                      'Rewards',
                    ]}
                  />
                  <Bar
                    dataKey="amountAda"
                    fill="#DCCFA8"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={32}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-4 flex h-52 items-center justify-center rounded-lg border border-dashed border-border-default px-6 text-center text-sm text-text-muted">
              {unavailable
                ? 'Staking reward history is temporarily unavailable from the index.'
                : 'Your stake address has no recorded earned rewards yet.'}
            </div>
          )}
          <p className="mt-3 text-xs leading-5 text-text-muted">
            {visible.length
              ? `${visible.length} recorded epochs in this range. `
              : ''}
            Averages use recorded epochs only; gaps remain unfilled. Earned
            rewards become spendable in a later epoch.
          </p>
        </div>
        <aside
          className="min-w-0 rounded-xl bg-surface-inset/60 p-4"
          aria-label="Delegation details"
        >
          <h4 className="text-sm font-medium text-text-primary">
            Stake account
          </h4>
          <dl className="mt-4 space-y-4 text-xs">
            <div>
              <dt className="text-text-muted">Registration</dt>
              <dd className="mt-1 text-text-secondary">
                {summary.delegation?.registered === null ||
                summary.delegation?.registered === undefined
                  ? 'Unavailable'
                  : summary.delegation.registered
                    ? 'Registered'
                    : 'Unregistered'}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Delegated pool</dt>
              <dd className="mt-1 leading-5">
                {poolId ? (
                  <a
                    href={`https://${host}/pool/${encodeURIComponent(poolId)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all font-mono text-accent-light hover:underline"
                  >
                    {poolId}
                    <IconExternalLink
                      size={12}
                      className="ml-1 inline"
                      aria-label="Opens in new tab"
                    />
                  </a>
                ) : (
                  <span className="text-text-secondary">
                    {summary.sources?.account === false
                      ? 'Unavailable'
                      : 'No delegated pool'}
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Staking rewards withdrawn</dt>
              <dd className="mt-1 font-mono text-text-secondary">
                {ada(summary.balance.withdrawnLovelace)}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Stake registration deposit</dt>
              <dd className="mt-1 font-mono text-text-secondary">
                {ada(summary.balance.stakeDepositLovelace)}
              </dd>
            </div>
            {summary.delegation?.drepId && (
              <div>
                <dt className="text-text-muted">Delegated representative</dt>
                <dd className="mt-1 break-all font-mono leading-5 text-text-secondary">
                  {summary.delegation.drepId}
                </dd>
              </div>
            )}
          </dl>
          <p className="mt-6 text-xs leading-5 text-text-muted">
            Manage ADA staking and withdrawals in your wallet. TosiDrop claims
            deliver distributor tokens.
          </p>
        </aside>
      </div>
    </section>
  );
}

import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { IconChartLine, IconClock, IconInfoCircle } from '@tabler/icons-react';
import { Card } from '@/components/common/Card';
import { apiClient } from '@/api/client';
import { useWalletStore, type WalletInstance } from '@/store/wallet-state';
import { decimalAmountToNumber } from '@/shared/amounts';

const COLORS = ['#67E8F9', '#A78BFA', '#34D399', '#FBBF24', '#F472B6', '#FB7185'];
const TOOLTIP_STYLE = {
  background: 'rgba(15, 21, 36, 0.96)',
  border: '1px solid rgba(56, 78, 128, 0.45)',
  borderRadius: 10,
  color: '#E5E7EB',
  fontFamily: 'Geist Mono, monospace',
  fontSize: 11,
};

interface WalletHolding {
  unit: string;
  quantity: string;
  name: string | null;
  ticker: string | null;
  decimals: number | null;
  metadataPending: boolean;
  priceUsd: number | null;
  priceChange24h: number | null;
  valueUsd: number | null;
  pricePending: boolean;
}

interface WalletSummary {
  degraded: boolean;
  balance: {
    accountLovelace: string;
    utxoLovelace: string;
    rewardsAvailableLovelace: string;
    adaPriceUsd: number | null;
    adaPriceChange24h: number | null;
  };
  holdings: WalletHolding[];
  metadata: { complete: boolean; returned: number; total: number };
  market: { configured: boolean; priced: number; requested: number };
  valueHistory: {
    points: Array<{ observedAt: number; valueAda: number }>;
    basis: 'current-holdings';
    rangeDays: number;
  };
}

interface WalletQueryData {
  summary: WalletSummary;
  attachedLovelace: string | null;
  degraded: boolean;
}

function formatUnits(raw: string, decimals: number, maxDecimals = 2): string {
  if (!/^\d+$/.test(raw)) return raw;
  const displayDecimals = Math.min(decimals, maxDecimals);
  const divisor = 10n ** BigInt(decimals - displayDecimals);
  const rounded = divisor > 1n ? (BigInt(raw) + divisor / 2n) / divisor : BigInt(raw);
  const scale = 10n ** BigInt(displayDecimals);
  const whole = scale > 1n ? rounded / scale : rounded;
  const fraction = scale > 1n
    ? (rounded % scale).toString().padStart(displayDecimals, '0').replace(/0+$/, '')
    : '';
  return `${whole.toLocaleString()}${fraction ? `.${fraction}` : ''}`;
}

function formatAda(raw: string): string {
  return formatUnits(raw, 6, 2);
}

function formatToken(raw: string, decimals: number | null): string {
  return decimals === null ? raw : formatUnits(raw, decimals, Math.min(decimals, 4));
}

function formatUsd(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return value < 0.01
    ? `$${value.toPrecision(3)}`
    : value.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

function shortName(holding: WalletHolding): string {
  return holding.ticker || holding.name || holding.unit.slice(0, 12);
}

async function readAttachedLovelace(wallet: WalletInstance): Promise<string> {
  if (!wallet) throw new Error('Wallet is not connected');
  const meshBalance = (wallet as unknown as {
    getBalanceMesh?: () => Promise<Array<{ unit: string; quantity: string }>>;
  }).getBalanceMesh;
  if (meshBalance) {
    const assets = await meshBalance.call(wallet);
    return assets.find((asset) => asset.unit === 'lovelace')?.quantity ?? '0';
  }
  return wallet.getLovelace();
}

function Panel({ children }: { children: React.ReactNode }) {
  return <Card className="overflow-hidden p-5">{children}</Card>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-inset/45 p-3">
      <p className="label-eyebrow">{label}</p>
      <p className="mt-2 font-mono text-lg tabular-nums text-text-primary">{value}</p>
      {detail && <p className="mt-1 text-2xs text-text-faint">{detail}</p>}
    </div>
  );
}

export function WalletComposition() {
  const { connected, stakeAddress, wallet } = useWalletStore();
  const { data, isLoading } = useQuery<WalletQueryData>({
    queryKey: ['wallet-summary', stakeAddress],
    queryFn: async () => {
      const [summaryResult, walletResult] = await Promise.allSettled([
        apiClient.get<WalletSummary>(
          `/api/wallet/summary?staking_address=${encodeURIComponent(stakeAddress!)}`,
        ),
        readAttachedLovelace(wallet),
      ]);
      const attachedLovelace = walletResult.status === 'fulfilled' ? walletResult.value : null;
      if (summaryResult.status === 'fulfilled') {
        return {
          summary: summaryResult.value,
          attachedLovelace,
          degraded: summaryResult.value.degraded,
        };
      }
      return {
        summary: {
          balance: {
            accountLovelace: attachedLovelace ?? '0',
            utxoLovelace: attachedLovelace ?? '0',
            rewardsAvailableLovelace: '0',
            adaPriceUsd: null,
            adaPriceChange24h: null,
          },
          holdings: [],
          metadata: { complete: false, returned: 0, total: 0 },
          market: { configured: false, priced: 0, requested: 0 },
          valueHistory: { points: [], basis: 'current-holdings', rangeDays: 30 },
          degraded: true,
        },
        attachedLovelace,
        degraded: true,
      };
    },
    enabled: connected && !!stakeAddress && !!wallet,
    staleTime: 60_000,
    refetchInterval: 30_000,
    retry: 5,
  });

  if (!connected || !stakeAddress) return <Panel><p className="text-xs text-text-muted">Not connected</p></Panel>;
  if (isLoading) return <Panel><p className="text-xs text-text-muted">Loading wallet portfolio…</p></Panel>;
  if (!data) return <Panel><p className="text-xs text-text-muted">Waiting for wallet data…</p></Panel>;

  const { summary } = data;
  const attachedAda = decimalAmountToNumber(data.attachedLovelace ?? summary.balance.utxoLovelace, 6);
  const adaValueUsd = summary.balance.adaPriceUsd === null ? null : attachedAda * summary.balance.adaPriceUsd;
  const pricedHoldings = summary.holdings.filter((holding) => holding.valueUsd !== null);
  const totalValueUsd = adaValueUsd === null && pricedHoldings.length === 0
    ? null
    : (adaValueUsd ?? 0) + pricedHoldings.reduce((total, holding) => total + (holding.valueUsd ?? 0), 0);
  const allocation = [
    { id: 'lovelace', name: 'ADA', value: adaValueUsd ?? 0 },
    ...pricedHoldings.map((holding) => ({ id: holding.unit, name: shortName(holding), value: holding.valueUsd ?? 0 })),
  ].filter((item) => item.value > 0);
  const allocationTotal = allocation.reduce((total, item) => total + item.value, 0);
  const history = summary.valueHistory.points;

  return (
    <Panel>
      <header className="flex flex-col gap-3 border-b border-border-subtle/60 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="label-eyebrow">Your portfolio</p><h3 className="mt-1 text-lg font-medium tracking-tight text-text-primary">Wallet at a glance</h3></div>
        <span className="inline-flex items-center gap-1.5 text-2xs text-text-faint"><IconClock size={13} stroke={1.6} /> Live wallet · indexed rewards</span>
      </header>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Wallet balance" value={`₳ ${formatAda(data.attachedLovelace ?? summary.balance.utxoLovelace)}`} detail={data.attachedLovelace ? 'From connected wallet' : 'Indexed balance while wallet responds'} />
        <Metric label="Rewards available" value={`₳ ${formatAda(summary.balance.rewardsAvailableLovelace)}`} detail="Available to withdraw" />
        <Metric label="Priced value" value={formatUsd(totalValueUsd)} detail={summary.market.priced ? `${summary.market.priced} assets priced` : 'Prices are being indexed'} />
      </div>
      {data.degraded && <p className="mt-3 text-2xs text-text-faint">Some wallet data is unavailable right now. Available values remain visible while this view retries.</p>}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="min-w-0 rounded-xl border border-border-subtle bg-surface-inset/25 p-4">
          <div className="flex items-start justify-between gap-3"><div><p className="label-eyebrow">Balance over time</p><p className="mt-1 text-xs text-text-muted">Estimated ADA value of today&apos;s holdings</p></div><IconChartLine size={18} stroke={1.6} className="text-accent-light" /></div>
          {history.length > 1 ? (
            <div className="mt-3 h-48" aria-label="Portfolio balance over time chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs><linearGradient id="walletValueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#67E8F9" stopOpacity={0.28} /><stop offset="100%" stopColor="#67E8F9" stopOpacity={0} /></linearGradient></defs>
                  <XAxis dataKey="observedAt" tickFormatter={(value) => new Date(value * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} axisLine={false} tickLine={false} tick={{ fill: '#6B7895', fontSize: 10 }} minTickGap={24} />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(value) => new Date(Number(value) * 1000).toLocaleDateString()} formatter={(value) => [`₳ ${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, 'Estimated value']} />
                  <Area type="monotone" dataKey="valueAda" stroke="#67E8F9" strokeWidth={2} fill="url(#walletValueFill)" activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="mt-3 flex h-48 items-center justify-center rounded-lg border border-dashed border-border-subtle px-6 text-center text-xs text-text-faint">Balance history will appear as indexed price snapshots accumulate.</div>}
          <p className="mt-2 text-2xs text-text-faint">{history.length > 1 ? 'This revalues your current holdings against historical snapshots; it is not a reconstruction of past wallet contents.' : 'Market history is cached by TosiDrop and does not query DEX providers from this page.'}</p>
        </section>

        <section className="rounded-xl border border-border-subtle bg-surface-inset/25 p-4">
          <p className="label-eyebrow">Allocation</p>
          {allocationTotal > 0 ? <>
            <div className="relative mx-auto mt-3 h-40 w-40"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={allocation} dataKey="value" nameKey="name" innerRadius={48} outerRadius={70} paddingAngle={2} stroke="none">{allocation.map((item, index) => <Cell key={item.id} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => [formatUsd(Number(value)), 'Value']} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"><span className="font-mono text-sm text-text-primary">{formatUsd(totalValueUsd)}</span><span className="text-2xs text-text-faint">priced</span></div></div>
            <ul className="mt-3 space-y-2">{allocation.slice(0, 5).map((item, index) => <li key={item.id} className="flex items-center gap-2 text-xs"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} /><span className="min-w-0 flex-1 truncate text-text-secondary">{item.name}</span><span className="font-mono text-2xs text-text-muted">{Math.round(item.value / allocationTotal * 100)}%</span></li>)}</ul>
          </> : <div className="mt-3 flex min-h-40 items-center justify-center text-center text-xs text-text-faint"><span><IconInfoCircle size={16} className="mx-auto mb-2 text-text-muted" />Allocation appears after cached prices are available.</span></div>}
        </section>
      </div>

      <section className="mt-5 border-t border-border-subtle/60 pt-4">
        <div className="mb-3 flex items-center justify-between gap-3"><div><p className="label-eyebrow">Holdings</p><p className="mt-1 text-xs text-text-muted">Quantity, market price, and share of priced portfolio</p></div><span className="text-2xs text-text-faint">{summary.holdings.length} assets</span></div>
        <div className="space-y-2">{summary.holdings.slice(0, 8).map((holding) => {
          const percentage = allocationTotal > 0 && holding.valueUsd !== null ? Math.round(holding.valueUsd / allocationTotal * 100) : null;
          return <div key={holding.unit} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-surface-inset/50 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]"><div className="min-w-0"><p className="truncate text-sm text-text-secondary">{shortName(holding)}</p><p className="font-mono text-2xs text-text-faint">{formatToken(holding.quantity, holding.decimals)} {holding.pricePending ? '· price pending' : ''}</p></div><span className="hidden font-mono text-xs text-text-muted sm:block">{holding.priceUsd === null ? '—' : formatUsd(holding.priceUsd)}</span><span className={`font-mono text-xs ${holding.priceChange24h === null ? 'text-text-faint' : holding.priceChange24h >= 0 ? 'text-status-success-light' : 'text-status-error-light'}`}>{holding.priceChange24h === null ? '—' : `${holding.priceChange24h >= 0 ? '+' : ''}${holding.priceChange24h.toFixed(2)}%`}</span><span className="font-mono text-xs tabular-nums text-text-primary">{percentage === null ? '—' : `${percentage}%`}</span></div>;
        })}</div>
        {!summary.metadata.complete && <p className="mt-3 text-2xs leading-5 text-text-faint">Some asset metadata is still being indexed. Quantities remain sourced from Koios.</p>}
      </section>
    </Panel>
  );
}

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { IconDownload } from '@tabler/icons-react';
import { Card } from '@/components/common/Card';
import { DataUnavailable } from '@/components/common/DataUnavailable';
import { downloadCsv } from '@/utils/csv';
import { usePlatformAudience } from '../hooks/usePlatformAudience';

const CHART_TOOLTIP = {
  background: 'rgba(15, 21, 36, 0.96)',
  border: '1px solid rgba(56, 78, 128, 0.45)',
  borderRadius: 10,
  color: '#E5E7EB',
  fontSize: 11,
};

export function PlatformAudience() {
  const { data, isLoading, error, refetch } = usePlatformAudience();
  if (isLoading) return <Card className="h-72 p-5" role="status" aria-label="Loading platform usage analytics" />;
  if (error || !data || data.degraded || !data.summary) {
    return <DataUnavailable title="Platform usage is unavailable" message="The indexed claim archive is unavailable. Try again later." onRetry={() => { void refetch(); }} />;
  }

  const { claimingWallets, claims, returningWallets } = data.summary;
  const metrics = [
    ['Indexed claiming wallets', claimingWallets.toLocaleString(), 'Unique stake addresses in the synced claim archive'],
    ['Indexed claims', claims.toLocaleString(), 'Distinct delivered claim IDs in the synced archive'],
    ['Repeat claimers', returningWallets.toLocaleString(), 'Indexed wallets with more than one delivered claim ID'],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-xs leading-5 text-text-muted">
          This archive grows when wallet histories sync. Counts may be incomplete and cover delivered claims only; they exclude site visits and connected wallets without claims.
        </p>
        <button
          type="button"
          onClick={() => downloadCsv(`tosidrop-platform-usage-${new Date().toISOString().slice(0, 10)}.csv`, [
            ['month', 'indexed_claiming_wallets', 'indexed_delivered_claims'],
            ...data.months.map((month) => [month.month, month.claimingWallets, month.claims]),
          ])}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-2 text-xs font-medium text-text-secondary hover:border-accent/50 hover:text-text-primary"
        >
          <IconDownload size={14} aria-hidden /> Export CSV
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {metrics.map(([label, value, detail]) => (
          <Card key={label} className="p-4">
            <p className="text-xs text-text-muted">{label}</p>
            <p className="mt-2 font-mono text-2xl tabular-nums text-text-primary">{value}</p>
            <p className="mt-1 text-2xs leading-5 text-text-faint">{detail}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-text-primary">Indexed claims and wallets by month</h3>
        {data.months.length > 0 ? (
          <>
            <ul className="sr-only" aria-label="Monthly platform usage data">
              {data.months.map((month) => <li key={month.month}>{month.month}: {month.claimingWallets} wallets, {month.claims} claims</li>)}
            </ul>
            <div className="mt-4 h-64" aria-label="Monthly claiming wallets and delivered claims chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.months} margin={{ left: -20 }}>
                  <CartesianGrid vertical={false} stroke="rgba(56,78,128,0.22)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9BA8BF', fontSize: 10 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#9BA8BF', fontSize: 10 }} />
                  <Tooltip contentStyle={CHART_TOOLTIP} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#9BA8BF' }} />
                  <Bar dataKey="claimingWallets" name="Claiming wallets" fill="#67E8F9" radius={[3, 3, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="claims" name="Delivered claims" fill="#A78BFA" radius={[3, 3, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : <p className="mt-5 text-sm text-text-muted">No delivered claims are indexed yet.</p>}
      </Card>
    </div>
  );
}

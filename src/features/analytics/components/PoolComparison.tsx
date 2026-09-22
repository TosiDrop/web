import { Fragment, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { IconBriefcase, IconSearch, IconShieldCheck } from '@tabler/icons-react';
import { DataUnavailable } from '@/components/common/DataUnavailable';
import { usePoolData } from '@/features/analytics/hooks/usePoolData';
import { describeEligibility, type PoolComparisonRow } from '@/features/analytics/utils/poolComparison';

const fmt = (n: number) =>
  n.toLocaleString(undefined, { maximumFractionDigits: n >= 100 ? 0 : n >= 1 ? 2 : 4 });

const CHART_TOOLTIP = {
  background: 'rgba(15, 21, 36, 0.96)',
  border: '1px solid rgba(56, 78, 128, 0.45)',
  borderRadius: 10,
  color: '#E5E7EB',
  fontSize: 11,
};

function PoolCell({ row }: { row: PoolComparisonRow }) {
  const [failed, setFailed] = useState(false);
  const initials = (row.ticker || row.name || '??').slice(0, 3).toUpperCase();
  const content = (
    <div className="flex items-center gap-3">
      {row.logo && !failed ? (
        <img src={row.logo} alt="" onError={() => setFailed(true)} className="h-9 w-9 shrink-0 rounded-full border border-border-subtle bg-surface-inset object-cover" />
      ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-inset font-mono text-[10px] text-slate-300">
          {initials}
        </span>
      )}
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-sm font-medium text-white">
          <span className="truncate">{row.ticker || row.name || 'Pool'}</span>
          {row.kind === 'project' && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-medium text-violet-300">
              <IconBriefcase size={11} stroke={1.8} /> Project
            </span>
          )}
          {row.kind === 'pool' && row.partner === true && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-300">
              <IconShieldCheck size={11} stroke={1.8} /> Partner
            </span>
          )}
        </p>
        <p className="truncate text-xs text-slate-500">{row.name}</p>
      </div>
    </div>
  );
  return row.kind === 'pool' && row.poolId.startsWith('pool') ? (
    <a href={`https://cexplorer.io/pool/${row.poolId}`} target="_blank" rel="noopener noreferrer" className="hover:text-accent-light">
      {content}
    </a>
  ) : content;
}

function Offerings({ offerings }: { offerings: PoolComparisonRow['offerings'] }) {
  if (!offerings.length) return <span className="text-xs text-slate-600">—</span>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {offerings.map((o) => {
        const eligibility = describeEligibility(o);
        return (
          <li
            key={o.id}
            className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-surface-inset px-2 py-0.5 font-mono text-[11px] text-slate-200"
            title={`Rule ${o.id}${o.target ? ` · ${o.target}` : ''}${o.model ? ` · model ${o.model}` : ''} · ${
              o.promise ? 'promised' : 'distributed'
            } per epoch${eligibility ? ` · ${eligibility}` : ''}`}
          >
            <span className="text-emerald-300/95">{fmt(o.amountPerEpoch)}</span>
            {o.ticker}
            {eligibility && <span className="text-slate-500">· {eligibility}</span>}
          </li>
        );
      })}
    </ul>
  );
}

export function PoolComparisonTable({ rows }: { rows: PoolComparisonRow[] }) {
  return (
    <div className="card-premium overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-border-subtle text-[10px] uppercase tracking-wider text-slate-500">
            <th scope="col" className="px-5 py-3 font-medium">Pool / project</th>
            <th scope="col" className="px-5 py-3 text-right font-medium">Delegators</th>
            <th scope="col" className="px-5 py-3 font-medium">Tokens / epoch</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle/50">
          {(['pool', 'project'] as const).map((kind) => {
            const group = rows.filter((row) => row.kind === kind);
            if (!group.length) return null;
            return (
              <Fragment key={kind}>
                <tr className="bg-surface-inset/40">
                  <th scope="rowgroup" colSpan={3} className="px-5 py-2 text-[10px] uppercase tracking-wider text-slate-500">
                    {kind === 'pool' ? 'Stake pools' : 'Projects'}
                  </th>
                </tr>
                {group.map((row) => (
                  <tr key={row.poolId}>
                    <td className="px-5 py-3"><PoolCell row={row} /></td>
                    <td className="px-5 py-3 text-right font-mono text-xs text-slate-200">
                      {row.delegators === null ? '—' : row.delegators.toLocaleString()}
                    </td>
                    <td className="px-5 py-3"><Offerings offerings={row.offerings} /></td>
                  </tr>
                ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function PoolComparison() {
  const { data, isLoading, error, refetch } = usePoolData();
  const [query, setQuery] = useState('');
  const allRows = useMemo(() => data?.rows ?? [], [data]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter(
      (r) =>
        r.ticker.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.offerings.some((o) => o.ticker.toLowerCase().includes(q)),
    );
  }, [allRows, query]);

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading pool comparison">
        {[0, 1, 2].map((i) => <div key={i} className="skeleton-shimmer h-14 rounded-[13px]" />)}
      </div>
    );
  }
  if (error) {
    return <DataUnavailable title="Pool index is catching up" message="The latest participating-pool snapshot is not available yet. We will keep this view retryable." onRetry={() => { void refetch(); }} />;
  }

  return (
    <div className="space-y-4">
      <label className="relative block max-w-xs">
        <IconSearch size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter pools or tokens"
          aria-label="Filter pools"
          className="w-full rounded-lg border border-border-subtle bg-surface-inset py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-brand-cyan/40 focus:outline-none"
        />
      </label>
      {data && data.unavailable.length > 0 && (
        <p role="status" className="text-xs text-slate-500">
          {data.unavailable.join(', ')} unavailable right now — those columns show “—”.
        </p>
      )}
      {rows.length ? (
        <>
          {rows.some((row) => row.kind === 'pool' && row.delegators !== null) && (
            <section className="card-premium overflow-hidden" aria-labelledby="delegator-distribution">
              <div className="border-b border-border-subtle/60 px-5 py-4">
                <p className="label-eyebrow">Network shape</p>
                <h3 id="delegator-distribution" className="mt-1 text-base font-medium text-text-primary">
                  Delegators across tracked pools
                </h3>
              </div>
              <div className="h-64 px-2 pb-4 pt-5 sm:px-5" aria-label="Delegator distribution chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={rows
                      .filter((row) => row.kind === 'pool' && row.delegators !== null)
                      .sort((a, b) => (b.delegators ?? 0) - (a.delegators ?? 0))
                      .slice(0, 10)
                      .map((row) => ({ name: row.ticker || row.name || 'Pool', delegators: row.delegators }))}
                    layout="vertical"
                    margin={{ left: 8, right: 18 }}
                  >
                    <CartesianGrid stroke="rgba(56,78,128,0.22)" horizontal={false} />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#6B7895', fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" width={64} axisLine={false} tickLine={false} tick={{ fill: '#AAB5CE', fontSize: 10 }} />
                    <Tooltip contentStyle={CHART_TOOLTIP} formatter={(value) => [Number(value).toLocaleString(), 'Delegators']} />
                    <Bar dataKey="delegators" fill="#67E8F9" radius={[0, 5, 5, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}
          <PoolComparisonTable rows={rows} />
        </>
      ) : (
        <p className="card-premium px-6 py-10 text-center text-sm text-slate-400">
          {allRows.length ? 'No pools match that filter.' : 'No pools are registered on this network yet.'}
        </p>
      )}
    </div>
  );
}

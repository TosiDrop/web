import { useMemo, useState } from 'react';
import { IconAlertCircle, IconSearch, IconShieldCheck } from '@tabler/icons-react';
import { usePoolData } from '@/features/analytics/hooks/usePoolData';
import { describeEligibility, type PoolComparisonRow } from '@/features/analytics/utils/poolComparison';

const fmt = (n: number) =>
  n.toLocaleString(undefined, { maximumFractionDigits: n >= 100 ? 0 : n >= 1 ? 2 : 4 });

function PoolCell({ row }: { row: PoolComparisonRow }) {
  const [failed, setFailed] = useState(false);
  const initials = (row.ticker || row.name || '??').slice(0, 3).toUpperCase();
  return (
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
          {row.whitelisted === true && (
            <IconShieldCheck size={14} stroke={1.8} className="shrink-0 text-emerald-300" aria-label="Whitelisted" />
          )}
        </p>
        <p className="truncate text-xs text-slate-500">{row.name}</p>
      </div>
    </div>
  );
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
            <th scope="col" className="px-5 py-3 font-medium">Pool</th>
            <th scope="col" className="px-5 py-3 text-right font-medium">Delegators</th>
            <th scope="col" className="px-5 py-3 font-medium">Tokens / epoch</th>
            <th scope="col" className="px-5 py-3 text-right font-medium">Withdrawals</th>
            <th scope="col" className="px-5 py-3 text-right font-medium">Fees collected</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle/50">
          {rows.map((row) => (
            <tr key={row.poolId}>
              <td className="px-5 py-3"><PoolCell row={row} /></td>
              <td className="px-5 py-3 text-right font-mono text-xs text-slate-200">
                {row.delegators === null ? '—' : row.delegators.toLocaleString()}
              </td>
              <td className="px-5 py-3"><Offerings offerings={row.offerings} /></td>
              <td className="px-5 py-3 text-right font-mono text-xs text-slate-200">
                {row.withdrawals === null ? '—' : row.withdrawals.toLocaleString()}
              </td>
              <td className="px-5 py-3 text-right font-mono text-xs text-slate-200">
                {row.collectedFeesAda === null ? '—' : `₳ ${fmt(row.collectedFeesAda)}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PoolComparison() {
  const { data, isLoading, error } = usePoolData();
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
    return (
      <div role="alert" className="card-premium flex items-start gap-3 px-5 py-4 text-sm text-rose-200">
        <IconAlertCircle size={18} className="mt-0.5 shrink-0" />
        {error.message}
      </div>
    );
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
        <PoolComparisonTable rows={rows} />
      ) : (
        <p className="card-premium px-6 py-10 text-center text-sm text-slate-400">
          {allRows.length ? 'No pools match that filter.' : 'No pools are registered on this network yet.'}
        </p>
      )}
    </div>
  );
}

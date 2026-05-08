import { useState } from 'react';
import { IconAlertCircle } from '@tabler/icons-react';
import { useWalletStore } from '@/store/wallet-state';
import { useDeliveredRewards, type DeliveredReward } from '@/features/history/api/history.queries';

const PAGE_SIZE = 12;

function formatAmount(amount: number): string {
  if (amount >= 1000) {
    return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  if (amount >= 1) {
    return amount.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  return amount.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function formatRelative(date: Date): string {
  const now = new Date();
  const ms = now.getTime() - date.getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days < 1) return 'Today';
  if (days < 2) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: now.getFullYear() === date.getFullYear() ? undefined : 'numeric',
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function TokenAvatar({ logo, ticker }: { logo?: string; ticker: string }) {
  const [failed, setFailed] = useState(false);
  if (logo && !failed) {
    return (
      <img
        src={logo}
        alt=""
        onError={() => setFailed(true)}
        className="h-9 w-9 shrink-0 rounded-full border border-border-subtle bg-surface-inset object-cover"
      />
    );
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand-cyan/20 bg-gradient-to-br from-brand-cyan/12 to-brand-teal/8 font-mono text-[10px] font-medium uppercase tracking-tight text-brand-cyan">
      {ticker.slice(0, 3)}
    </div>
  );
}

function HistoryRow({ row }: { row: DeliveredReward }) {
  return (
    <li className="group flex items-center gap-4 px-5 py-3.5 transition hover:bg-white/[0.015]">
      <TokenAvatar logo={row.logo} ticker={row.ticker} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{row.ticker}</p>
        <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
          {row.epoch !== null && <span>Epoch {row.epoch}</span>}
          {row.epoch !== null && row.deliveredOn && (
            <span className="text-slate-700">·</span>
          )}
          {row.deliveredOn && (
            <span title={row.deliveredOn.toLocaleString()}>
              {formatRelative(row.deliveredOn)} {formatTime(row.deliveredOn)}
            </span>
          )}
        </p>
      </div>
      <div className="text-right">
        <p className="font-mono text-sm text-emerald-300/95">
          +{formatAmount(row.amount)}
        </p>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
          {row.ticker}
        </p>
      </div>
    </li>
  );
}

function StateMessage({ eyebrow, message }: { eyebrow: string; message: string }) {
  return (
    <div className="card-premium px-6 py-16 text-center">
      <p className="label-eyebrow">{eyebrow}</p>
      <p className="mx-auto mt-3 max-w-sm text-sm text-slate-400">{message}</p>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="card-premium overflow-hidden">
      <div className="flex items-center justify-between border-b border-border-subtle/60 px-5 py-3">
        <div className="h-3 w-20 animate-pulse rounded bg-surface-inset" />
        <div className="h-3 w-24 animate-pulse rounded bg-surface-inset" />
      </div>
      <ul className="divide-y divide-border-subtle/50">
        {[0, 1, 2, 3, 4].map((i) => (
          <li key={i} className="flex items-center gap-4 px-5 py-3.5">
            <div className="h-9 w-9 animate-pulse rounded-full bg-surface-inset" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 animate-pulse rounded bg-surface-inset" />
              <div className="h-2.5 w-32 animate-pulse rounded bg-surface-inset/60" />
            </div>
            <div className="space-y-2 text-right">
              <div className="ml-auto h-3 w-16 animate-pulse rounded bg-surface-inset" />
              <div className="ml-auto h-2.5 w-10 animate-pulse rounded bg-surface-inset/60" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HistoryList() {
  const stakeAddress = useWalletStore((s) => s.stakeAddress);
  const { data, isLoading, error } = useDeliveredRewards(stakeAddress);
  const [showAll, setShowAll] = useState(false);

  if (!stakeAddress) {
    return (
      <StateMessage
        eyebrow="Not connected"
        message="Connect a wallet to view your delivered rewards."
      />
    );
  }

  if (isLoading) return <SkeletonList />;

  if (error) {
    return (
      <div className="card-premium flex items-start gap-3 px-5 py-4 text-sm text-rose-200">
        <IconAlertCircle size={18} stroke={1.6} className="mt-0.5 shrink-0 text-rose-400" />
        <div>
          <p className="font-medium text-white">Couldn't load history</p>
          <p className="mt-0.5 text-xs text-slate-400">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <StateMessage
        eyebrow="No history yet"
        message="Once your first reward is delivered, it'll appear here."
      />
    );
  }

  const visible = showAll ? data : data.slice(0, PAGE_SIZE);
  const hasMore = data.length > visible.length;

  return (
    <section className="card-premium overflow-hidden">
      <header className="flex items-center justify-between border-b border-border-subtle/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <p className="label-eyebrow">Delivered</p>
          <span className="rounded-full border border-border-subtle bg-surface-inset/70 px-2 py-0.5 font-mono text-[10px] text-slate-300">
            {data.length}
          </span>
        </div>
        <p className="text-[11px] text-slate-500">Most recent first</p>
      </header>

      <ul className="divide-y divide-border-subtle/50">
        {visible.map((row) => (
          <HistoryRow key={row.key} row={row} />
        ))}
      </ul>

      {hasMore && (
        <div className="border-t border-border-subtle/60 px-5 py-3 text-center">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="font-mono text-[10px] uppercase tracking-wider text-brand-cyan transition hover:text-cyan-200"
          >
            Show {data.length - visible.length} more
          </button>
        </div>
      )}
    </section>
  );
}

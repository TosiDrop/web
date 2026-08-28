import { useState } from 'react';
import { IconAlertCircle, IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { useWalletStore } from '@/store/wallet-state';
import { useRewardBreakdown, type BreakdownGroup } from '@/features/profile/hooks/useRewardBreakdown';
import type { BreakdownEntry } from '@/features/profile/utils/normalizeBreakdown';

function formatAmount(amount: number): string {
  if (amount >= 1000) return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (amount >= 1) return amount.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return amount.toLocaleString(undefined, { maximumFractionDigits: 6 });
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

function EntryRow({ entry }: { entry: BreakdownEntry }) {
  return (
    <li className="flex items-center gap-3 px-5 py-2.5 pl-[4.25rem]">
      <p className="flex flex-1 items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
        {entry.epoch !== null && <span>Epoch {entry.epoch}</span>}
        {entry.epoch !== null && (entry.pool || entry.rule) && (
          <span className="text-slate-700">·</span>
        )}
        {entry.pool && <span>{entry.pool}</span>}
        {entry.pool && entry.rule && <span className="text-slate-700">·</span>}
        {entry.rule && <span>{entry.rule}</span>}
        {entry.kind === 'promise' && (
          <span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[9px] font-medium normal-case tracking-normal text-purple-400">
            Promised
          </span>
        )}
      </p>
      <p className="font-mono text-xs text-emerald-300/95">+{formatAmount(entry.amount)}</p>
    </li>
  );
}

function GroupRow({ group }: { group: BreakdownGroup }) {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-white/[0.015]"
      >
        {open ? (
          <IconChevronDown size={14} stroke={1.6} className="shrink-0 text-slate-500" />
        ) : (
          <IconChevronRight size={14} stroke={1.6} className="shrink-0 text-slate-500" />
        )}
        <TokenAvatar logo={group.logo} ticker={group.ticker} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{group.ticker}</p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
            {group.entries.length} distribution{group.entries.length === 1 ? '' : 's'}
          </p>
        </div>
        <p className="font-mono text-sm text-emerald-300/95">+{formatAmount(group.total)}</p>
      </button>
      {open && (
        <ul className="divide-y divide-border-subtle/40 border-t border-border-subtle/40 bg-surface-inset/30">
          {group.entries.map((e, i) => (
            <EntryRow key={i} entry={e} />
          ))}
        </ul>
      )}
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

export function RewardBreakdown() {
  const stakeAddress = useWalletStore((s) => s.stakeAddress);
  const { data, isLoading, error } = useRewardBreakdown(stakeAddress);

  if (!stakeAddress) {
    return (
      <StateMessage
        eyebrow="Not connected"
        message="Connect a wallet to see where your rewards come from."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="card-premium space-y-3 px-5 py-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-surface-inset" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-premium flex items-start gap-3 px-5 py-4 text-sm text-rose-200">
        <IconAlertCircle size={18} stroke={1.6} className="mt-0.5 shrink-0 text-rose-400" />
        <div>
          <p className="font-medium text-white">Couldn't load the breakdown</p>
          <p className="mt-0.5 text-xs text-slate-400">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <StateMessage
        eyebrow="No breakdown data yet"
        message="Once rewards are allocated to you, their source pools and rules show up here."
      />
    );
  }

  return (
    <section className="card-premium overflow-hidden">
      <header className="flex items-center justify-between border-b border-border-subtle/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <p className="label-eyebrow">By source</p>
          <span className="rounded-full border border-border-subtle bg-surface-inset/70 px-2 py-0.5 font-mono text-[10px] text-slate-300">
            {data.length}
          </span>
        </div>
        <p className="text-[11px] text-slate-500">Largest totals first</p>
      </header>
      <ul className="divide-y divide-border-subtle/50">
        {data.map((group) => (
          <GroupRow key={group.token} group={group} />
        ))}
      </ul>
    </section>
  );
}

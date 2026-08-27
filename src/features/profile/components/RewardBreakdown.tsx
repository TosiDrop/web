import { useState } from 'react';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { Card } from '@/components/common/Card';
import { FeedbackBanner } from '@/components/common/FeedbackBanner';
import { GradientButton } from '@/components/common/GradientButton';
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
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent/10 font-mono text-2xs font-medium uppercase tracking-tight text-accent-light">
      {ticker.slice(0, 3)}
    </span>
  );
}

function EntryRow({ entry }: { entry: BreakdownEntry }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 sm:pl-17">
      <p className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-text-muted">
        {entry.epoch !== null && <span className="tabular-nums">Epoch {entry.epoch}</span>}
        {entry.epoch !== null && (entry.pool || entry.rule) && (
          <span className="text-text-faint">·</span>
        )}
        {entry.pool && <span className="min-w-0 truncate">{entry.pool}</span>}
        {entry.pool && entry.rule && <span className="text-text-faint">·</span>}
        {entry.rule && <span className="min-w-0 truncate">{entry.rule}</span>}
        {entry.kind === 'promise' && (
          <span className="rounded-md bg-status-pending/10 px-1.5 py-0.5 text-2xs font-medium normal-case tracking-normal text-status-pending-light">
            Promised
          </span>
        )}
      </p>
      <p className="font-mono text-xs tabular-nums text-status-success-light">
        +{formatAmount(entry.amount)}
      </p>
    </li>
  );
}

function GroupRow({ group }: { group: BreakdownGroup }) {
  const [open, setOpen] = useState(false);
  const Chevron = open ? IconChevronDown : IconChevronRight;
  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-white/[0.015]"
      >
        <Chevron size={14} stroke={1.6} aria-hidden className="shrink-0 text-text-muted" />
        <TokenAvatar logo={group.logo} ticker={group.ticker} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-text-primary">{group.ticker}</span>
          <span className="mt-0.5 block font-mono text-2xs uppercase tracking-wider text-text-muted">
            {group.entries.length} distribution{group.entries.length === 1 ? '' : 's'}
          </span>
        </span>
        <span className="font-mono text-sm tabular-nums text-status-success-light">
          +{formatAmount(group.total)}
        </span>
      </button>
      {open && (
        <ul className="divide-y divide-border-subtle border-t border-border-subtle bg-surface-inset">
          {group.entries.map((e, i) => (
            <EntryRow key={i} entry={e} />
          ))}
        </ul>
      )}
    </li>
  );
}

function StateMessage({ title, message }: { title: string; message: string }) {
  return (
    <Card variant="inset" className="px-6 py-16 text-center">
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-text-muted">{message}</p>
    </Card>
  );
}

export function RewardBreakdown() {
  const stakeAddress = useWalletStore((s) => s.stakeAddress);
  const { data, isLoading, error, refetch } = useRewardBreakdown(stakeAddress);

  if (!stakeAddress) {
    return (
      <StateMessage
        title="Not connected"
        message="Connect a wallet to see where your rewards come from."
      />
    );
  }

  if (isLoading) {
    return (
      <Card role="status" aria-label="Loading reward analytics" className="space-y-3 p-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton-shimmer h-12 rounded-lg" />
        ))}
      </Card>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <FeedbackBanner tone="error" title="Couldn't load the breakdown" message={error.message} />
        <GradientButton variant="secondary" size="sm" onClick={() => refetch()}>
          Try again
        </GradientButton>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <StateMessage
        title="No breakdown data yet"
        message="Once rewards are allocated to you, their source pools and rules show up here."
      />
    );
  }

  return (
    <Card as="section" className="overflow-hidden">
      <header className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
        <div className="flex items-center gap-2">
          <p className="label-eyebrow">By source</p>
          <span className="rounded-full border border-border-subtle bg-surface-inset px-2 py-0.5 font-mono text-2xs tabular-nums text-text-secondary">
            {data.length}
          </span>
        </div>
        <p className="text-2xs text-text-muted">Largest totals first</p>
      </header>
      <ul className="divide-y divide-border-subtle">
        {data.map((group) => (
          <GroupRow key={group.token} group={group} />
        ))}
      </ul>
    </Card>
  );
}

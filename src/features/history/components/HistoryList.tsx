import { useEffect, useRef, useState } from 'react';
import { IconArrowsSort, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/common/Card';
import { FeedbackBanner } from '@/components/common/FeedbackBanner';
import { GradientButton } from '@/components/common/GradientButton';
import { useWalletStore } from '@/store/wallet-state';
import { useDeliveredRewards, type DeliveredReward } from '@/features/history/api/history.queries';
import { tokenImageSrc } from '@/shared/tokenImage';
import { useImageFallback } from '@/hooks/useImageFallback';
import { useWithdrawalHistory, type HistoryOrder } from '@/features/history/hooks/useWithdrawalHistory';

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

function TokenAvatar({ assetId, logo, ticker }: { assetId: string; logo?: string; ticker: string }) {
  const img = useImageFallback([tokenImageSrc(assetId, logo), logo]);
  if (img.src && !img.failed) {
    return (
      <img
        src={img.src}
        alt=""
        onError={img.onError}
        className="h-9 w-9 shrink-0 rounded-full border border-border-subtle bg-surface-inset object-cover"
      />
    );
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-inset font-mono text-2xs font-medium uppercase tracking-tight text-text-secondary">
      {ticker.slice(0, 3)}
    </div>
  );
}

function HistoryRow({ row }: { row: DeliveredReward }) {
  return (
    <li className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-white/[0.015]">
      <TokenAvatar assetId={row.token} logo={row.logo} ticker={row.ticker} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">{row.ticker}</p>
        <p className="mt-0.5 flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-text-muted">
          {row.epoch !== null && <span className="tabular-nums">Epoch {row.epoch}</span>}
          {row.epoch !== null && row.deliveredOn && <span className="text-text-faint">·</span>}
          {row.deliveredOn && (
            <span className="tabular-nums" title={row.deliveredOn.toLocaleString()}>
              {formatRelative(row.deliveredOn)} {formatTime(row.deliveredOn)}
            </span>
          )}
        </p>
      </div>
      <div className="text-right">
        <p className="font-mono text-sm tabular-nums text-status-success-light">
          +{formatAmount(row.amount)}
        </p>
        <p className="mt-0.5 font-mono text-2xs uppercase tracking-wider text-text-muted">
          {row.ticker}
        </p>
      </div>
    </li>
  );
}

function StateMessage({ eyebrow, message }: { eyebrow: string; message: string }) {
  return (
    <Card variant="inset" className="px-6 py-16 text-center">
      <p className="label-eyebrow">{eyebrow}</p>
      <p className="mx-auto mt-3 max-w-sm text-sm text-text-muted">{message}</p>
    </Card>
  );
}

function SkeletonList() {
  return (
    <Card role="status" aria-label="Loading claim history" className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
        <div className="skeleton-shimmer h-3 w-20 rounded" />
        <div className="skeleton-shimmer h-3 w-24 rounded" />
      </div>
      <ul className="divide-y divide-border-subtle">
        {[0, 1, 2, 3, 4].map((i) => (
          <li key={i} className="flex items-center gap-4 px-5 py-3.5">
            <div className="skeleton-shimmer h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="skeleton-shimmer h-3 w-24 rounded" />
              <div className="skeleton-shimmer h-2.5 w-32 rounded" />
            </div>
            <div className="space-y-2">
              <div className="skeleton-shimmer ml-auto h-3 w-16 rounded" />
              <div className="skeleton-shimmer ml-auto h-2.5 w-10 rounded" />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function HistoryList() {
  const stakeAddress = useWalletStore((s) => s.stakeAddress);
  const { data, isLoading, error, refetch } = useDeliveredRewards(stakeAddress);
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState(1);
  const [order, setOrder] = useState<HistoryOrder>('desc');
  const history = useWithdrawalHistory(stakeAddress, page, order);

  // First visit: the delivered-rewards fetch also syncs D1 server-side, so
  // refresh the archive query once it settles.
  const queryClient = useQueryClient();
  const invalidated = useRef(false);
  useEffect(() => {
    invalidated.current = false;
    setPage(1);
  }, [stakeAddress]);
  useEffect(() => {
    if (data && !invalidated.current) {
      invalidated.current = true;
      queryClient.invalidateQueries({ queryKey: ['history', stakeAddress] });
    }
  }, [data, queryClient, stakeAddress]);

  if (!stakeAddress) {
    return (
      <StateMessage eyebrow="Not connected" message="Connect a wallet to view your claim history." />
    );
  }

  if (isLoading) return <SkeletonList />;

  const serverMode =
    !!history.data && !history.data.degraded && history.data.total > 0;

  if (error && !serverMode) {
    return (
      <div className="space-y-3">
        <FeedbackBanner tone="error" title="Couldn't load claim history" message={error.message} />
        <GradientButton variant="secondary" size="sm" onClick={() => refetch()}>
          Try again
        </GradientButton>
      </div>
    );
  }

  if (!serverMode && (!data || data.length === 0)) {
    return <StateMessage eyebrow="No claims yet" message="Tokens you claim will appear here." />;
  }

  const totalPages = serverMode
    ? Math.max(1, Math.ceil(history.data!.total / history.data!.limit))
    : 1;
  const rows: DeliveredReward[] = serverMode
    ? history.data!.rows
    : showAll
      ? data!
      : data!.slice(0, PAGE_SIZE);
  const clientHasMore = !serverMode && !!data && data.length > rows.length;
  const count = serverMode ? history.data!.total : data!.length;

  return (
    <Card as="section" className="overflow-hidden">
      <header className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
        <div className="flex items-center gap-2">
          <p className="label-eyebrow">Delivered</p>
          <span className="rounded-full border border-border-subtle bg-surface-inset px-2 py-0.5 font-mono text-2xs tabular-nums text-text-secondary">
            {count}
          </span>
        </div>
        {serverMode ? (
          <GradientButton
            variant="ghost"
            size="sm"
            onClick={() => {
              setOrder((o) => (o === 'desc' ? 'asc' : 'desc'));
              setPage(1);
            }}
          >
            <IconArrowsSort size={14} stroke={1.6} aria-hidden />
            {order === 'desc' ? 'Newest first' : 'Oldest first'}
          </GradientButton>
        ) : (
          <p className="text-2xs text-text-muted">Most recent first</p>
        )}
      </header>

      <ul className="divide-y divide-border-subtle">
        {rows.map((row) => (
          <HistoryRow key={row.key} row={row} />
        ))}
      </ul>

      {serverMode && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border-subtle px-4 py-2">
          <GradientButton
            variant="ghost"
            size="sm"
            disabled={page <= 1 || history.isFetching}
            onClick={() => setPage((p) => p - 1)}
          >
            <IconChevronLeft size={14} stroke={2} aria-hidden /> Previous
          </GradientButton>
          <p className="font-mono text-2xs uppercase tracking-wider tabular-nums text-text-muted">
            Page {page} / {totalPages}
          </p>
          <GradientButton
            variant="ghost"
            size="sm"
            disabled={!history.data!.hasMore || history.isFetching}
            onClick={() => setPage((p) => p + 1)}
          >
            Next <IconChevronRight size={14} stroke={2} aria-hidden />
          </GradientButton>
        </div>
      )}

      {clientHasMore && (
        <div className="border-t border-border-subtle px-4 py-2 text-center">
          <GradientButton variant="ghost" size="sm" onClick={() => setShowAll(true)}>
            Show {data!.length - rows.length} more
          </GradientButton>
        </div>
      )}
    </Card>
  );
}

import { useQuery } from '@tanstack/react-query';
import { IconClock } from '@tabler/icons-react';
import { apiClient } from '@/api/client';
import { DEPLOYMENT_NETWORK } from '@/config/network';

interface QueueResponse {
  pending_tx_count: number;
}

const POLL_INTERVAL_MS = 60_000;

function useQueueCount() {
  return useQuery<QueueResponse, Error>({
    queryKey: ['queue', 'pending_tx_count', DEPLOYMENT_NETWORK],
    queryFn: () => apiClient.get<QueueResponse>('/api/getQueue'),
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    staleTime: POLL_INTERVAL_MS,
  });
}

export function QueueCount() {
  const { data, isLoading, error } = useQueueCount();

  if (isLoading || error || !data) {
    return null;
  }

  const count = data.pending_tx_count;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-raised px-2.5 py-1 text-2xs font-medium text-text-secondary"
      title="Pending withdrawal transactions across the platform"
    >
      <IconClock size={12} stroke={1.8} className="text-text-muted" />
      <span className="tabular-nums text-text-primary">{count.toLocaleString()}</span>
      <span className="text-text-muted">
        {count === 1 ? 'transaction queued' : 'transactions queued'}
      </span>
    </span>
  );
}

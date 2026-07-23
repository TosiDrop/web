import { useQuery } from '@tanstack/react-query';
import { IconClock } from '@tabler/icons-react';
import { apiClient } from '@/api/client';
import { useNetworkStore } from '@/store/network-state';

interface QueueResponse {
  pending_tx_count: number;
}

const POLL_INTERVAL_MS = 60_000;

function useQueueCount() {
  const network = useNetworkStore((s) => s.selectedNetwork);
  return useQuery<QueueResponse, Error>({
    queryKey: ['queue', 'pending_tx_count', network],
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
  const label = count === 1 ? 'tx in queue' : 'tx in queue';

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-raised px-2.5 py-1 text-[11px] font-medium text-slate-300"
      title="Pending withdrawal transactions across the platform"
    >
      <IconClock size={12} stroke={1.8} className="text-slate-400" />
      <span className="tabular-nums text-white">{count.toLocaleString()}</span>
      <span className="text-slate-400">{label}</span>
    </span>
  );
}

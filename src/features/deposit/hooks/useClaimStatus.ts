import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { DEPLOYMENT_NETWORK } from '@/config/network';
import { explorerTxUrl } from '@/utils/format';

export type ClaimStatusKind = 'waiting' | 'processing' | 'success' | 'failure';

export interface ClaimStatus {
  kind: ClaimStatusKind;
  txHash?: string;
  reason?: string;
}

interface UseClaimStatusArgs {
  request_id: string | null;
  staking_address: string | null;
  enabled?: boolean;
  pollIntervalMs?: number;
}

export interface UseClaimStatusResult {
  status: ClaimStatus | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
  txExplorerUrl: string | null;
  isTerminal: boolean;
}

const DEFAULT_INTERVAL_MS = 60_000;

function isTerminalStatus(status: ClaimStatus | undefined): boolean {
  return status?.kind === 'success' || status?.kind === 'failure';
}

export function useClaimStatus({
  request_id,
  staking_address,
  enabled = true,
  pollIntervalMs = DEFAULT_INTERVAL_MS,
}: UseClaimStatusArgs): UseClaimStatusResult {
  const ready = !!request_id && !!staking_address && enabled;

  const query = useQuery<ClaimStatus, Error>({
    queryKey: ['claim-status', request_id, staking_address, DEPLOYMENT_NETWORK],
    queryFn: async () => {
      if (!request_id || !staking_address) {
        throw new Error('request_id and staking_address are required');
      }
      const params = new URLSearchParams({
        requestId: request_id,
        stakeAddress: staking_address,
      });
      return apiClient.get<ClaimStatus>(`/api/claim/status?${params.toString()}`);
    },
    enabled: ready,
    refetchInterval: (q) => {
      if (isTerminalStatus(q.state.data)) return false;
      return pollIntervalMs;
    },
    refetchOnWindowFocus: false,
    staleTime: 0,
    gcTime: 0,
  });

  const status = query.data;
  const txExplorerUrl =
    status?.kind === 'success' && status.txHash
      ? explorerTxUrl(status.txHash)
      : null;

  return {
    status,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    txExplorerUrl,
    isTerminal: isTerminalStatus(status),
  };
}

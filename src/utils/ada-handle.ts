import { apiClient } from '@/api/client';

/**
 * Returns true if the input looks like an ADA handle ($name).
 */
export function isAdaHandle(input: string): boolean {
  return input.startsWith('$') && input.length > 1;
}

/**
 * Resolve an ADA handle (e.g. "$wolf31o2") to a stake address.
 * Calls our backend which proxies to Koios (avoids CORS). Routed through
 * apiClient so the selected network is sent as a query param.
 */
export async function resolveAdaHandle(handle: string): Promise<string> {
  const data = await apiClient.get<{ stakeAddress: string }>(
    `/api/resolveHandle?handle=${encodeURIComponent(handle)}`,
  );
  return data.stakeAddress;
}

/**
 * Returns true if the input looks like an ADA handle ($name).
 */
export function isAdaHandle(input: string): boolean {
  return input.startsWith('$') && input.length > 1;
}

/**
 * Resolve an ADA handle (e.g. "$wolf31o2") to a stake address.
 * Calls our backend which proxies to Koios (avoids CORS).
 */
export async function resolveAdaHandle(handle: string): Promise<string> {
  const res = await fetch(
    `/api/resolveHandle?handle=${encodeURIComponent(handle)}`
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || `Handle resolution failed (${res.status})`);
  }

  const data = await res.json() as { stakeAddress: string };
  return data.stakeAddress;
}

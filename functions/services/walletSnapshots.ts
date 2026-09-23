import type { Env } from '../types/env';

export function persistWalletSnapshot(
  env: Env,
  network: string,
  stakeAddress: string,
  observedAt: number,
  payload: unknown,
): Promise<unknown> | null {
  if (!env.DB) return null;
  return env.DB.prepare(
    'INSERT INTO wallet_snapshots (network, stake_address, observed_at, payload) VALUES (?, ?, ?, ?) ' +
    'ON CONFLICT(network, stake_address) DO UPDATE SET observed_at = excluded.observed_at, payload = excluded.payload ' +
      'WHERE excluded.observed_at >= wallet_snapshots.observed_at',
  )
    .bind(network, stakeAddress, observedAt, JSON.stringify(payload))
    .run();
}

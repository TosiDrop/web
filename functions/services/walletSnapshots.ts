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
      'ON CONFLICT(network, stake_address, observed_at) DO UPDATE SET payload = excluded.payload',
  )
    .bind(network, stakeAddress, observedAt, JSON.stringify(payload))
    .run();
}

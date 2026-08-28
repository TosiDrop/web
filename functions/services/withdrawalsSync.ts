// Builds append-only upserts from the VM API's delivered-rewards payload.
// Mirrors the client-side parseDeliveredOn heuristic in
// src/features/history/api/history.queries.ts.
export interface VmDeliveredReward {
  id: string;
  token: string;
  amount: string | number;
  epoch?: string | number;
  delivered_on: string | number;
  withdrawal_request?: string;
}

export function toUnixSeconds(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isNaN(n) && n > 1_000_000_000 && n < 10_000_000_000) return Math.floor(n);
  const t = Date.parse(raw);
  return Number.isNaN(t) ? null : Math.floor(t / 1000);
}

export function buildWithdrawalUpserts(
  db: D1Database,
  stakeAddress: string,
  rows: unknown,
): D1PreparedStatement[] {
  if (!Array.isArray(rows)) return [];
  const stmts: D1PreparedStatement[] = [];
  for (const raw of rows as Partial<VmDeliveredReward>[]) {
    if (!raw || typeof raw.id !== 'string' || !raw.id || typeof raw.token !== 'string') continue;
    const epochNum = Number(raw.epoch);
    const deliveredOn = String(raw.delivered_on ?? '');
    const deliveredAt = deliveredOn.trim() ? toUnixSeconds(deliveredOn) : null;
    const amount = raw.amount as unknown;
    const amountString = String(amount ?? '');
    const amountNum = Number(amountString);
    if (
      deliveredAt === null ||
      amount === null ||
      amount === undefined ||
      amountString.trim() === '' ||
      !Number.isFinite(amountNum)
    ) {
      continue;
    }
    stmts.push(
      db
        .prepare(
          'INSERT INTO withdrawals (stake_address, reward_id, token, amount, epoch, delivered_on, delivered_at, withdrawal_request) ' +
            'VALUES (?, ?, ?, ?, ?, ?, ?, ?) ' +
            'ON CONFLICT (stake_address, reward_id) DO NOTHING',
        )
        .bind(
          stakeAddress,
          raw.id,
          raw.token,
          amountString,
          Number.isNaN(epochNum) ? null : epochNum,
          deliveredOn,
          deliveredAt,
          raw.withdrawal_request ?? null,
        ),
    );
  }
  return stmts;
}

import type { Env } from '../types/env';
import type { Network } from '../../src/shared/network';
import { hasDb } from './d1';
import { vmGet } from './vmClient';

type MonetaryValue = string | number | null | undefined;

export interface ClaimQuote {
  requestId: string;
  stakeAddress: string;
  network: Network;
  tokenCount: number;
  deposit: string | number;
  withdrawalFee?: MonetaryValue;
  tokensFee?: MonetaryValue;
  txFee?: MonetaryValue;
  overheadFee?: MonetaryValue;
}

function monetaryText(value: MonetaryValue): string | null {
  return value === null || value === undefined ? null : String(value);
}

export async function persistClaimQuote(
  db: D1Database,
  quote: ClaimQuote,
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO claim_requests ' +
        '(request_id, stake_address, network, token_count, deposit, withdrawal_fee, tokens_fee, tx_fee, overhead_fee) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ' +
        'ON CONFLICT (network, request_id) DO NOTHING',
    )
    .bind(
      quote.requestId,
      quote.stakeAddress,
      quote.network,
      quote.tokenCount,
      String(quote.deposit),
      monetaryText(quote.withdrawalFee),
      monetaryText(quote.tokensFee),
      monetaryText(quote.txFee),
      monetaryText(quote.overheadFee),
    )
    .run();
}

export type AcceptedClaim = Omit<ClaimQuote, 'withdrawalFee' | 'tokensFee' | 'txFee'>;

/**
 * Records an accepted claim for fee analytics without touching the claim
 * response: the fee lookup and the D1 write run under waitUntil. A failed fee
 * lookup still records the claim (with null components) so coverage reports
 * "tracked but fees unknown" instead of losing the row.
 */
export function recordClaimQuote(
  env: Env,
  waitUntil: (promise: Promise<unknown>) => void,
  claim: AcceptedClaim,
): void {
  if (!hasDb(env)) return;
  const db = env.DB;
  waitUntil(
    (async () => {
      let fees: { withdrawal_fee?: MonetaryValue; tokens_fee?: MonetaryValue; fee?: MonetaryValue } = {};
      try {
        fees = (await vmGet(env, 'estimate_fees', { token_count: claim.tokenCount })) as typeof fees;
      } catch (error) {
        console.error('claim fee quote error:', error);
      }
      try {
        await persistClaimQuote(db, {
          ...claim,
          withdrawalFee: fees.withdrawal_fee,
          tokensFee: fees.tokens_fee,
          txFee: fees.fee,
        });
      } catch (error) {
        console.error('claim quote persistence error:', error);
      }
    })(),
  );
}

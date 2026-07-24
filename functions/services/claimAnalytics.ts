import type { VmNetwork } from './vmClient';

type MonetaryValue = string | number | null | undefined;

export interface ClaimQuote {
  requestId: string;
  stakeAddress: string;
  network: VmNetwork;
  tokenCount: number;
  deposit: string | number;
  withdrawalFee?: MonetaryValue;
  tokensFee?: MonetaryValue;
  txFee?: MonetaryValue;
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
        '(request_id, stake_address, network, token_count, deposit, withdrawal_fee, tokens_fee, tx_fee) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?) ' +
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
    )
    .run();
}

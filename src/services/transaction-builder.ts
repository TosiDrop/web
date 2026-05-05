/**
 * Transaction-builder seam.
 *
 * Lets us swap the underlying Cardano tx-building library without touching
 * callers. The current implementation is Mesh client-side
 * (see `mesh-transaction-builder.ts`); a future Blaze server-side impl can
 * satisfy the same contract.
 */

export interface TransferParams {
  /** Bech32 sender address (changeAddress for the wallet). */
  fromAddress: string;
  /** Bech32 receiver address. */
  toAddress: string;
  /** Amount to transfer in lovelace. */
  amount: bigint;
}

/** Hex-encoded CBOR of the unsigned transaction, ready to be signed by a wallet. */
export type UnsignedTx = string;

export interface TransactionBuilder {
  buildTransfer(params: TransferParams): Promise<UnsignedTx>;
}

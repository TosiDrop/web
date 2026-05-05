import { Transaction, type IInitiator } from '@meshsdk/core';
import type {
  TransactionBuilder,
  TransferParams,
  UnsignedTx,
} from './transaction-builder';

/**
 * Mesh-backed `TransactionBuilder`. The connected wallet supplies UTxOs,
 * coin selection, and fee estimation; we just describe the transfer.
 *
 * Note: `fromAddress` is part of the interface for parity with future
 * server-side builders, but Mesh derives the sender from the wallet itself.
 */
export function createMeshTransactionBuilder(wallet: unknown): TransactionBuilder {
  return {
    async buildTransfer({ toAddress, amount }: TransferParams): Promise<UnsignedTx> {
      if (!toAddress) throw new Error('Missing toAddress');
      if (amount <= 0n) throw new Error('Invalid transfer amount');

      const tx = new Transaction({ initiator: wallet as IInitiator }).sendLovelace(
        toAddress,
        amount.toString(),
      );
      return tx.build();
    },
  };
}

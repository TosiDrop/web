import { Transaction, type IInitiator } from '@meshsdk/core';
import type {
  TransactionBuilder,
  TransferParams,
  UnsignedTx,
} from './transaction-builder';

/**
 * Mesh-backed `TransactionBuilder`. The connected wallet supplies UTxOs,
 * coin selection, and fee estimation — we just describe the transfer.
 */
export function createMeshTransactionBuilder(wallet: IInitiator): TransactionBuilder {
  return {
    async buildTransfer({ toAddress, amount }: TransferParams): Promise<UnsignedTx> {
      if (!toAddress) throw new Error('Missing toAddress');
      if (amount <= 0n) throw new Error('Invalid transfer amount');

      const tx = new Transaction({ initiator: wallet }).sendLovelace(
        toAddress,
        amount.toString(),
      );
      return tx.build();
    },
  };
}

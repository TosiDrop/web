import { Transaction, type IInitiator } from '@meshsdk/core';
import type {
  TransactionBuilder,
  TransferParams,
  UnsignedTx,
} from './transaction-builder';

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

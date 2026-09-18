import { Transaction, type IInitiator, type UTxO } from '@meshsdk/core';
import type {
  TransactionBuilder,
  TransferParams,
  DelegationParams,
  UnsignedTx,
} from './transaction-builder';

/**
 * @meshsdk/react's current wallet wrapper exposes the CIP-30 methods as CBOR
 * while its Mesh helpers expose the UTxO shape consumed by @meshsdk/core's
 * Transaction builder. Keep this compatibility surface at the SDK boundary;
 * passing the raw wrapper through makes Transaction read `output.address` from
 * a CBOR string and fail with an unhelpful undefined-property error.
 */
export interface MeshWalletInitiator extends IInitiator {
  getUtxosMesh?: () => Promise<UTxO[]>;
  getCollateralMesh?: () => Promise<UTxO[]>;
  getChangeAddressBech32?: () => Promise<string>;
}

export function adaptMeshWalletInitiator(wallet: MeshWalletInitiator): IInitiator {
  return {
    getChangeAddress: () => wallet.getChangeAddressBech32?.() ?? wallet.getChangeAddress(),
    getUtxos: () => wallet.getUtxosMesh?.() ?? wallet.getUtxos(),
    getCollateral: () => wallet.getCollateralMesh?.() ?? wallet.getCollateral(),
  };
}

export function createMeshTransactionBuilder(wallet: MeshWalletInitiator): TransactionBuilder {
  const initiator = adaptMeshWalletInitiator(wallet);
  return {
    async buildTransfer({ toAddress, amount }: TransferParams): Promise<UnsignedTx> {
      if (!toAddress) throw new Error('Missing toAddress');
      if (amount <= 0n) throw new Error('Invalid transfer amount');

      const tx = new Transaction({ initiator }).sendLovelace(
        toAddress,
        amount.toString(),
      );
      return tx.build();
    },
    async buildDelegation({ rewardAddress, poolId, registered }: DelegationParams): Promise<UnsignedTx> {
      if (!rewardAddress.startsWith('stake')) throw new Error('Invalid reward address');
      if (!poolId.startsWith('pool') && !/^[0-9a-f]{56}$/i.test(poolId)) {
        throw new Error('Invalid stake pool ID');
      }

      const tx = new Transaction({ initiator });
      if (!registered) tx.registerStake(rewardAddress);
      tx.delegateStake(rewardAddress, poolId);
      return tx.build();
    },
  };
}

import { useCallback } from 'react';
import { useWallet } from '@meshsdk/react';
import { Transaction, type IInitiator } from '@meshsdk/core';

export interface SendDepositArgs {
  toAddress: string;
  lovelace: number;
}

export interface UseWalletDepositResult {
  sendDeposit: (args: SendDepositArgs) => Promise<string>;
  canSend: boolean;
}

// Conservative pad covering tx fee + min-UTxO for the change output. Real tx
// fees on mainnet are typically <0.2 ADA; 2 ADA gives a safe buffer so the
// preflight error only trips when the wallet truly cannot cover the send.
const TX_FEE_BUFFER_LOVELACE = 2_000_000;

export function useWalletDeposit(): UseWalletDepositResult {
  const { wallet, connected } = useWallet();

  const sendDeposit = useCallback(
    async ({ toAddress, lovelace }: SendDepositArgs): Promise<string> => {
      if (!wallet) throw new Error('Wallet not connected');
      if (!toAddress) throw new Error('Missing deposit address');
      if (!Number.isFinite(lovelace) || lovelace <= 0) {
        throw new Error('Invalid deposit amount');
      }

      // The react wallet type re-exports a stripped view of MeshCardanoBrowserWallet
      // that omits `getLovelace`, even though the runtime has it (see @meshsdk/wallet
      // index.d.ts). Narrow the type for this single helper call.
      const getLovelace = (wallet as unknown as { getLovelace?: () => Promise<string> }).getLovelace;
      if (getLovelace) {
        const walletLovelace = Number(await getLovelace.call(wallet));
        const required = lovelace + TX_FEE_BUFFER_LOVELACE;
        if (Number.isFinite(walletLovelace) && walletLovelace < required) {
          const shortfall = ((required - walletLovelace) / 1_000_000).toFixed(2);
          throw new Error(
            `Insufficient balance. Need ~${shortfall} more ADA to cover deposit and fees.`,
          );
        }
      }

      // @meshsdk/react (beta.2) and @meshsdk/transaction ship slightly
      // different getCollateral() signatures. The wallet satisfies the runtime
      // contract of IInitiator, so cast at the boundary.
      const tx = new Transaction({ initiator: wallet as unknown as IInitiator }).sendLovelace(
        toAddress,
        String(Math.floor(lovelace)),
      );
      const unsignedTx = await tx.build();
      const signedTx = await wallet.signTx(unsignedTx, false);
      return wallet.submitTx(signedTx);
    },
    [wallet],
  );

  return { sendDeposit, canSend: connected && !!wallet };
}

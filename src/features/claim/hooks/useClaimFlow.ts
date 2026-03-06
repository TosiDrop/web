import { useState, useCallback } from 'react';
import { useWallet } from '@meshsdk/react';
import { useQueryClient } from '@tanstack/react-query';
import { useWalletStore } from '@/store/wallet-state';
import { useClaimValidate, useClaimSubmit, useClaimSubmitTx } from '../api/claim.queries';
import type { ClaimFlowStep } from '@/types/claim';

export function useClaimFlow() {
  const { wallet } = useWallet();
  const stakeAddress = useWalletStore((s) => s.stakeAddress);
  const queryClient = useQueryClient();
  const [state, setState] = useState<ClaimFlowStep>({ step: 'idle' });

  const validateMutation = useClaimValidate();
  const submitMutation = useClaimSubmit();
  const submitTxMutation = useClaimSubmitTx();

  const startClaim = useCallback(
    async (assets: string[]) => {
      if (!stakeAddress || !wallet) {
        setState({ step: 'error', message: 'Wallet not connected' });
        return;
      }

      try {
        setState({ step: 'validating' });
        const validation = await validateMutation.mutateAsync({
          stakeAddress,
          assets,
        });

        if (!validation.valid) {
          setState({ step: 'error', message: validation.error || 'Claim validation failed' });
          return;
        }

        const submitResult = await submitMutation.mutateAsync({
          stakeAddress,
          assets,
          airdropHash: validation.airdropHash,
        });

        setState({ step: 'signing', unsignedTx: submitResult.unsignedTx });
        const signedTx = await wallet.signTx(submitResult.unsignedTx, false);

        setState({ step: 'submitting' });
        const txResult = await submitTxMutation.mutateAsync({
          signedTx,
          airdropHash: submitResult.airdropHash,
        });

        setState({ step: 'completed', txHash: txResult.txHash });
        queryClient.invalidateQueries({ queryKey: ['rewards', stakeAddress] });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setState({ step: 'error', message });
      }
    },
    [stakeAddress, wallet, validateMutation, submitMutation, submitTxMutation, queryClient]
  );

  const reset = useCallback(() => {
    setState({ step: 'idle' });
  }, []);

  return { state, startClaim, reset };
}

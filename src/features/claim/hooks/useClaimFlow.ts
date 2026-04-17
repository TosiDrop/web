import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/types/api';
import { useWalletStore } from '@/store/wallet-state';
import { useClaimCreate, useClaimStatus } from '../api/claim.queries';
import { useWalletDeposit } from './useWalletDeposit';
import type { ClaimFlowStep } from '@/types/claim';

interface UseClaimFlowOptions {
  pollIntervalMs?: number;
}

function friendlyError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error !== null && 'info' in error) {
    const info = (error as { info?: unknown }).info;
    if (typeof info === 'string') return info;
  }
  return fallback;
}

export function useClaimFlow(options: UseClaimFlowOptions = {}) {
  const stakeAddress = useWalletStore((s) => s.stakeAddress);
  const queryClient = useQueryClient();
  const [state, setState] = useState<ClaimFlowStep>({ step: 'idle' });
  const inFlight = useRef(false);

  const { mutateAsync: createAsync } = useClaimCreate();
  const { sendDeposit, canSend } = useWalletDeposit();

  const requestId = 'info' in state ? state.info.requestId : null;
  const polling = state.step === 'polling';

  const statusQuery = useClaimStatus({
    requestId,
    stakeAddress,
    enabled: polling,
    refetchIntervalMs: options.pollIntervalMs,
  });

  useEffect(() => {
    const data = statusQuery.data;
    if (!data) return;

    setState((s) => {
      if (s.step !== 'polling') return s;
      if (data.kind === 'success') {
        return { step: 'success', info: s.info, txHash: data.txHash || s.txHash || '' };
      }
      if (data.kind === 'failure') {
        return { step: 'error', message: data.reason };
      }
      if (data.kind === 'processing' && data.txHash && data.txHash !== s.txHash) {
        return { step: 'polling', info: s.info, txHash: data.txHash };
      }
      return s;
    });
  }, [statusQuery.data]);

  useEffect(() => {
    if (state.step === 'success') {
      queryClient.invalidateQueries({ queryKey: ['rewards', stakeAddress] });
    }
  }, [state.step, queryClient, stakeAddress]);

  const startClaim = useCallback(
    async (assetIds: string[]) => {
      if (inFlight.current) return;
      if (!stakeAddress) {
        setState({ step: 'error', message: 'Connect a wallet to start a claim' });
        return;
      }
      if (!assetIds.length) {
        setState({ step: 'error', message: 'Select at least one reward' });
        return;
      }

      // Drop any cached status data from a prior claim so stale success/failure
      // results cannot bleed into this fresh attempt if the backend reuses ids.
      queryClient.removeQueries({ queryKey: ['claim-status'] });

      inFlight.current = true;
      try {
        setState({ step: 'creating' });
        const info = await createAsync({ stakeAddress, assetIds });
        setState({ step: 'awaiting_deposit', info });
      } catch (error) {
        setState({
          step: 'error',
          message: friendlyError(error, 'Could not create claim request. Please try again.'),
        });
      } finally {
        inFlight.current = false;
      }
    },
    [stakeAddress, createAsync, queryClient],
  );

  const sendDepositFromWallet = useCallback(async () => {
    if (inFlight.current) return;
    if (state.step !== 'awaiting_deposit') return;
    if (!canSend) {
      setState({ step: 'error', message: 'Connect a wallet to send the deposit' });
      return;
    }

    const { info } = state;
    inFlight.current = true;
    try {
      setState({ step: 'signing', info });
      const txHash = await sendDeposit({
        toAddress: info.withdrawalAddress,
        lovelace: info.deposit + info.overheadFee,
      });
      setState({ step: 'polling', info, txHash });
    } catch (error) {
      setState({
        step: 'error',
        message: friendlyError(error, 'Wallet rejected or failed to broadcast the deposit.'),
      });
    } finally {
      inFlight.current = false;
    }
  }, [state, canSend, sendDeposit]);

  const markDepositedExternally = useCallback(() => {
    setState((s) => (s.step === 'awaiting_deposit' ? { step: 'polling', info: s.info } : s));
  }, []);

  const reset = useCallback(() => {
    queryClient.removeQueries({ queryKey: ['claim-status'] });
    setState({ step: 'idle' });
  }, [queryClient]);

  return {
    state,
    startClaim,
    sendDepositFromWallet,
    markDepositedExternally,
    reset,
    canSendFromWallet: canSend,
  };
}

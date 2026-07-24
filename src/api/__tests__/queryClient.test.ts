import { afterEach, describe, expect, it } from 'vitest';
import { queryClient } from '@/api/queryClient';
import { useNetworkStore } from '@/store/network-state';
import { useClaimStore } from '@/store/claim-state';

const initialClaimState = useClaimStore.getState();

describe('queryClient network subscription', () => {
  afterEach(() => {
    useNetworkStore.setState({ selectedNetwork: 'mainnet' });
    useClaimStore.setState(initialClaimState, true);
    queryClient.clear();
  });

  it('resets claim state and clears cache when network switches', () => {
    // Seed state: set network to 'preview' (baseline)
    useNetworkStore.getState().setNetwork('preview');

    // Seed claim store with lookupAddress, selection, and initializedFor
    const claimState = useClaimStore.getState();
    claimState.setLookupAddress('stake1uxabc');
    claimState.initSelectionFor('stake1uxabc', ['asset1', 'asset2']);
    claimState.setSelected(['asset1']);

    // Prime the query cache
    queryClient.setQueryData(['pools', 'preview'], [{ id: 'x' }]);

    // Verify baseline state before switch
    expect(useNetworkStore.getState().selectedNetwork).toBe('preview');
    expect(useClaimStore.getState().lookupAddress).toBe('stake1uxabc');
    expect(useClaimStore.getState().selectedAssetIds).toEqual(['asset1']);
    expect(useClaimStore.getState().initializedFor).toBe('stake1uxabc');
    expect(queryClient.getQueryData(['pools', 'preview'])).toEqual([{ id: 'x' }]);

    // Trigger the switch to mainnet (differs from baseline 'preview')
    useNetworkStore.getState().setNetwork('mainnet');

    // Assert subscription ran: claim state reset and cache cleared
    expect(useClaimStore.getState().selectedAssetIds).toEqual([]);
    expect(useClaimStore.getState().lookupAddress).toBeNull();
    expect(useClaimStore.getState().initializedFor).toBeNull();
    expect(queryClient.getQueryData(['pools', 'preview'])).toBeUndefined();
  });
});

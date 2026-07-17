import { beforeEach, describe, expect, it } from 'vitest';
import { useClaimStore } from '@/store/claim-state';

const initialState = useClaimStore.getState();

beforeEach(() => {
  useClaimStore.setState(initialState, true);
});

describe('claim store lookup state', () => {
  it('stores the lookup address', () => {
    useClaimStore.getState().setLookupAddress('stake1uxabc');
    expect(useClaimStore.getState().lookupAddress).toBe('stake1uxabc');
  });

  it('clears the lookup address with null', () => {
    useClaimStore.getState().setLookupAddress('stake1uxabc');
    useClaimStore.getState().setLookupAddress(null);
    expect(useClaimStore.getState().lookupAddress).toBeNull();
  });
});

describe('initSelectionFor', () => {
  it('initializes selection for a new address', () => {
    useClaimStore.getState().initSelectionFor('stake1uxabc', ['a', 'b']);
    expect(useClaimStore.getState().selectedAssetIds).toEqual(['a', 'b']);
  });

  it('does not overwrite user deselections for the same address', () => {
    useClaimStore.getState().initSelectionFor('stake1uxabc', ['a', 'b']);
    useClaimStore.getState().setSelected(['a']);
    useClaimStore.getState().initSelectionFor('stake1uxabc', ['a', 'b']);
    expect(useClaimStore.getState().selectedAssetIds).toEqual(['a']);
  });

  it('re-initializes when the address changes', () => {
    useClaimStore.getState().initSelectionFor('stake1uxabc', ['a', 'b']);
    useClaimStore.getState().setSelected([]);
    useClaimStore.getState().initSelectionFor('stake1uxdef', ['c']);
    expect(useClaimStore.getState().selectedAssetIds).toEqual(['c']);
  });

  it('re-initializes when returning to a previous address', () => {
    useClaimStore.getState().initSelectionFor('stake1uxabc', ['a']);
    useClaimStore.getState().initSelectionFor('stake1uxdef', ['c']);
    useClaimStore.getState().initSelectionFor('stake1uxabc', ['a']);
    expect(useClaimStore.getState().selectedAssetIds).toEqual(['a']);
  });
});

describe('reset', () => {
  it('clears selection, request, and init bookkeeping but keeps lookupAddress', () => {
    const s = useClaimStore.getState();
    s.setLookupAddress('stake1uxabc');
    s.initSelectionFor('stake1uxabc', ['a']);
    s.setRequest({ requestId: 'r1', deposit: 3, withdrawalAddress: 'addr1' });
    s.reset();
    const after = useClaimStore.getState();
    expect(after.selectedAssetIds).toEqual([]);
    expect(after.request).toBeNull();
    expect(after.initializedFor).toBeNull();
    expect(after.lookupAddress).toBe('stake1uxabc');
  });

  it('allows re-initialization after reset (post-claim return to ClaimPage)', () => {
    const s = useClaimStore.getState();
    s.initSelectionFor('stake1uxabc', ['a', 'b']);
    s.setSelected(['a']);
    s.reset();
    useClaimStore.getState().initSelectionFor('stake1uxabc', ['a', 'b']);
    expect(useClaimStore.getState().selectedAssetIds).toEqual(['a', 'b']);
  });
});

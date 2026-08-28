# Claim-Store Lookup Sharing (#177) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Share the claim lookup address (and selection initialization) through the claim Zustand store so any claim-workflow consumer knows which address rewards were fetched for — without copying TanStack Query server state into Zustand.

**Architecture:** `src/store/claim-state.ts` gains `lookupAddress`, `setLookupAddress`, and `initSelectionFor(address, assetIds)` (replacing ClaimPage's `initializedFor` ref). ClaimPage drops its local `useState`/`useRef` and reads the store. `useRewards` stays a pure TanStack Query hook.

**Tech Stack:** Zustand 5, TanStack Query, Vitest (jsdom), React 18.

## Global Constraints

- Branch: `feat/claim-store-lookup` (stacked on `feat/quiet-dark-redesign`, PR base = that branch).
- Never add `Co-Authored-By` trailers to commits.
- Existing suite (125 tests) must stay green: `npm test`.
- `npm run build` (tsc + vite) must pass before the PR.
- `reset()` clears claim-transaction state (`selectedAssetIds`, `request`, `initializedFor`) but NOT `lookupAddress` — DepositPage calls `reset()` after a claim and the user's address view must survive.

---

### Task 1: Store — `lookupAddress` + `initSelectionFor`

**Files:**
- Test: `src/store/__tests__/claim-state.test.ts` (create)
- Modify: `src/store/claim-state.ts`

**Interfaces:**
- Produces (Task 2 relies on these exact names):
  - `lookupAddress: string | null`
  - `setLookupAddress(address: string | null): void`
  - `initSelectionFor(address: string, assetIds: string[]): void` — sets `selectedAssetIds = assetIds` only when `address` differs from the last initialized address; no-op otherwise
  - `initializedFor: string | null` (internal bookkeeping, cleared by `reset()`)

- [ ] **Step 1: Write the failing tests**

```ts
// src/store/__tests__/claim-state.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/store/__tests__/claim-state.test.ts`
Expected: FAIL — `setLookupAddress is not a function` (and similar for `initSelectionFor`).

- [ ] **Step 3: Implement the store changes**

Replace the `ClaimState` interface and store body in `src/store/claim-state.ts`:

```ts
import { create } from 'zustand';

export interface ClaimRequestInfo {
  requestId: string;
  deposit: number;
  withdrawalAddress: string;
}

interface ClaimState {
  selectedAssetIds: string[];
  request: ClaimRequestInfo | null;
  lookupAddress: string | null;
  initializedFor: string | null;

  setSelected: (ids: string[]) => void;
  toggleAsset: (id: string) => void;
  setRequest: (info: ClaimRequestInfo) => void;
  setLookupAddress: (address: string | null) => void;
  initSelectionFor: (address: string, assetIds: string[]) => void;
  reset: () => void;
}

export const useClaimStore = create<ClaimState>((set) => ({
  selectedAssetIds: [],
  request: null,
  lookupAddress: null,
  initializedFor: null,

  setSelected: (selectedAssetIds) => set({ selectedAssetIds }),
  toggleAsset: (id) =>
    set((s) => ({
      selectedAssetIds: s.selectedAssetIds.includes(id)
        ? s.selectedAssetIds.filter((x) => x !== id)
        : [...s.selectedAssetIds, id],
    })),
  setRequest: (request) => set({ request }),
  setLookupAddress: (lookupAddress) => set({ lookupAddress }),
  initSelectionFor: (address, assetIds) =>
    set((s) =>
      s.initializedFor === address
        ? s
        : { initializedFor: address, selectedAssetIds: assetIds },
    ),
  reset: () => set({ selectedAssetIds: [], request: null, initializedFor: null }),
}));
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/store/__tests__/claim-state.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all existing tests still pass (125 + 8 new).

- [ ] **Step 6: Commit**

```bash
git add src/store/claim-state.ts src/store/__tests__/claim-state.test.ts
git commit -m "feat(claim): lookup address and selection init in claim store (#177)"
```

---

### Task 2: ClaimPage reads the store

**Files:**
- Modify: `src/pages/ClaimPage.tsx`

**Interfaces:**
- Consumes from Task 1: `lookupAddress`, `setLookupAddress`, `initSelectionFor` on `useClaimStore`.
- Produces: no new interfaces; ClaimPage behavior is unchanged from the user's perspective.

- [ ] **Step 1: Replace local state with store selectors**

In `src/pages/ClaimPage.tsx`, the component currently holds (near the top of `ClaimPage()`):

```ts
const [lookupAddress, setLookupAddress] = useState<string | null>(null);
const [resolving, setResolving] = useState(false);
const [resolveError, setResolveError] = useState<string | null>(null);
const initializedFor = useRef<string | null>(null);
```

Change to (keep `resolving`/`resolveError` as local state):

```ts
const lookupAddress = useClaimStore((s) => s.lookupAddress);
const setLookupAddress = useClaimStore((s) => s.setLookupAddress);
const initSelectionFor = useClaimStore((s) => s.initSelectionFor);
const [resolving, setResolving] = useState(false);
const [resolveError, setResolveError] = useState<string | null>(null);
```

- [ ] **Step 2: Replace the selection-init effect**

Current:

```ts
useEffect(() => {
  if (!rewards || !lookupAddress) return;
  if (initializedFor.current === lookupAddress) return;
  initializedFor.current = lookupAddress;
  setSelected(rewards.map((r) => r.assetId));
}, [rewards, lookupAddress, setSelected]);
```

New:

```ts
useEffect(() => {
  if (!rewards || !lookupAddress) return;
  initSelectionFor(lookupAddress, rewards.map((r) => r.assetId));
}, [rewards, lookupAddress, initSelectionFor]);
```

- [ ] **Step 3: Simplify handleLookup**

In `handleLookup`, the `else` branch currently does:

```ts
initializedFor.current = null;
setLookupAddress(resolved);
```

Remove the `initializedFor.current = null;` line (the store re-initializes on address change automatically). Keep the rest of `handleLookup` and its dependency array unchanged.

- [ ] **Step 4: Clean up imports**

`useRef` was only used for `initializedFor` — remove it from the React import line, leaving:

```ts
import { useState, useEffect, useCallback } from 'react';
```

- [ ] **Step 5: Typecheck, test, and verify behavior**

Run: `npm run build` — Expected: no TS errors (TS6133 on `useRef` would mean Step 4 was missed).
Run: `npm test` — Expected: all pass.

Behavior check (dev server via the project run approach, or reasoned walkthrough if no wallet available): connect flow still initializes all rewards selected; deselecting a token and refetching the same address does not restore it; looking up a different stake address re-selects everything; returning from DepositPage after a claim re-initializes selection.

- [ ] **Step 6: Commit**

```bash
git add src/pages/ClaimPage.tsx
git commit -m "refactor(claim): ClaimPage reads lookup state from claim store (#177)"
```

---

### Task 3: Push and open the stacked PR

**Files:** none (git/GitHub only)

- [ ] **Step 1: Push the branch**

```bash
git push -u origin feat/claim-store-lookup
```

- [ ] **Step 2: Open the PR (base = the redesign branch, not main)**

```bash
gh pr create --repo TosiDrop/web \
  --base feat/quiet-dark-redesign \
  --head feat/claim-store-lookup \
  --title "refactor(claim): share lookup address via claim store" \
  --body "$(cat <<'EOF'
Closes #177 — lean version: `lookupAddress` and selection initialization move into the claim Zustand store; `useRewards` stays a pure TanStack Query hook (no server state copied into Zustand, per the design discussion — Query's cache already shares rewards app-wide).

- `claim-state.ts`: `lookupAddress`, `setLookupAddress`, `initSelectionFor` (replaces ClaimPage's `initializedFor` ref); `reset()` also clears init bookkeeping but keeps the address view.
- ClaimPage drops its local lookup state/ref.

Stacked on #221. First PR of the stack from `docs/superpowers/specs/2026-07-10-analytics-network-claim-state-design.md`.
EOF
)"
```

Expected: PR URL printed. Note the PR number for the stack.

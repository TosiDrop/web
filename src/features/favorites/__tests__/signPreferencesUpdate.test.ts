import { describe, it, expect, vi } from 'vitest';

const verifyMock = vi.fn((..._a: unknown[]) => true);
vi.mock('@cardano-foundation/cardano-verify-datasignature', () => ({
  default: (...a: unknown[]) => verifyMock(...a),
}));

import { signPreferencesUpdateMessage } from '../utils/signPreferencesUpdate';
import { verifyStakeSignature } from '../../../../functions/services/verifyStakeSignature';

const STAKE = 'stake1' + 'u'.repeat(40);

describe('signPreferencesUpdateMessage', () => {
  it('signs with the stake address and builds a server-verifiable message', async () => {
    const signData = vi.fn(async (_address: string, _payload: string) => ({ signature: 'sig', key: 'key' }));
    const wallet = { signData };

    const out = await signPreferencesUpdateMessage({
      wallet, stakeAddress: STAKE, favoriteIds: ['a2', 'a1'], dislikedIds: ['z1'],
    });

    // signed with the stake/reward address, payload hex-encoded
    expect(signData).toHaveBeenCalledTimes(1);
    expect(signData.mock.calls[0][0]).toBe(STAKE);
    expect(out.signature).toBe('sig');
    expect(out.message).toMatch(
      /^Tosi preferences update for stake1u+ at .+\nfavorites: 2 \[[0-9a-f]{16}\]\ndislikes: 1 \[[0-9a-f]{16}\]$/,
    );

    const verified = await verifyStakeSignature({
      stakeAddress: STAKE, favorites: ['a2', 'a1'], dislikes: ['z1'],
      signature: out.signature, key: out.key, message: out.message,
    });
    expect(verified.ok).toBe(true);
  });

  it('produces the same digests regardless of id order', async () => {
    const signData = vi.fn(async () => ({ signature: 'sig', key: 'key' }));
    const wallet = { signData };
    const a = await signPreferencesUpdateMessage({
      wallet, stakeAddress: STAKE, favoriteIds: ['a1', 'a2'], dislikedIds: ['z2', 'z1'],
    });
    const b = await signPreferencesUpdateMessage({
      wallet, stakeAddress: STAKE, favoriteIds: ['a2', 'a1'], dislikedIds: ['z1', 'z2'],
    });
    const digests = (m: string) => m.split('\n').slice(1).join('\n');
    expect(digests(a.message)).toBe(digests(b.message));
  });
});

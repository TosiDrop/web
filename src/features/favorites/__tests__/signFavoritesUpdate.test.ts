import { describe, it, expect, vi } from 'vitest';

const verifyMock = vi.fn((..._a: unknown[]) => true);
vi.mock('@cardano-foundation/cardano-verify-datasignature', () => ({
  default: (...a: unknown[]) => verifyMock(...a),
}));

import { signFavoritesUpdateMessage } from '../utils/signFavoritesUpdate';
import { verifyStakeSignature } from '../../../../functions/services/verifyStakeSignature';

const STAKE = 'stake1' + 'u'.repeat(40);

describe('signFavoritesUpdateMessage', () => {
  it('signs with the stake address and builds a server-verifiable message', async () => {
    const signData = vi.fn(async (_address: string, _payload: string) => ({ signature: 'sig', key: 'key' }));
    const wallet = { signData };

    const out = await signFavoritesUpdateMessage({
      wallet, stakeAddress: STAKE, assetIds: ['a2', 'a1'],
    });

    // signed with the stake/reward address, payload hex-encoded
    expect(signData).toHaveBeenCalledTimes(1);
    expect(signData.mock.calls[0][0]).toBe(STAKE);
    expect(out.signature).toBe('sig');
    expect(out.message).toMatch(/^Tosi favorites update for stake1u+ at .+\nfavorites: 2 \[[0-9a-f]{16}\]$/);

    const verified = await verifyStakeSignature({
      stakeAddress: STAKE, favorites: ['a2', 'a1'],
      signature: out.signature, key: out.key, message: out.message,
    });
    expect(verified.ok).toBe(true);
  });
});

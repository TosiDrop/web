import { describe, it, expect, vi, beforeEach } from 'vitest';

const verifyMock = vi.fn();
vi.mock('@cardano-foundation/cardano-verify-datasignature', () => ({
  default: (...args: unknown[]) => verifyMock(...args),
}));

import { verifyStakeSignature, favoritesDigest } from '../verifyStakeSignature';

const STAKE = 'stake1' + 'u'.repeat(40);

async function buildMessage(stake: string, assetIds: string[], iso: string) {
  const digest = await favoritesDigest(assetIds);
  return `Tosi favorites update for ${stake} at ${iso}\nfavorites: ${assetIds.length} [${digest}]`;
}

describe('verifyStakeSignature', () => {
  beforeEach(() => {
    verifyMock.mockReset();
    verifyMock.mockReturnValue(true);
  });

  it('accepts a fresh, payload-bound, validly signed message', async () => {
    const now = new Date('2026-05-29T12:00:00.000Z');
    const ids = ['b', 'a', 'c'];
    const message = await buildMessage(STAKE, ids, now.toISOString());
    const res = await verifyStakeSignature({
      stakeAddress: STAKE, favorites: ids, signature: 's', key: 'k', message, now,
    });
    expect(res.ok).toBe(true);
    expect(verifyMock).toHaveBeenCalledWith('s', 'k', message, STAKE);
  });

  it('rejects a missing signature payload', async () => {
    const res = await verifyStakeSignature({
      stakeAddress: STAKE, favorites: [], signature: undefined, key: 'k', message: 'm',
    });
    expect(res).toMatchObject({ ok: false, status: 401 });
  });

  it('rejects a stale message (>5 min)', async () => {
    const now = new Date('2026-05-29T12:10:00.000Z');
    const signedAt = '2026-05-29T12:00:00.000Z';
    const ids = ['a'];
    const message = await buildMessage(STAKE, ids, signedAt);
    const res = await verifyStakeSignature({
      stakeAddress: STAKE, favorites: ids, signature: 's', key: 'k', message, now,
    });
    expect(res).toMatchObject({ ok: false, status: 401 });
  });

  it('rejects when the signed stake address differs', async () => {
    const now = new Date('2026-05-29T12:00:00.000Z');
    const ids = ['a'];
    const message = await buildMessage(STAKE, ids, now.toISOString());
    const res = await verifyStakeSignature({
      stakeAddress: 'stake1' + 'z'.repeat(40), favorites: ids, signature: 's', key: 'k', message, now,
    });
    expect(res).toMatchObject({ ok: false, status: 401 });
  });

  it('rejects when the payload digest does not match (tampered list)', async () => {
    const now = new Date('2026-05-29T12:00:00.000Z');
    const message = await buildMessage(STAKE, ['a', 'b'], now.toISOString());
    const res = await verifyStakeSignature({
      stakeAddress: STAKE, favorites: ['a', 'b', 'c'], signature: 's', key: 'k', message, now,
    });
    expect(res).toMatchObject({ ok: false, status: 401 });
  });

  it('rejects when the cryptographic signature is invalid', async () => {
    verifyMock.mockReturnValue(false);
    const now = new Date('2026-05-29T12:00:00.000Z');
    const ids = ['a'];
    const message = await buildMessage(STAKE, ids, now.toISOString());
    const res = await verifyStakeSignature({
      stakeAddress: STAKE, favorites: ids, signature: 's', key: 'k', message, now,
    });
    expect(res).toMatchObject({ ok: false, status: 401 });
  });

  it('favoritesDigest is order-independent and 16 hex chars', async () => {
    const a = await favoritesDigest(['x', 'y', 'z']);
    const b = await favoritesDigest(['z', 'x', 'y']);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
  });
});

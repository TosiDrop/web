import { describe, it, expect, vi, beforeEach } from 'vitest';

const verifyMock = vi.fn();
vi.mock('@cardano-foundation/cardano-verify-datasignature', () => ({
  default: (...args: unknown[]) => verifyMock(...args),
}));

import { verifyStakeSignature, favoritesDigest } from '../verifyStakeSignature';

const STAKE = 'stake1' + 'u'.repeat(40);

async function buildMessage(
  stake: string,
  favoriteIds: string[],
  dislikedIds: string[],
  iso: string,
) {
  const f = await favoritesDigest(favoriteIds);
  const d = await favoritesDigest(dislikedIds);
  return (
    `Tosi preferences update for ${stake} at ${iso}\n` +
    `favorites: ${favoriteIds.length} [${f}]\n` +
    `dislikes: ${dislikedIds.length} [${d}]`
  );
}

describe('verifyStakeSignature', () => {
  beforeEach(() => {
    verifyMock.mockReset();
    verifyMock.mockReturnValue(true);
  });

  it('accepts a fresh, payload-bound, validly signed message', async () => {
    const now = new Date('2026-05-29T12:00:00.000Z');
    const ids = ['b', 'a', 'c'];
    const message = await buildMessage(STAKE, ids, [], now.toISOString());
    const res = await verifyStakeSignature({
      stakeAddress: STAKE, favorites: ids, dislikes: [], signature: 's', key: 'k', message, now,
    });
    expect(res.ok).toBe(true);
    expect(verifyMock).toHaveBeenCalledWith('s', 'k', message, STAKE);
  });

  it('accepts a message binding both favorites and dislikes', async () => {
    const now = new Date('2026-06-03T12:00:00.000Z');
    const favs = ['a1'];
    const dislikes = ['z9', 'z1'];
    const message = await buildMessage(STAKE, favs, dislikes, now.toISOString());
    const res = await verifyStakeSignature({
      stakeAddress: STAKE, favorites: favs, dislikes, signature: 's', key: 'k', message, now,
    });
    expect(res.ok).toBe(true);
  });

  it('rejects a missing signature payload', async () => {
    const res = await verifyStakeSignature({
      stakeAddress: STAKE, favorites: [], dislikes: [], signature: undefined, key: 'k', message: 'm',
    });
    expect(res).toMatchObject({ ok: false, status: 401 });
  });

  it('rejects a stale message (>5 min)', async () => {
    const now = new Date('2026-05-29T12:10:00.000Z');
    const signedAt = '2026-05-29T12:00:00.000Z';
    const ids = ['a'];
    const message = await buildMessage(STAKE, ids, [], signedAt);
    const res = await verifyStakeSignature({
      stakeAddress: STAKE, favorites: ids, dislikes: [], signature: 's', key: 'k', message, now,
    });
    expect(res).toMatchObject({ ok: false, status: 401 });
  });

  it('rejects when the signed stake address differs', async () => {
    const now = new Date('2026-05-29T12:00:00.000Z');
    const ids = ['a'];
    const message = await buildMessage(STAKE, ids, [], now.toISOString());
    const res = await verifyStakeSignature({
      stakeAddress: 'stake1' + 'z'.repeat(40), favorites: ids, dislikes: [], signature: 's', key: 'k', message, now,
    });
    expect(res).toMatchObject({ ok: false, status: 401 });
  });

  it('rejects when the favorites digest does not match (tampered list)', async () => {
    const now = new Date('2026-05-29T12:00:00.000Z');
    const message = await buildMessage(STAKE, ['a', 'b'], [], now.toISOString());
    const res = await verifyStakeSignature({
      stakeAddress: STAKE, favorites: ['a', 'b', 'c'], dislikes: [], signature: 's', key: 'k', message, now,
    });
    expect(res).toMatchObject({ ok: false, status: 401 });
  });

  it('rejects when the dislike count does not match', async () => {
    const now = new Date('2026-06-03T12:00:00.000Z');
    const message = await buildMessage(STAKE, [], ['z9'], now.toISOString());
    const res = await verifyStakeSignature({
      stakeAddress: STAKE, favorites: [], dislikes: ['z9', 'z2'], signature: 's', key: 'k', message, now,
    });
    expect(res).toMatchObject({ ok: false, status: 401 });
  });

  it('rejects when the dislike digest does not match', async () => {
    const now = new Date('2026-06-03T12:00:00.000Z');
    const message = await buildMessage(STAKE, [], ['z9'], now.toISOString());
    const res = await verifyStakeSignature({
      stakeAddress: STAKE, favorites: [], dislikes: ['DIFFERENT'], signature: 's', key: 'k', message, now,
    });
    expect(res).toMatchObject({ ok: false, status: 401 });
  });

  it('rejects the legacy favorites-only message format', async () => {
    const digest = await favoritesDigest(['a1']);
    const message =
      `Tosi favorites update for ${STAKE} at 2026-06-03T12:00:00.000Z\nfavorites: 1 [${digest}]`;
    const res = await verifyStakeSignature({
      stakeAddress: STAKE, favorites: ['a1'], dislikes: [], signature: 's', key: 'k', message,
      now: new Date('2026-06-03T12:00:00.000Z'),
    });
    expect(res).toMatchObject({ ok: false, status: 401 });
  });

  it('rejects when the cryptographic signature is invalid', async () => {
    verifyMock.mockReturnValue(false);
    const now = new Date('2026-05-29T12:00:00.000Z');
    const ids = ['a'];
    const message = await buildMessage(STAKE, ids, [], now.toISOString());
    const res = await verifyStakeSignature({
      stakeAddress: STAKE, favorites: ids, dislikes: [], signature: 's', key: 'k', message, now,
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

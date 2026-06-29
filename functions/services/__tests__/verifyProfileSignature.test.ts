import { describe, expect, it, vi } from 'vitest';

vi.mock('@cardano-foundation/cardano-verify-datasignature', () => ({
  default: vi.fn(() => true),
}));

import verifySignature from '@cardano-foundation/cardano-verify-datasignature';
import { verifyProfileSignature } from '../verifyProfileSignature';

const stakeAddress = 'stake1uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const goodMessage = (when: string) => `Tosi profile update for ${stakeAddress} at ${when}`;

describe('verifyProfileSignature', () => {
  it('rejects when signature payload fields are missing', () => {
    const r = verifyProfileSignature({ stakeAddress });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(401);
  });

  it('rejects malformed messages', () => {
    const r = verifyProfileSignature({
      stakeAddress,
      signature: 'sig',
      key: 'key',
      message: 'something else entirely',
    });
    expect(r.ok).toBe(false);
  });

  it('rejects when signed stake address differs from request', () => {
    const r = verifyProfileSignature({
      stakeAddress,
      signature: 'sig',
      key: 'key',
      message: goodMessage('2026-05-21T22:00:00.000Z').replace(stakeAddress, 'stake1uother'),
    });
    expect(r.ok).toBe(false);
  });

  it('rejects timestamps outside the 5-minute window', () => {
    const now = new Date('2026-05-21T22:00:00.000Z');
    const r = verifyProfileSignature({
      stakeAddress,
      signature: 'sig',
      key: 'key',
      message: goodMessage('2026-05-21T21:50:00.000Z'),
      now,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/stale/i);
  });

  it('rejects when the underlying verify fails', () => {
    vi.mocked(verifySignature).mockReturnValueOnce(false);
    const now = new Date('2026-05-21T22:00:00.000Z');
    const r = verifyProfileSignature({
      stakeAddress,
      signature: 'sig',
      key: 'key',
      message: goodMessage('2026-05-21T22:00:00.000Z'),
      now,
    });
    expect(r.ok).toBe(false);
  });

  it('rejects when the underlying verify throws', () => {
    vi.mocked(verifySignature).mockImplementationOnce(() => {
      throw new Error('Crypto failure');
    });
    const now = new Date('2026-05-21T22:00:00.000Z');
    const r = verifyProfileSignature({
      stakeAddress,
      signature: 'sig',
      key: 'key',
      message: goodMessage('2026-05-21T22:00:00.000Z'),
      now,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/verification failed/i);
  });

  it('accepts a well-formed, fresh, valid signature', () => {
    vi.mocked(verifySignature).mockReturnValueOnce(true);
    const now = new Date('2026-05-21T22:00:00.000Z');
    const r = verifyProfileSignature({
      stakeAddress,
      signature: 'sig',
      key: 'key',
      message: goodMessage('2026-05-21T21:59:00.000Z'),
      now,
    });
    expect(r.ok).toBe(true);
  });
});

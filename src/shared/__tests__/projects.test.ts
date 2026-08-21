import { describe, it, expect } from 'vitest';
import {
  buildProjectMessage,
  normalizeProjectInput,
  projectDigest,
  PROJECT_MESSAGE_RE,
  validateProjectInput,
} from '../projects';

const BASE = {
  name: ' Tosi ',
  description: 'd',
  website: 'https://tosidrop.io',
  logoUrl: '',
  tokenId: 'pol.6d544f5349',
  poolId: '',
  distribution: { amountPerEpoch: '10', minStakeAda: '100', expiryEpochs: 5 },
};

describe('projects shared', () => {
  it('normalizes whitespace and coerces distribution', () => {
    const out = normalizeProjectInput({ ...BASE, distribution: { expiryEpochs: '3' } });
    expect(out.name).toBe('Tosi');
    expect(out.distribution).toEqual({ amountPerEpoch: '', minStakeAda: '', expiryEpochs: 3 });
    expect(normalizeProjectInput(null).name).toBe('');
  });

  it('validates required fields and formats', () => {
    const ok = normalizeProjectInput(BASE);
    expect(validateProjectInput(ok)).toBeNull();
    expect(validateProjectInput({ ...ok, name: '' })).toMatch(/name/);
    expect(validateProjectInput({ ...ok, tokenId: '' })).toMatch(/tokenId/);
    expect(validateProjectInput({ ...ok, website: 'tosidrop.io' })).toMatch(/http/);
    expect(validateProjectInput({ ...ok, poolId: 'nope' })).toMatch(/poolId/);
    expect(
      validateProjectInput({ ...ok, distribution: { ...ok.distribution, expiryEpochs: -1 } }),
    ).toMatch(/expiryEpochs/);
  });

  it('digest is stable across key order and matches the message format', async () => {
    const a = normalizeProjectInput(BASE);
    const b = normalizeProjectInput({
      distribution: { expiryEpochs: 5, minStakeAda: '100', amountPerEpoch: '10' },
      poolId: '', tokenId: BASE.tokenId, logoUrl: '', website: BASE.website,
      description: 'd', name: 'Tosi',
    });
    const da = await projectDigest(a);
    expect(da).toMatch(/^[0-9a-f]{16}$/);
    expect(await projectDigest(b)).toBe(da);
    expect(await projectDigest({ ...a, name: 'Other' })).not.toBe(da);

    const msg = buildProjectMessage('stake_test1abc', da, new Date('2026-08-20T00:00:00.000Z'));
    const m = PROJECT_MESSAGE_RE.exec(msg);
    expect(m?.[1]).toBe('stake_test1abc');
    expect(m?.[3]).toBe(da);
  });
});

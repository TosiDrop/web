import { describe, it, expect } from 'vitest';
import {
  buildProjectMessage,
  normalizeProjectInput,
  projectDigest,
  PROJECT_MESSAGE_RE,
  parseProjectMessage,
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

    const msg = buildProjectMessage({
      action: 'update',
      network: 'preview',
      stakeAddress: 'stake_test1abc',
      projectId: '9a4c1b1e-0c3c-4d8e-a3f1-3f6e7c1d2b5a',
      digest: da,
      now: new Date('2026-08-20T00:00:00.000Z'),
    });
    expect(msg).toBe(
      'Tosi project update on preview for stake_test1abc at 2026-08-20T00:00:00.000Z\n' +
        `project: 9a4c1b1e-0c3c-4d8e-a3f1-3f6e7c1d2b5a [${da}]`,
    );
    expect(parseProjectMessage(msg)).toEqual({
      action: 'update',
      network: 'preview',
      stakeAddress: 'stake_test1abc',
      signedAt: '2026-08-20T00:00:00.000Z',
      projectId: '9a4c1b1e-0c3c-4d8e-a3f1-3f6e7c1d2b5a',
      digest: da,
    });
    expect(PROJECT_MESSAGE_RE.test(msg)).toBe(true);
    const create = buildProjectMessage({ action: 'create', network: 'mainnet', stakeAddress: 'stake1abc', projectId: null, digest: da });
    expect(parseProjectMessage(create)?.projectId).toBeNull();
  });

  it('requires a positive amount and a bounded, non-negative minimum stake', () => {
    const base = normalizeProjectInput(BASE);
    const withDist = (d: Partial<typeof base.distribution>) => ({ ...base, distribution: { ...base.distribution, ...d } });
    expect(validateProjectInput(withDist({ amountPerEpoch: '' }))).toMatch(/amountPerEpoch/);
    expect(validateProjectInput(withDist({ amountPerEpoch: '0' }))).toMatch(/amountPerEpoch/);
    expect(validateProjectInput(withDist({ amountPerEpoch: '-5' }))).toMatch(/amountPerEpoch/);
    expect(validateProjectInput(withDist({ amountPerEpoch: 'ten' }))).toMatch(/amountPerEpoch/);
    expect(validateProjectInput(withDist({ amountPerEpoch: '1e3' }))).toMatch(/amountPerEpoch/);
    expect(validateProjectInput(withDist({ amountPerEpoch: '12.5' }))).toBeNull();
    expect(validateProjectInput(withDist({ minStakeAda: '' }))).toBeNull();
    expect(validateProjectInput(withDist({ minStakeAda: '-1' }))).toMatch(/minStakeAda/);
    expect(validateProjectInput(withDist({ minStakeAda: 'abc' }))).toMatch(/minStakeAda/);
    expect(validateProjectInput(withDist({ minStakeAda: '50000000000' }))).toMatch(/minStakeAda/);
    expect(validateProjectInput(withDist({ minStakeAda: '500' }))).toBeNull();
    expect(validateProjectInput(withDist({ expiryEpochs: 5000 }))).toMatch(/expiryEpochs/);
  });
});

import { describe, expect, it } from 'vitest';
import { verifyProjectSignature, signatureHash } from '../verifyProjectSignature';
import { buildProjectMessage, normalizeProjectInput, projectDigest } from '../../../src/shared/projects';

const STAKE = 'stake_test1' + 'u'.repeat(40);
const NOW = new Date('2026-08-20T00:00:00.000Z');
const PROJECT = normalizeProjectInput({
  name: 'Tosi',
  tokenId: 'pol.6d544f5349',
  distribution: { amountPerEpoch: '10', minStakeAda: '', expiryEpochs: 2 },
});

async function message(overrides: Partial<Parameters<typeof buildProjectMessage>[0]> = {}) {
  return buildProjectMessage({
    action: 'update',
    network: 'preview',
    stakeAddress: STAKE,
    projectId: '9a4c1b1e-0c3c-4d8e-a3f1-3f6e7c1d2b5a',
    digest: await projectDigest(PROJECT),
    now: NOW,
    ...overrides,
  });
}

const base = {
  stakeAddress: STAKE,
  project: PROJECT,
  action: 'update' as const,
  projectId: '9a4c1b1e-0c3c-4d8e-a3f1-3f6e7c1d2b5a',
  network: 'preview',
  signature: 'sig',
  key: 'key',
  now: NOW,
};

// These all fail before any cryptography runs: the message must authorise
// exactly this operation, on this network, for this project.
describe('verifyProjectSignature binding', () => {
  it('rejects a create signature used for an update', async () => {
    const res = await verifyProjectSignature({ ...base, message: await message({ action: 'create', projectId: null }) });
    expect(res).toMatchObject({ ok: false, status: 401, reason: expect.stringContaining('authorises create') });
  });

  it('rejects a signature from the other network', async () => {
    const res = await verifyProjectSignature({ ...base, message: await message({ network: 'mainnet' }) });
    expect(res).toMatchObject({ ok: false, reason: expect.stringContaining('different network') });
  });

  it('rejects a signature for a different project id', async () => {
    const res = await verifyProjectSignature({
      ...base,
      message: await message({ projectId: '00000000-0000-4000-8000-000000000000' }),
    });
    expect(res).toMatchObject({ ok: false, reason: expect.stringContaining('different project') });
  });

  it('rejects a stale message and a payload that does not match the digest', async () => {
    const stale = await verifyProjectSignature({
      ...base,
      message: await message({ now: new Date('2026-08-19T00:00:00.000Z') }),
    });
    expect(stale).toMatchObject({ ok: false, reason: expect.stringContaining('stale') });
    const tampered = await verifyProjectSignature({
      ...base,
      project: { ...PROJECT, name: 'Other' },
      message: await message(),
    });
    expect(tampered).toMatchObject({ ok: false, reason: expect.stringContaining('does not match signed message') });
  });

  it('hashes a signature deterministically', async () => {
    expect(await signatureHash('sig')).toMatch(/^[0-9a-f]{64}$/);
    expect(await signatureHash('sig')).toBe(await signatureHash('sig'));
    expect(await signatureHash('sig')).not.toBe(await signatureHash('other'));
  });
});

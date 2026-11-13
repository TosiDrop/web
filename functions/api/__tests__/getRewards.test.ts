import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../../types/env';
const { vmGet } = vi.hoisted(() => ({ vmGet: vi.fn() }));
vi.mock('../../services/vmClient', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../services/vmClient')>(), vmGet,
}));
import { onRequestGet } from '../getRewards';
const POLICY = 'a'.repeat(56);
const NFT = `${POLICY}.41727431`;
const FT = `${POLICY}.4654`;
function context() {
  return { request: new Request('https://example.com/api/getRewards?walletId=stake_test1wallet'), env: { VITE_VM_API_KEY: 'key' } as Env } as Parameters<typeof onRequestGet>[0];
}
describe('GET /api/getRewards NFT identity', () => {
  beforeEach(() => vmGet.mockReset());
  it('preserves explicit NFT identity and bounded metadata alongside normalized fungible and native rewards', async () => {
    vmGet.mockImplementation((_env, method) => Promise.resolve(method === 'get_rewards'
      ? { consolidated_rewards: { [NFT]: 1, [FT]: 1000 }, project_locked_rewards: { consolidated_rewards: { lovelace: 2_000_000 } } }
      : { [NFT]: { decimals: 0, ticker: 'ART', assetType: 'nft', metadata: { name: 'Art 1', image: 'https://example.com/art.png', collection: 'Gallery' } }, [FT]: { decimals: 2, ticker: 'FT' }, lovelace: { decimals: 6, ticker: 'ADA' } }));
    const response = await onRequestGet(context());
    const { rewards } = await response.json() as { rewards: Record<string, unknown>[] };
    expect(rewards).toEqual([
      { assetId: NFT, ticker: 'ART', logo: '', decimals: 0, amount: 1, premium: false, native: false, assetType: 'nft', nft: { name: 'Art 1', image: 'https://example.com/art.png', collection: 'Gallery', identitySource: 'provider' } },
      { assetId: FT, ticker: 'FT', logo: '', decimals: 2, amount: 10, premium: false, native: false },
      { assetId: 'lovelace', ticker: 'ADA', logo: '', decimals: 6, amount: 2, premium: true, native: true },
    ]);
  });
  it('keeps a claimable NFT when its metadata cannot render and omits arbitrary provider fields', async () => {
    vmGet.mockImplementation((_env, method) => Promise.resolve(method === 'get_rewards'
      ? { consolidated_rewards: { [NFT]: 1 } }
      : { [NFT]: { isNFT: true, metadata: { name: {}, image: 'javascript:alert(1)', secret: 'unused' } } }));
    const response = await onRequestGet(context());
    const { rewards } = await response.json() as { rewards: Record<string, unknown>[] };
    expect(rewards[0]).toMatchObject({ amount: 1, assetType: 'nft', nft: { name: null, image: null, collection: null, identitySource: 'provider' } });
    expect(rewards[0]).not.toHaveProperty('metadata');
  });
});

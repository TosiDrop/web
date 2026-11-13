import { describe, expect, it } from 'vitest';
import type { Project } from '@/shared/projects';
import { discoverTokens, readDiscoveryFilters, writeDiscoveryFilters } from '../discovery';

const project = (id: string, extra: Partial<Project> = {}): Project => ({ id, network: 'preview', ownerAddress: '', name: id, description: 'Delegation rewards', website: '', logoUrl: '', tokenId: `${id}.00`, poolId: 'pool-a', distribution: { amountPerEpoch: '1', minStakeAda: '', expiryEpochs: 0 }, status: 'approved', createdAt: '', updatedAt: '', approvedAt: null, ...extra });

describe('token discovery', () => {
  it('restores and resets owned URL filters while preserving unrelated parameters', () => {
    const params = new URLSearchParams('q=alpha&pool=pool-a&project=a&sort=newest&claimable=1&ref=share');
    expect(readDiscoveryFilters(params)).toEqual({ search: 'alpha', pool: 'pool-a', project: 'a', sort: 'newest', claimable: true });
    expect(writeDiscoveryFilters(params, readDiscoveryFilters(new URLSearchParams())).toString()).toBe('ref=share');
    expect(readDiscoveryFilters(new URLSearchParams('sort=popular&claimable=yes')).sort).toBe('name');
  });

  it('combines project, pool, ticker search and positive currently claimable assets', () => {
    const projects = [project('a'), project('b', { poolId: 'pool-b' })];
    const filters = { search: 'tosi', project: 'a', pool: 'pool-a', sort: 'name' as const, claimable: true };
    expect(discoverTokens(projects, filters, { 'a.00': { ticker: 'TOSI' } }, [{ assetId: 'a.00', amount: 2 }])).toEqual([projects[0]]);
    expect(discoverTokens(projects, filters, {}, [{ assetId: 'a.00', amount: 0 }])).toEqual([]);
  });

  it('sorts newest by real approval or creation dates and leaves unknown dates last', () => {
    const projects = [project('unknown'), project('created', { createdAt: '2026-10-01T00:00:00Z' }), project('approved', { createdAt: '2026-01-01T00:00:00Z', approvedAt: '2026-10-28T00:00:00Z' }), project('invalid', { approvedAt: 'oops' })];
    const filters = { ...readDiscoveryFilters(new URLSearchParams()), sort: 'newest' as const };
    expect(discoverTokens(projects, filters).map((p) => p.id)).toEqual(['approved', 'created', 'invalid', 'unknown']);
  });
});

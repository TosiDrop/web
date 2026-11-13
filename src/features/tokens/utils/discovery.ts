import type { Project } from '@/shared/projects';
import { tickerFor, type TokenMap } from '@/features/history/api/history.queries';

export interface DiscoveryFilters { search: string; pool: string; project: string; sort: 'name' | 'newest'; claimable: boolean }
export function readDiscoveryFilters(params: URLSearchParams): DiscoveryFilters {
  return { search: params.get('q') ?? '', pool: params.get('pool') ?? '', project: params.get('project') ?? '', sort: params.get('sort') === 'newest' ? 'newest' : 'name', claimable: params.get('claimable') === '1' };
}
export function writeDiscoveryFilters(params: URLSearchParams, filters: DiscoveryFilters): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const key of ['q', 'pool', 'project', 'sort', 'claimable']) next.delete(key);
  if (filters.search) next.set('q', filters.search);
  if (filters.pool) next.set('pool', filters.pool);
  if (filters.project) next.set('project', filters.project);
  if (filters.sort === 'newest') next.set('sort', 'newest');
  if (filters.claimable) next.set('claimable', '1');
  return next;
}
export function addedAt(project: Project): number | null {
  for (const raw of [project.approvedAt, project.createdAt]) {
    const time = raw ? Date.parse(raw) : NaN;
    if (Number.isFinite(time)) return time;
  }
  return null;
}
export function discoverTokens(projects: Project[], filters: DiscoveryFilters, tokens: TokenMap = {}, rewards: Array<{ assetId: string; amount: number }> = []): Project[] {
  const query = filters.search.trim().toLowerCase();
  const available = new Set(rewards.filter((reward) => Number.isFinite(reward.amount) && reward.amount > 0).map((reward) => reward.assetId));
  return projects.filter((project) => (!filters.project || project.id === filters.project)
    && (!filters.pool || project.poolId === filters.pool)
    && (!filters.claimable || available.has(project.tokenId))
    && (!query || [project.name, project.description, project.poolId, project.tokenId, tickerFor(project.tokenId, tokens[project.tokenId])].some((value) => value.toLowerCase().includes(query))))
    .sort((a, b) => (filters.sort === 'newest' ? (addedAt(b) ?? -Infinity) - (addedAt(a) ?? -Infinity) : 0) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

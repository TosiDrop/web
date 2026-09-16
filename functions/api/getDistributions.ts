import type { Env } from '../types/env';
import {
  vmConfig,
  vmGet,
  deploymentCacheKey,
  vmConfigurationErrorResponse,
  jsonResponse,
  errorResponse,
  optionsResponse,
} from '../services/vmClient';

const CACHE_KEY = '__internal:distributions_cache';
const CACHE_REFRESH_INTERVAL = 86400 * 1000;
const CACHE_RETENTION = 7 * 86400;

interface DistributionSnapshot {
  version: 1;
  fetchedAt: number;
  data: unknown;
}

function snapshotFrom(value: unknown): DistributionSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<DistributionSnapshot>;
  if (candidate.version !== 1 || typeof candidate.fetchedAt !== 'number' || !('data' in candidate)) {
    return null;
  }
  return candidate as DistributionSnapshot;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');

  if (!vmConfig(env)) return vmConfigurationErrorResponse(origin);

  let fallback: unknown = null;
  try {
    const cacheKey = deploymentCacheKey(env, CACHE_KEY);
    const cached = await env.VM_WEB_PROFILES.get(cacheKey, { type: 'json' });
    const snapshot = snapshotFrom(cached);
    if (snapshot && Date.now() - snapshot.fetchedAt < CACHE_REFRESH_INTERVAL) {
      return jsonResponse(snapshot.data, 200, origin);
    }
    if (cached !== null) fallback = snapshot?.data ?? cached;

    const data = await vmGet(env, 'get_distributions');
    const nextSnapshot: DistributionSnapshot = { version: 1, fetchedAt: Date.now(), data };
    await env.VM_WEB_PROFILES.put(cacheKey, JSON.stringify(nextSnapshot), {
      expirationTtl: CACHE_RETENTION,
    });
    return jsonResponse(data, 200, origin);
  } catch (error) {
    console.error('getDistributions error:', error);
    if (fallback !== null) return jsonResponse(fallback, 200, origin);
    return errorResponse('Failed to fetch distributions', 500, origin);
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));

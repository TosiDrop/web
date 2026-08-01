import type { Env } from '../types/env';
import {
  vmConfig,
  vmGet,
  vmConfigurationErrorResponse,
  withCache,
  errorResponse,
  optionsResponse,
} from '../services/vmClient';

const CACHE_TTL = 300;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');

  if (!vmConfig(env)) return vmConfigurationErrorResponse(origin);

  try {
    return await withCache(request, env, CACHE_TTL, async () => {
      return vmGet(env, 'system_info');
    }, context.waitUntil.bind(context));
  } catch (error) {
    console.error('getSystemInfo error:', error);
    return errorResponse('Failed to fetch system info', 500, origin);
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));

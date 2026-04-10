import type { Env } from '../types/env';
import { jsonResponse, errorResponse, optionsResponse } from '../services/vmClient';

const CACHE_TTL = 3600;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request } = context;
  const url = new URL(request.url);
  const handle = url.searchParams.get('handle');

  if (!handle) {
    return errorResponse('handle is required', 400);
  }

  const cleanHandle = handle.startsWith('$') ? handle.slice(1) : handle;
  if (!cleanHandle) {
    return errorResponse('handle must not be empty', 400);
  }

  if (cleanHandle.length > 28 || !/^[a-z0-9_.-]+$/i.test(cleanHandle)) {
    return errorResponse('Invalid handle format', 400);
  }

  try {
    const cache = caches.default;
    const cacheKey = new Request(url.toString());
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    const res = await fetch(`https://api.handle.me/handles/${encodeURIComponent(cleanHandle)}`);

    if (!res.ok) {
      if (res.status === 404) {
        return errorResponse('Handle not found', 404);
      }
      return errorResponse('Upstream handle resolution error', 502);
    }

    const data = await res.json();

    const response = jsonResponse(data);
    response.headers.set('Cache-Control', `s-maxage=${CACHE_TTL}`);
    await cache.put(cacheKey, response.clone());
    return response;
  } catch (error) {
    console.error('resolveHandle error:', error);
    return errorResponse('Failed to resolve handle');
  }
};

export const onRequestOptions: PagesFunction = async () => optionsResponse();

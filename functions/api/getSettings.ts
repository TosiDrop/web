import type { Env } from '../types/env';
import { requireApiKey, jsonResponse, errorResponse, optionsResponse } from '../services/vmClient';

const CACHE_KEY = '__internal:settings_cache';
const CACHE_TTL = 3600;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');

  const keyError = requireApiKey(env, origin);
  if (keyError) return keyError;

  try {
    const cached = await env.VM_WEB_PROFILES.get(CACHE_KEY, { type: 'json' });
    if (cached !== null) {
      return jsonResponse(cached, 200, origin);
    }

    const baseUrl = env.VM_BASE_URL || 'https://vmprev.adaseal.eu';
    const url = `${baseUrl}/api.php?action=get_settings`;
    const response = await fetch(url, {
      headers: { 'X-API-Token': env.VITE_VM_API_KEY },
    });

    if (!response.ok) {
      return errorResponse('Upstream service error', 502, origin);
    }

    const settings = await response.json();

    context.waitUntil(env.VM_WEB_PROFILES.put(CACHE_KEY, JSON.stringify(settings), {
      expirationTtl: CACHE_TTL,
    }));

    return jsonResponse(settings, 200, origin);
  } catch (error) {
    console.error('getSettings error:', error);
    return errorResponse('Failed to fetch settings', 500, origin);
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));

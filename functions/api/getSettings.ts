import type { Env } from '../types/env';
import { requireApiKey, jsonResponse, errorResponse, optionsResponse } from '../services/vmClient';

const CACHE_KEY = '__internal:settings_cache';
const CACHE_TTL = 3600;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  const keyError = requireApiKey(env);
  if (keyError) return keyError;

  try {
    const cached = await env.VM_WEB_PROFILES.get(CACHE_KEY, { type: 'json' });
    if (cached !== null) {
      return jsonResponse(cached);
    }

    const baseUrl = env.VM_BASE_URL || 'https://vmprev.adaseal.eu';
    const url = `${baseUrl}/api.php?action=get_settings`;
    const response = await fetch(url, {
      headers: { 'X-API-Token': env.VITE_VM_API_KEY },
    });

    if (!response.ok) {
      return errorResponse('Upstream service error', 502);
    }

    const settings = await response.json();

    await env.VM_WEB_PROFILES.put(CACHE_KEY, JSON.stringify(settings), {
      expirationTtl: CACHE_TTL,
    });

    return jsonResponse(settings);
  } catch (error) {
    console.error('getSettings error:', error);
    return errorResponse('Failed to fetch settings');
  }
};

export const onRequestOptions: PagesFunction = async () => optionsResponse();

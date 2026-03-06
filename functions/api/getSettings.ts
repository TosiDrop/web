/// <reference types="@cloudflare/workers-types" />

import { jsonResponse, errorResponse, optionsResponse } from '../services/vmClient';

interface Env {
  VITE_VM_API_KEY: string;
  VM_WEB_PROFILES: KVNamespace;
}

const VM_URL = 'https://vmprev.adaseal.eu';
const CACHE_KEY = 'settings_cache';
const CACHE_TTL = 3600;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  try {
    const cached = await env.VM_WEB_PROFILES.get(CACHE_KEY, { type: 'json' });
    if (cached !== null) {
      return jsonResponse(cached);
    }

    const url = `${VM_URL}/api.php?action=get_settings`;
    const response = await fetch(url, {
      headers: { 'X-API-Token': env.VITE_VM_API_KEY },
    });

    if (!response.ok) {
      return errorResponse(`VM API returned ${response.status}`, response.status);
    }

    const settings = await response.json();

    await env.VM_WEB_PROFILES.put(CACHE_KEY, JSON.stringify(settings), {
      expirationTtl: CACHE_TTL,
    });

    return jsonResponse(settings);
  } catch (error) {
    console.error('getSettings error:', error);
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return errorResponse(`Failed to fetch settings: ${message}`);
  }
};

export const onRequestOptions: PagesFunction = async () => optionsResponse();

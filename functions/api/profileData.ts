import type { Env } from '../types/env';
import { jsonResponse, errorResponse, optionsResponse } from '../services/vmClient';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (!request.headers.get('Content-Type')?.startsWith('application/json')) {
    return errorResponse('Request body must be JSON', 415);
  }

  let body: { walletId: string; value: { name: string } };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  if (!body.walletId) {
    return errorResponse('Missing walletId', 400);
  }

  try {
    await env.VM_WEB_PROFILES.put(body.walletId, JSON.stringify(body.value));
    return jsonResponse({ success: true, walletId: body.walletId });
  } catch (err) {
    console.error('KV PUT Error:', err);
    return errorResponse('Error storing data');
  }
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const walletId = new URL(request.url).searchParams.get('walletId');

  if (!walletId) {
    return errorResponse('walletId is required', 400);
  }

  try {
    const stored = await env.VM_WEB_PROFILES.get(walletId, { type: 'json' });
    if (stored === null) {
      return errorResponse('Not found', 404);
    }
    return jsonResponse({ walletId, value: stored });
  } catch (err) {
    console.error('KV GET Error:', err);
    return errorResponse('Error fetching data');
  }
};

export const onRequestOptions: PagesFunction = async () => optionsResponse();

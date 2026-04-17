import type { Env } from '../types/env';
import { initVmSdk, requireApiKey, jsonResponse, errorResponse, optionsResponse } from '../services/vmClient';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  const address = new URL(request.url).searchParams.get('address');

  if (!address) {
    return errorResponse('address is required', 400, origin);
  }

  const keyError = requireApiKey(env, origin);
  if (keyError) return keyError;

  try {
    const sdk = await initVmSdk(env);
    const response = await sdk.getSanitizedAddress(address);
    return jsonResponse({ address: response.address }, 200, origin);
  } catch (error) {
    console.error('sanitizeAddress error:', error);
    return errorResponse('Failed to sanitize address', 500, origin);
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));

import type { Env } from '../types/env';
import { initVmSdk, jsonResponse, errorResponse } from '../services/vmClient';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const address = new URL(request.url).searchParams.get('address');

  if (!address) {
    return errorResponse('address is required', 400);
  }

  try {
    const sdk = await initVmSdk(env);
    const response = await sdk.getSanitizedAddress(address);
    return jsonResponse({ address: response.address });
  } catch (error) {
    console.error('sanitizeAddress error:', error);
    return errorResponse('Failed to sanitize address');
  }
};

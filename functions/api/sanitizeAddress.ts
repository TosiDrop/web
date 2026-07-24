import type { Env } from '../types/env';
import {
  resolveNetwork,
  vmConfigFor,
  vmFetch,
  networkUnavailableResponse,
  jsonResponse,
  errorResponse,
  optionsResponse,
} from '../services/vmClient';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  const network = resolveNetwork(request);
  const address = new URL(request.url).searchParams.get('address');

  if (!address) {
    return errorResponse('address is required', 400, origin);
  }

  if (!vmConfigFor(env, network)) return networkUnavailableResponse(origin);

  try {
    const response = (await vmFetch(env, network, 'sanitize_address', { address })) as { address: string };
    return jsonResponse({ address: response.address }, 200, origin);
  } catch (error) {
    console.error('sanitizeAddress error:', error);
    return errorResponse('Failed to sanitize address', 500, origin);
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));

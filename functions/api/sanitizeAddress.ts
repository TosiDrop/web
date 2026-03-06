import { initVmSdk, jsonResponse, errorResponse } from '../services/vmClient';

interface Env {
  VITE_VM_API_KEY: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const address = url.searchParams.get('address');

  if (!address) {
    return errorResponse('address is required', 400);
  }

  try {
    await initVmSdk(env);
    const { getSanitizedAddress } = await import('vm-sdk');
    const response = await getSanitizedAddress(address);
    return jsonResponse({ address: response.address });
  } catch (error) {
    console.error('sanitizeAddress error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse(`Failed to sanitize address: ${message}`);
  }
};

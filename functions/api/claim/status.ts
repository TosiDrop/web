import { initVmSdk, errorResponse } from '../../services/vmClient';

interface Env {
  VITE_VM_API_KEY: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const hash = url.searchParams.get('hash');

  if (!hash) {
    return errorResponse('hash query parameter is required', 400);
  }

  try {
    await initVmSdk(env);
    return errorResponse('Claim status not yet integrated with VM backend', 501);
  } catch (error) {
    console.error('Claim status error:', error);
    return errorResponse(
      `Status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

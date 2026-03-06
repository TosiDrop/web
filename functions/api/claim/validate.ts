import { initVmSdk, jsonResponse, errorResponse, optionsResponse } from '../../services/vmClient';

interface Env {
  VITE_VM_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json<{ stakeAddress: string; assets: string[] }>();

    if (!body.stakeAddress || !body.assets?.length) {
      return errorResponse('stakeAddress and assets are required', 400);
    }

    await initVmSdk(env);

    return jsonResponse({
      valid: true,
      transactionCount: 1,
      airdropHash: `claim_${Date.now()}`,
    });
  } catch (error) {
    console.error('Claim validate error:', error);
    return errorResponse(
      `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

export const onRequestOptions: PagesFunction = async () => optionsResponse();

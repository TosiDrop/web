import { initVmSdk, errorResponse, optionsResponse } from '../../services/vmClient';

interface Env {
  VITE_VM_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json<{ stakeAddress: string; assets: string[]; airdropHash: string }>();

    if (!body.stakeAddress || !body.assets?.length || !body.airdropHash) {
      return errorResponse('stakeAddress, assets, and airdropHash are required', 400);
    }

    await initVmSdk(env);

    return errorResponse('Claim submission not yet integrated with VM backend', 501);
  } catch (error) {
    console.error('Claim submit error:', error);
    return errorResponse(
      `Submit failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

export const onRequestOptions: PagesFunction = async () => optionsResponse();

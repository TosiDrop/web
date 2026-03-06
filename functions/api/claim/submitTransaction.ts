import { initVmSdk, errorResponse, optionsResponse } from '../../services/vmClient';

interface Env {
  VITE_VM_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json<{ signedTx: string; airdropHash: string }>();

    if (!body.signedTx || !body.airdropHash) {
      return errorResponse('signedTx and airdropHash are required', 400);
    }

    await initVmSdk(env);

    return errorResponse('Transaction submission not yet integrated with VM backend', 501);
  } catch (error) {
    console.error('Submit transaction error:', error);
    return errorResponse(
      `Transaction submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

export const onRequestOptions: PagesFunction = async () => optionsResponse();

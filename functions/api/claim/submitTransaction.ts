import type { Env } from '../../types/env';
import { errorResponse, optionsResponse } from '../../services/vmClient';

// TODO: Integrate with VM backend for transaction submission
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json() as { signedTx: string; airdropHash: string };

    if (!body.signedTx || !body.airdropHash) {
      return errorResponse('signedTx and airdropHash are required', 400);
    }

    return errorResponse('Transaction submission not yet integrated with VM backend', 501);
  } catch (error) {
    console.error('Submit transaction error:', error);
    return errorResponse('Transaction submission failed');
  }
};

export const onRequestOptions: PagesFunction = async () => optionsResponse();

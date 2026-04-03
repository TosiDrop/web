import type { Env } from '../../types/env';
import { errorResponse, optionsResponse } from '../../services/vmClient';

// TODO: Integrate with VM backend for actual claim validation
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json() as { stakeAddress: string; assets: string[] };

    if (!body.stakeAddress || !body.assets?.length) {
      return errorResponse('stakeAddress and assets are required', 400);
    }

    return errorResponse('Claim validation not yet integrated with VM backend', 501);
  } catch (error) {
    console.error('Claim validate error:', error);
    return errorResponse('Validation failed');
  }
};

export const onRequestOptions: PagesFunction = async () => optionsResponse();
